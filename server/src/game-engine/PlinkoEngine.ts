import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { PlinkoBet, IPlinkoBet } from '../models/PlinkoBet';
import { Wallet } from '../models/Wallet';
import { WalletTransaction } from '../models/WalletTransaction';
import { User } from '../models/User';
import {
  PlinkoRisk,
  PlinkoRows,
  PLINKO_PAYTABLES,
  PlinkoDropResult,
  PlinkoStats,
} from '../shared';
import { logger } from '../utils/logger';

export class PlinkoEngine {
  private static instance: PlinkoEngine;
  private io: Server | null = null;

  private constructor() {}

  public static getInstance(): PlinkoEngine {
    if (!PlinkoEngine.instance) {
      PlinkoEngine.instance = new PlinkoEngine();
    }
    return PlinkoEngine.instance;
  }

  public setSocketServer(io: Server): void {
    this.io = io;
  }

  /**
   * Authoritative simulation of a single Plinko ball drop
   */
  public async dropBall(params: {
    userId?: string | null;
    betAmount: number;
    rows: PlinkoRows;
    risk: PlinkoRisk;
  }): Promise<PlinkoDropResult> {
    const { userId, betAmount, rows, risk } = params;

    // Validate inputs
    if (betAmount <= 0) {
      throw new Error('Bet amount must be greater than 0.');
    }
    if (!PLINKO_PAYTABLES[rows] || !PLINKO_PAYTABLES[rows][risk]) {
      throw new Error(`Invalid row (${rows}) or risk level (${risk}).`);
    }

    // Authoritative RNG Path: Array of 0 (left) or 1 (right) of length `rows`
    const path: number[] = [];
    for (let i = 0; i < rows; i++) {
      path.push(Math.random() < 0.5 ? 0 : 1);
    }

    // Final bucket index = sum of right turns (0 to rows)
    const bucketIndex = path.reduce((sum, step) => sum + step, 0);
    const paytable = PLINKO_PAYTABLES[rows][risk];
    const multiplier = paytable[bucketIndex] ?? 0;
    const payoutAmount = Math.round(betAmount * multiplier * 100) / 100;
    const status = payoutAmount > 0 ? 'WON' : 'LOST';

    // Guest Demo Play
    if (!userId) {
      const guestResult: PlinkoDropResult = {
        id: new mongoose.Types.ObjectId().toString(),
        userId: null,
        betAmount,
        rows,
        risk,
        path,
        bucketIndex,
        multiplier,
        payoutAmount,
        status,
        newBalance: 10000,
        createdAt: new Date().toISOString(),
      };
      return guestResult;
    }

    // Real Authenticated Play
    const wallet = await Wallet.findOne({ userId });
    if (!wallet || wallet.availableBalance < betAmount) {
      throw new Error(`Insufficient wallet balance. Available: ${wallet?.availableBalance || 0} ETB.`);
    }

    // 1. Deduct Bet from Player
    const balanceBefore = wallet.availableBalance;
    wallet.availableBalance -= betAmount;
    wallet.version = (wallet.version || 0) + 1;
    await wallet.save();

    await WalletTransaction.create({
      userId,
      walletId: wallet._id,
      type: 'GAME_ENTRY',
      amount: betAmount,
      balanceBefore,
      balanceAfter: wallet.availableBalance,
      currency: 'ETB',
      status: 'COMPLETED',
      description: `Plinko Drop Bet (${rows} Rows, ${risk} Risk)`,
      metadata: { rows, risk, betAmount },
    });

    // 2. Transfer Bet to Admin / House Wallet
    await this.creditAdminBetIncome({
      amount: betAmount,
      playerUserId: userId,
      description: `Plinko Bet received from player (${rows} Rows, ${risk} Risk)`,
      referenceId: wallet._id.toString(),
      metadata: { rows, risk, betAmount },
    });

    // 3. If Won, Credit Player & Debit Admin Wallet
    if (payoutAmount > 0) {
      const prizeBalanceBefore = wallet.availableBalance;
      wallet.availableBalance += payoutAmount;
      wallet.version = (wallet.version || 0) + 1;
      await wallet.save();

      await WalletTransaction.create({
        userId,
        walletId: wallet._id,
        type: 'PRIZE',
        amount: payoutAmount,
        balanceBefore: prizeBalanceBefore,
        balanceAfter: wallet.availableBalance,
        currency: 'ETB',
        status: 'COMPLETED',
        description: `Plinko Win (${multiplier}x Multiplier, Bucket #${bucketIndex})`,
        metadata: { rows, risk, bucketIndex, multiplier, payoutAmount },
      });

      await this.debitAdminPrizePayout({
        amount: payoutAmount,
        playerUserId: userId,
        description: `Plinko Prize payout to player (${multiplier}x Multiplier, Bucket #${bucketIndex})`,
        referenceId: wallet._id.toString(),
        metadata: { rows, risk, bucketIndex, multiplier, payoutAmount },
      });
    }

    // Save Bet Record
    const betRecord = await PlinkoBet.create({
      userId: new mongoose.Types.ObjectId(userId),
      betAmount,
      rows,
      risk,
      path,
      bucketIndex,
      multiplier,
      payoutAmount,
      status,
      isGuest: false,
    });

    const dropResult: PlinkoDropResult = {
      id: betRecord._id.toString(),
      userId,
      betAmount,
      rows,
      risk,
      path,
      bucketIndex,
      multiplier,
      payoutAmount,
      status,
      newBalance: wallet.availableBalance,
      createdAt: betRecord.createdAt.toISOString(),
    };

    // Broadcast to live Plinko feed for all online spectators
    this.io?.to('room:plinko').emit('plinko:live_drop', {
      ...dropResult,
      username: (await User.findById(userId).select('username'))?.username || 'Player',
    });

    return dropResult;
  }

  /**
   * Batch Drop: Drop 1 to 20 balls in one request
   */
  public async dropBatch(params: {
    userId?: string | null;
    betAmount: number;
    count: number;
    rows: PlinkoRows;
    risk: PlinkoRisk;
  }): Promise<{ drops: PlinkoDropResult[]; totalWagered: number; totalWon: number; newBalance: number }> {
    const { userId, betAmount, count, rows, risk } = params;
    const clampedCount = Math.min(20, Math.max(1, count));
    const totalWagered = betAmount * clampedCount;

    if (!userId) {
      // Guest demo batch
      const drops: PlinkoDropResult[] = [];
      let totalWon = 0;
      for (let i = 0; i < clampedCount; i++) {
        const drop = await this.dropBall({ userId: null, betAmount, rows, risk });
        drops.push(drop);
        totalWon += drop.payoutAmount;
      }
      return { drops, totalWagered, totalWon, newBalance: 10000 };
    }

    // Check balance upfront
    const wallet = await Wallet.findOne({ userId });
    if (!wallet || wallet.availableBalance < totalWagered) {
      throw new Error(`Insufficient wallet balance. Required: ${totalWagered} ETB, Available: ${wallet?.availableBalance || 0} ETB.`);
    }

    const drops: PlinkoDropResult[] = [];
    let totalWon = 0;
    for (let i = 0; i < clampedCount; i++) {
      const drop = await this.dropBall({ userId, betAmount, rows, risk });
      drops.push(drop);
      totalWon += drop.payoutAmount;
    }

    const updatedWallet = await Wallet.findOne({ userId });
    return {
      drops,
      totalWagered,
      totalWon,
      newBalance: updatedWallet?.availableBalance || 0,
    };
  }

  /**
   * Get user's recent Plinko drop history
   */
  public async getUserHistory(userId: string, limit = 20): Promise<PlinkoDropResult[]> {
    const bets = await PlinkoBet.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit);

    return bets.map((b) => ({
      id: b._id.toString(),
      userId: b.userId ? b.userId.toString() : null,
      betAmount: b.betAmount,
      rows: b.rows,
      risk: b.risk,
      path: b.path,
      bucketIndex: b.bucketIndex,
      multiplier: b.multiplier,
      payoutAmount: b.payoutAmount,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
    }));
  }

  /**
   * Get global Plinko statistics & recent live drops
   */
  public async getStats(): Promise<PlinkoStats> {
    const recent = await PlinkoBet.find()
      .sort({ createdAt: -1 })
      .limit(15);

    const agg = await PlinkoBet.aggregate([
      {
        $group: {
          _id: null,
          totalDrops: { $sum: 1 },
          totalWagered: { $sum: '$betAmount' },
          totalWon: { $sum: '$payoutAmount' },
          highestWin: { $max: '$payoutAmount' },
          highestMultiplier: { $max: '$multiplier' },
        },
      },
    ]);

    const stats = agg[0] || {
      totalDrops: 0,
      totalWagered: 0,
      totalWon: 0,
      highestWin: 0,
      highestMultiplier: 0,
    };

    return {
      totalDrops: stats.totalDrops || 0,
      totalWagered: stats.totalWagered || 0,
      totalWon: stats.totalWon || 0,
      highestWin: stats.highestWin || 0,
      highestMultiplier: stats.highestMultiplier || 0,
      recentDrops: recent.map((b) => ({
        id: b._id.toString(),
        userId: b.userId ? b.userId.toString() : null,
        betAmount: b.betAmount,
        rows: b.rows,
        risk: b.risk,
        path: b.path,
        bucketIndex: b.bucketIndex,
        multiplier: b.multiplier,
        payoutAmount: b.payoutAmount,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Transfer bet income from player to Admin wallet and record transaction
   */
  private async creditAdminBetIncome(params: {
    amount: number;
    playerUserId: string;
    description: string;
    referenceId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const adminUser = await User.findOne({ role: 'ADMIN' });
      if (!adminUser) return;

      let adminWallet = await Wallet.findOne({ userId: adminUser._id });
      if (!adminWallet) {
        adminWallet = await Wallet.create({
          userId: adminUser._id,
          availableBalance: 100000,
          currency: 'ETB',
          isDemo: false,
        });
      }

      const adminBefore = adminWallet.availableBalance;
      adminWallet.availableBalance += params.amount;
      adminWallet.version = (adminWallet.version || 0) + 1;
      await adminWallet.save();

      await WalletTransaction.create({
        userId: adminUser._id,
        walletId: adminWallet._id,
        type: 'DEPOSIT',
        amount: params.amount,
        balanceBefore: adminBefore,
        balanceAfter: adminWallet.availableBalance,
        currency: 'ETB',
        status: 'COMPLETED',
        referenceId: params.referenceId,
        description: params.description,
        metadata: {
          playerUserId: params.playerUserId,
          ...params.metadata,
        },
      });
    } catch (err) {
      logger.error('Error crediting Admin wallet with Plinko bet income:', err);
    }
  }

  /**
   * Deduct prize payout from Admin wallet and record transaction
   */
  private async debitAdminPrizePayout(params: {
    amount: number;
    playerUserId: string;
    description: string;
    referenceId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const adminUser = await User.findOne({ role: 'ADMIN' });
      if (!adminUser) return;

      let adminWallet = await Wallet.findOne({ userId: adminUser._id });
      if (!adminWallet) {
        adminWallet = await Wallet.create({
          userId: adminUser._id,
          availableBalance: 100000,
          currency: 'ETB',
          isDemo: false,
        });
      }

      const adminBefore = adminWallet.availableBalance;
      adminWallet.availableBalance = Math.max(0, adminWallet.availableBalance - params.amount);
      adminWallet.version = (adminWallet.version || 0) + 1;
      await adminWallet.save();

      await WalletTransaction.create({
        userId: adminUser._id,
        walletId: adminWallet._id,
        type: 'WITHDRAWAL',
        amount: params.amount,
        balanceBefore: adminBefore,
        balanceAfter: adminWallet.availableBalance,
        currency: 'ETB',
        status: 'COMPLETED',
        referenceId: params.referenceId,
        description: params.description,
        metadata: {
          playerUserId: params.playerUserId,
          ...params.metadata,
        },
      });
    } catch (err) {
      logger.error('Error debiting Admin wallet for Plinko prize payout:', err);
    }
  }
}
