import mongoose from 'mongoose';
import { Wallet, IWallet } from '../../models/Wallet';
import { WalletTransaction } from '../../models/WalletTransaction';
import { Notification } from '../../models/Notification';
import { MockPaymentProvider } from '../../payments/MockPaymentProvider';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { DepositInput, WithdrawalInput, WalletBalance, WalletTransactionDTO } from '@bingo/shared';

export class WalletService {
  private paymentProvider = new MockPaymentProvider();

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

    const paymentResult = await this.paymentProvider.createWithdrawal({
      userId,
      amount,
      currency: wallet.currency,
      accountDetails,
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
      status: paymentResult.status,
      referenceId: paymentResult.providerReference,
      description: `Demo Withdrawal to ${accountDetails.bankOrProvider} (${accountDetails.accountNumber})`,
      metadata: {
        accountDetails,
        paymentProvider: this.paymentProvider.name,
      },
    });

    await Notification.create({
      userId: wallet.userId,
      type: 'WITHDRAWAL_SUCCESS',
      title: 'Withdrawal Processed',
      message: `Simulated payout of ${amount.toLocaleString()} ETB Demo to ${accountDetails.accountNumber} has completed.`,
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
