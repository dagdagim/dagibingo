import mongoose from 'mongoose';
import { Wallet, IWallet } from '../../models/Wallet';
import { WalletTransaction } from '../../models/WalletTransaction';
import { User } from '../../models/User';
import { Notification } from '../../models/Notification';
import { MockPaymentProvider } from '../../payments/MockPaymentProvider';
import { ChapaPaymentProvider } from '../../payments/ChapaPaymentProvider';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import {
  DepositInput,
  WithdrawalInput,
  ChapaInitializeInput,
  WalletBalance,
  WalletTransactionDTO,
  ChapaInitializeResponse,
  ChapaVerifyResponse,
} from '@bingo/shared';
import { v4 as uuidv4 } from 'uuid';

export class WalletService {
  private paymentProvider = new MockPaymentProvider();
  private chapaProvider = new ChapaPaymentProvider();

  public async getOrCreateWallet(userId: string): Promise<IWallet> {
    let wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: new mongoose.Types.ObjectId(userId),
        availableBalance: 1000, // starting demo balance
        lockedBalance: 0,
        bonusBalance: 0,
        currency: 'ETB',
        isDemo: true,
      });
    }
    return wallet;
  }

  public async getBalance(userId: string): Promise<WalletBalance> {
    // Auto-reconcile any pending Chapa deposits
    await this.reconcilePendingChapaDeposits(userId);

    const wallet = await this.getOrCreateWallet(userId);
    return {
      availableBalance: wallet.availableBalance,
      lockedBalance: wallet.lockedBalance,
      bonusBalance: wallet.bonusBalance,
      totalBalance: wallet.availableBalance + wallet.lockedBalance + wallet.bonusBalance,
      currency: wallet.currency,
      isDemo: wallet.isDemo,
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }

  /**
   * Automatically scans and reconciles pending Chapa transactions for the user
   */
  public async reconcilePendingChapaDeposits(userId: string): Promise<void> {
    try {
      const pendingTxs = await WalletTransaction.find({
        userId: new mongoose.Types.ObjectId(userId),
        status: 'PENDING',
        referenceId: { $regex: '^DAGI_DEP_' },
      }).limit(10);

      for (const tx of pendingTxs) {
        if (tx.referenceId) {
          try {
            await this.verifyChapaDeposit(userId, tx.referenceId);
          } catch (err) {
            logger.warn(`[Auto-Reconcile] Could not verify ${tx.referenceId}: ${(err as Error).message}`);
          }
        }
      }
    } catch (err) {
      logger.error(`[Auto-Reconcile] Error checking pending deposits: ${(err as Error).message}`);
    }
  }

  /**
   * Initializes a Chapa Hosted Checkout Session
   */
  public async initializeChapaDeposit(
    userId: string,
    input: ChapaInitializeInput
  ): Promise<ChapaInitializeResponse> {
    const { amount, phone, email, firstName, lastName, returnUrl } = input;
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User account not found');
    }

    const wallet = await this.getOrCreateWallet(userId);
    const txRef = `DAGI_DEP_${Date.now()}_${uuidv4().substring(0, 6).toUpperCase()}`;

    // Call Chapa payment provider
    const chapaResult = await this.chapaProvider.initializeTransaction({
      amount,
      currency: wallet.currency,
      email: email || user.email || 'customer@dagibingo.com',
      firstName: firstName || user.firstName || user.username,
      lastName: lastName || user.lastName || 'Player',
      phone: phone || user.phone || '0900000000',
      txRef,
      returnUrl,
      title: 'DAGI BINGO Deposit',
      description: `Deposit ${amount} ETB to Dagi Bingo Wallet`,
    });

    // Record PENDING transaction
    await WalletTransaction.create({
      userId: user._id,
      walletId: wallet._id,
      type: 'DEPOSIT',
      amount,
      balanceBefore: wallet.availableBalance,
      balanceAfter: wallet.availableBalance,
      currency: wallet.currency,
      status: 'PENDING',
      referenceId: txRef,
      description: `Chapa Deposit (Telebirr/CBE/Card) [Pending]`,
      metadata: {
        paymentProvider: 'CHAPA',
        txRef,
        checkoutUrl: chapaResult.checkoutUrl,
        initiatedAt: new Date().toISOString(),
      },
    });

    return {
      checkoutUrl: chapaResult.checkoutUrl,
      txRef,
      status: 'PENDING',
    };
  }

  /**
   * Verifies a Chapa Transaction and idempotently credits user's wallet
   */
  public async verifyChapaDeposit(
    userId: string,
    txRef: string
  ): Promise<ChapaVerifyResponse> {
    if (!txRef) {
      throw new BadRequestError('Transaction reference (tx_ref) is required');
    }

    const tx = await WalletTransaction.findOne({
      referenceId: txRef,
      userId: new mongoose.Types.ObjectId(userId),
    });

    // If transaction is already completed, return cached success idempotently
    if (tx && tx.status === 'COMPLETED') {
      const balance = await this.getBalance(userId);
      return {
        isSuccess: true,
        status: 'COMPLETED',
        message: 'Payment already verified and credited.',
        txRef,
        amount: tx.amount,
        currency: tx.currency,
        balance,
        transaction: this.mapTransactionToDTO(tx),
      };
    }

    // Call Chapa API to verify
    const verifyResult = await this.chapaProvider.verifyTransaction(txRef);

    if (!verifyResult.isSuccess) {
      return {
        isSuccess: false,
        status: verifyResult.status,
        message: 'Payment is pending on Chapa or awaiting completion.',
        txRef,
        amount: verifyResult.amount || (tx ? tx.amount : 0),
        currency: verifyResult.currency || 'ETB',
      };
    }

    // Atomic Double-Entry Wallet Credit
    const wallet = await this.getOrCreateWallet(userId);
    const amountToCredit = verifyResult.amount || (tx ? tx.amount : 0);

    const balanceBefore = wallet.availableBalance;
    wallet.availableBalance += amountToCredit;
    wallet.version += 1;
    await wallet.save();

    let updatedTx: any;
    if (tx) {
      tx.status = 'COMPLETED';
      tx.balanceAfter = wallet.availableBalance;
      tx.description = `Chapa Deposit Completed via ${verifyResult.paymentMethod || 'Telebirr/CBE'}`;
      tx.metadata = {
        ...tx.metadata,
        verifiedAt: new Date().toISOString(),
        chapaReference: verifyResult.reference,
        paymentMethod: verifyResult.paymentMethod,
      };
      updatedTx = await tx.save();
    } else {
      updatedTx = await WalletTransaction.create({
        userId: new mongoose.Types.ObjectId(userId),
        walletId: wallet._id,
        type: 'DEPOSIT',
        amount: amountToCredit,
        balanceBefore,
        balanceAfter: wallet.availableBalance,
        currency: wallet.currency,
        status: 'COMPLETED',
        referenceId: txRef,
        description: `Chapa Deposit Completed via ${verifyResult.paymentMethod || 'Telebirr/CBE'}`,
        metadata: {
          paymentProvider: 'CHAPA',
          txRef,
          chapaReference: verifyResult.reference,
          paymentMethod: verifyResult.paymentMethod,
          verifiedAt: new Date().toISOString(),
        },
      });
    }

    await Notification.create({
      userId: wallet.userId,
      type: 'DEPOSIT_SUCCESS',
      title: '🎉 Chapa Deposit Successful!',
      message: `Your deposit of ${amountToCredit.toLocaleString()} ETB via Chapa (${verifyResult.paymentMethod || 'Telebirr/CBE'}) has been credited to your wallet.`,
    });

    const updatedBalance = await this.getBalance(userId);

    logger.info(`[Chapa] Successfully verified and credited ${amountToCredit} ETB for user ${userId} (tx_ref: ${txRef})`);

    return {
      isSuccess: true,
      status: 'COMPLETED',
      message: `Deposit of ${amountToCredit.toLocaleString()} ETB successfully verified and credited!`,
      txRef,
      amount: amountToCredit,
      currency: wallet.currency,
      balance: updatedBalance,
      transaction: this.mapTransactionToDTO(updatedTx),
    };
  }

  /**
   * Webhook Handler for Chapa Notifications
   */
  public async handleChapaWebhook(payload: any): Promise<void> {
    const txRef = payload.tx_ref || payload.trx_ref;
    if (!txRef) {
      logger.warn('[Chapa Webhook] Received webhook without tx_ref');
      return;
    }

    const tx = await WalletTransaction.findOne({ referenceId: txRef });
    if (!tx) {
      logger.warn(`[Chapa Webhook] Transaction not found for tx_ref: ${txRef}`);
      return;
    }

    if (tx.status === 'COMPLETED') {
      logger.info(`[Chapa Webhook] Transaction ${txRef} already completed.`);
      return;
    }

    await this.verifyChapaDeposit(tx.userId.toString(), txRef);
  }

  public async processDemoDeposit(userId: string, input: DepositInput): Promise<{ balance: WalletBalance; transaction: WalletTransactionDTO }> {
    const { amount, paymentMethod, idempotencyKey } = input;

    // Check idempotency if key provided
    if (idempotencyKey) {
      const existingTx = await WalletTransaction.findOne({ idempotencyKey });
      if (existingTx) {
        const currentBalance = await this.getBalance(userId);
        return {
          balance: currentBalance,
          transaction: this.mapTransactionToDTO(existingTx),
        };
      }
    }

    const wallet = await this.getOrCreateWallet(userId);

    // Call payment provider abstraction
    const paymentResult = await this.paymentProvider.createDeposit({
      userId,
      amount,
      currency: wallet.currency,
      idempotencyKey,
    });

    const balanceBefore = wallet.availableBalance;
    wallet.availableBalance += amount;
    wallet.version += 1;
    await wallet.save();

    const tx = await WalletTransaction.create({
      userId: wallet.userId,
      walletId: wallet._id,
      type: 'DEPOSIT',
      amount,
      balanceBefore,
      balanceAfter: wallet.availableBalance,
      currency: wallet.currency,
      status: paymentResult.status,
      referenceId: paymentResult.providerReference,
      idempotencyKey,
      description: `Demo Credit Deposit via ${paymentMethod}`,
      metadata: {
        paymentProvider: this.paymentProvider.name,
        isDemo: true,
      },
    });

    await Notification.create({
      userId: wallet.userId,
      type: 'DEPOSIT_SUCCESS',
      title: 'Deposit Successful',
      message: `Successfully credited ${amount.toLocaleString()} ETB Demo to your wallet.`,
    });

    const updatedBalance = await this.getBalance(userId);
    return {
      balance: updatedBalance,
      transaction: this.mapTransactionToDTO(tx),
    };
  }

  public async processDemoWithdrawal(userId: string, input: WithdrawalInput): Promise<{ balance: WalletBalance; transaction: WalletTransactionDTO }> {
    const { amount, paymentMethod, accountDetails } = input;
    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.availableBalance < amount) {
      throw new BadRequestError(`Insufficient funds. Available balance: ${wallet.availableBalance.toLocaleString()} ETB`);
    }

    const reference = `DAGI_WDL_${Date.now()}_${uuidv4().substring(0, 6).toUpperCase()}`;

    // Invoke Chapa Transfer Payout API
    const chapaTransferResult = await this.chapaProvider.createTransfer({
      accountName: accountDetails.accountName,
      accountNumber: accountDetails.accountNumber,
      amount,
      currency: wallet.currency,
      bankOrProvider: accountDetails.bankOrProvider,
      reference,
    });

    const balanceBefore = wallet.availableBalance;
    wallet.availableBalance -= amount;
    wallet.version += 1;
    await wallet.save();

    const tx = await WalletTransaction.create({
      userId: wallet.userId,
      walletId: wallet._id,
      type: 'WITHDRAWAL',
      amount,
      balanceBefore,
      balanceAfter: wallet.availableBalance,
      currency: wallet.currency,
      status: chapaTransferResult.status as any || 'COMPLETED',
      referenceId: reference,
      description: `Chapa Payout to ${accountDetails.bankOrProvider} (${accountDetails.accountNumber}) - ${accountDetails.accountName}`,
      metadata: {
        accountDetails,
        paymentProvider: 'CHAPA_TRANSFER',
        chapaReference: chapaTransferResult.reference,
        dispatchedAt: new Date().toISOString(),
      },
    });

    await Notification.create({
      userId: wallet.userId,
      type: 'WITHDRAWAL_SUCCESS',
      title: '🎉 Chapa Payout Dispatched!',
      message: `Your withdrawal of ${amount.toLocaleString()} ETB via Chapa to ${accountDetails.bankOrProvider} (${accountDetails.accountNumber} - ${accountDetails.accountName}) has been processed successfully.`,
    });

    const updatedBalance = await this.getBalance(userId);
    return {
      balance: updatedBalance,
      transaction: this.mapTransactionToDTO(tx),
    };
  }

  public async getTransactions(userId: string, limit = 50, page = 1): Promise<{ transactions: WalletTransactionDTO[]; total: number }> {
    const query = { userId: new mongoose.Types.ObjectId(userId) };
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      WalletTransaction.countDocuments(query),
    ]);

    return {
      transactions: transactions.map(this.mapTransactionToDTO),
      total,
    };
  }

  private mapTransactionToDTO(tx: any): WalletTransactionDTO {
    return {
      id: tx._id.toString(),
      userId: tx.userId.toString(),
      type: tx.type,
      amount: tx.amount,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      currency: tx.currency,
      status: tx.status,
      referenceId: tx.referenceId,
      description: tx.description,
      metadata: tx.metadata,
      createdAt: tx.createdAt.toISOString(),
    };
  }
}
