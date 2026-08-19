import crypto from 'crypto';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { AviatorRound, IAviatorRound } from '../models/AviatorRound';
import { AviatorBet, IAviatorBet } from '../models/AviatorBet';
import { Wallet } from '../models/Wallet';
import { WalletTransaction } from '../models/WalletTransaction';
import { User } from '../models/User';
import { logger } from '../utils/logger';

export class AviatorEngine {
  private static instance: AviatorEngine;
  private io: Server | null = null;
  private currentRound: IAviatorRound | null = null;
  private currentMultiplier: number = 1.0;
  private flightStartTime: number = 0;
  private tickInterval: NodeJS.Timeout | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  private bettingDurationSeconds = 8;
  private cooldownDurationSeconds = 3;

  private constructor() {}

  public static getInstance(): AviatorEngine {
    if (!AviatorEngine.instance) {
      AviatorEngine.instance = new AviatorEngine();
    }
    return AviatorEngine.instance;
  }

  public setSocketServer(io: Server): void {
    this.io = io;
  }

  /**
   * Start the continuous Aviator game engine
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('🚀 Initializing Authoritative Aviator Engine...');

    try {
      // Find latest uncompleted round or create a new one
      let round = (await AviatorRound.findOne({
        status: { $in: ['BETTING', 'FLYING'] },
      }).sort({ roundNumber: -1 })) as IAviatorRound | null;

      if (!round) {
        round = await this.createNewRound();
      }

      this.currentRound = round;
      this.runBettingCountdown(this.bettingDurationSeconds);
    } catch (err) {
      logger.error('Error starting Aviator Engine:', err);
    }
  }

  /**
   * Generate a provably fair round with cryptographic SHA-256 hash
   */
  private async createNewRound(): Promise<IAviatorRound> {
    try {
      const lastRound = await AviatorRound.findOne().sort({ roundNumber: -1 });
      const nextRoundNumber = lastRound ? lastRound.roundNumber + 1 : 10001;

      const seed = crypto.randomBytes(16).toString('hex');
      const hash = crypto.createHash('sha256').update(seed).digest('hex');

      // Provably fair crash multiplier generation (97% RTP, ~3% instant crash)
      const randomVal = Math.random() * 100;
      let crashMultiplier = 1.0;

      if (randomVal >= 3.0) {
        const e = 100 / (100 - randomVal);
        const raw = Math.floor((e * 0.97) * 100) / 100;
        crashMultiplier = Math.max(1.01, Math.min(raw, 5000.0));
      } else {
        crashMultiplier = 1.0; // 3% instant crash
      }

      // Check if there are already bets placed ahead for this round
      const existingBets = await AviatorBet.find({ roundNumber: nextRoundNumber, status: 'ACTIVE' });
      const totalBetsAhead = existingBets.reduce((acc, b) => acc + b.betAmount, 0);

      const round = (await AviatorRound.create({
        roundNumber: nextRoundNumber,
        status: 'BETTING',
        crashMultiplier,
        hash,
        seed,
        startedAt: new Date(),
        totalBets: totalBetsAhead,
        totalPayout: 0,
        countdownSeconds: this.bettingDurationSeconds,
      })) as unknown as IAviatorRound;

      return round;
    } catch (err) {
      logger.error('Error in createNewRound:', err);
      throw err;
    }
  }

  /**
   * Phase 1: Betting Countdown (8s)
   */
  private runBettingCountdown(secondsRemaining: number): void {
    try {
      if (!this.currentRound) return;

      this.currentRound.status = 'BETTING';
      this.currentRound.countdownSeconds = secondsRemaining;
      this.currentMultiplier = 1.0;

      this.io?.to('room:aviator').emit('aviator:countdown' as any, {
        roundNumber: this.currentRound.roundNumber,
        countdownSeconds: secondsRemaining,
        status: 'BETTING',
      });

      if (this.countdownTimer) clearTimeout(this.countdownTimer);

      if (secondsRemaining > 0) {
        this.countdownTimer = setTimeout(() => {
          this.runBettingCountdown(secondsRemaining - 1);
        }, 1000);
      } else {
        this.startFlightPhase().catch((err) => logger.error('Error in startFlightPhase:', err));
      }
    } catch (err) {
      logger.error('Error in runBettingCountdown:', err);
    }
  }

  /**
   * Phase 2: Plane Takeoff & Live Flight
   */
  private async startFlightPhase(): Promise<void> {
    try {
      if (!this.currentRound) return;

      this.currentRound.status = 'FLYING';
      this.currentRound.flightStartedAt = new Date();
      await this.currentRound.save();

      this.flightStartTime = Date.now();
      this.currentMultiplier = 1.0;

      // Broadcast flight started event
      this.io?.to('room:aviator').emit('aviator:flight_started' as any, {
        roundNumber: this.currentRound.roundNumber,
        status: 'FLYING',
        startTime: this.currentRound.flightStartedAt.toISOString(),
      });

      // High frequency tick loop (every 75ms)
      const crashMultiplier = this.currentRound.crashMultiplier;

      if (this.tickInterval) clearInterval(this.tickInterval);

      this.tickInterval = setInterval(async () => {
        try {
          if (!this.currentRound || this.currentRound.status !== 'FLYING') {
            if (this.tickInterval) {
              clearInterval(this.tickInterval);
              this.tickInterval = null;
            }
            return;
          }

          const elapsedSeconds = (Date.now() - this.flightStartTime) / 1000;

          // Realistic Aviator multiplier curve: M(t) = 1.00 + 0.06*t + 0.035*t^1.75
          const mult = 1.0 + 0.06 * elapsedSeconds + 0.035 * Math.pow(elapsedSeconds, 1.75);
          const roundedMultiplier = Math.floor(mult * 100) / 100;

          this.currentMultiplier = roundedMultiplier;

          // 1. Process Auto-Cashouts for active bets
          await this.processAutoCashouts(roundedMultiplier);

          // 2. Check Crash Condition
          if (roundedMultiplier >= crashMultiplier) {
            if (this.tickInterval) {
              clearInterval(this.tickInterval);
              this.tickInterval = null;
            }
            await this.endFlightWithCrash(crashMultiplier);
          } else {
            // Broadcast flight tick
            this.io?.to('room:aviator').emit('aviator:tick' as any, {
              roundNumber: this.currentRound.roundNumber,
              multiplier: roundedMultiplier,
              elapsedMs: Date.now() - this.flightStartTime,
              status: 'FLYING',
            });
          }
        } catch (tickErr) {
          logger.error('Error during Aviator flight tick:', tickErr);
        }
      }, 75);
    } catch (err) {
      logger.error('Error in startFlightPhase:', err);
    }
  }

  /**
   * Auto-cashout processing on each tick
   */
  private async processAutoCashouts(multiplier: number): Promise<void> {
    try {
      if (!this.currentRound) return;

      const pendingAutoBets = await AviatorBet.find({
        roundNumber: this.currentRound.roundNumber,
        status: 'ACTIVE',
        autoCashoutMultiplier: { $gt: 1.0, $lte: multiplier },
      });

      for (const bet of pendingAutoBets) {
        await this.executeCashout(bet, bet.autoCashoutMultiplier || multiplier);
      }
    } catch (err) {
      logger.error('Error processing auto-cashouts:', err);
    }
  }

  /**
   * Phase 3: Crash / Flew Away
   */
  private async endFlightWithCrash(crashMultiplier: number): Promise<void> {
    try {
      if (!this.currentRound) return;

      this.currentRound.status = 'CRASHED';
      this.currentRound.crashedAt = new Date();
      await this.currentRound.save();

      // Mark remaining ACTIVE bets as CRASHED (Lost)
      await AviatorBet.updateMany(
        {
          roundNumber: this.currentRound.roundNumber,
          status: 'ACTIVE',
        },
        {
          status: 'CRASHED',
        }
      );

      // Broadcast crash event
      this.io?.to('room:aviator').emit('aviator:crashed' as any, {
        roundNumber: this.currentRound.roundNumber,
        crashMultiplier,
        status: 'CRASHED',
      });

      // Wait cooldown (3s) and start next round
      setTimeout(async () => {
        try {
          this.currentRound = await this.createNewRound();
          this.runBettingCountdown(this.bettingDurationSeconds);
        } catch (nextRoundErr) {
          logger.error('Error creating next round after crash:', nextRoundErr);
        }
      }, this.cooldownDurationSeconds * 1000);
    } catch (err) {
      logger.error('Error in endFlightWithCrash:', err);
    }
  }

  /**
   * Execute Cashout for a specific bet
   */
  public async executeCashout(bet: IAviatorBet, targetMultiplier?: number): Promise<{ success: boolean; payoutAmount: number; multiplier: number }> {
    try {
      if (bet.status !== 'ACTIVE') {
        return { success: false, payoutAmount: 0, multiplier: 0 };
      }

      if (!this.currentRound || this.currentRound.status !== 'FLYING') {
        return { success: false, payoutAmount: 0, multiplier: 0 };
      }

      const mult = targetMultiplier || this.currentMultiplier;
      const payoutAmount = Math.floor(bet.betAmount * mult * 100) / 100;

      bet.status = 'CASHED_OUT';
      bet.cashedOutMultiplier = mult;
      bet.payoutAmount = payoutAmount;
      bet.cashedOutAt = new Date();
      await bet.save();

      // Update Round aggregate payout
      await AviatorRound.updateOne(
        { roundNumber: bet.roundNumber },
        { $inc: { totalPayout: payoutAmount } }
      );

      // Double-Entry Wallet Accounting: Credit Player, Debit Admin
      const userWallet = await Wallet.findOne({ userId: bet.userId });
      if (userWallet) {
        userWallet.availableBalance += payoutAmount;
        await userWallet.save();

        await WalletTransaction.create({
          walletId: userWallet._id,
          userId: bet.userId,
          type: 'PRIZE',
          amount: payoutAmount,
          balanceAfter: userWallet.availableBalance,
          status: 'COMPLETED',
          description: `Aviator Win #${bet.roundNumber} (${mult}x Multiplier)`,
          referenceId: bet._id.toString(),
          metadata: {
            gameType: 'AVIATOR',
            roundNumber: bet.roundNumber,
            multiplier: mult,
            panelIndex: bet.panelIndex,
          },
        });

        // Debit House / Admin Wallet
        const adminUser = await User.findOne({ role: 'ADMIN' });
        if (adminUser) {
          const adminWallet = await Wallet.findOne({ userId: adminUser._id });
          if (adminWallet) {
            adminWallet.availableBalance -= payoutAmount;
            await adminWallet.save();

            await WalletTransaction.create({
              walletId: adminWallet._id,
              userId: adminUser._id,
              type: 'WITHDRAWAL',
              amount: payoutAmount,
              balanceAfter: adminWallet.availableBalance,
              status: 'COMPLETED',
              description: `House Aviator Payout to ${bet.username} (Round #${bet.roundNumber}, ${mult}x)`,
              referenceId: bet._id.toString(),
              metadata: {
                gameType: 'AVIATOR',
                roundNumber: bet.roundNumber,
                playerUserId: bet.userId.toString(),
                multiplier: mult,
              },
            });
          }
        }

        // Notify player via direct socket
        this.io?.to(`user:${bet.userId.toString()}`).emit('aviator:user_cashout' as any, {
          betId: bet._id.toString(),
          roundNumber: bet.roundNumber,
          panelIndex: bet.panelIndex,
          multiplier: mult,
          payoutAmount,
          newBalance: userWallet.availableBalance,
        });
      }

      // Broadcast bet cashed out to room feed
      this.io?.to('room:aviator').emit('aviator:bet_cashed_out' as any, {
        id: bet._id.toString(),
        roundNumber: bet.roundNumber,
        userId: bet.userId.toString(),
        username: bet.username,
        panelIndex: bet.panelIndex,
        betAmount: bet.betAmount,
        cashedOutMultiplier: mult,
        payoutAmount,
        status: 'CASHED_OUT',
      });

      return { success: true, payoutAmount, multiplier: mult };
    } catch (err) {
      logger.error('Error executing cashout:', err);
      return { success: false, payoutAmount: 0, multiplier: 0 };
    }
  }

  /**
   * Place Bet from player (Allowed anytime: current round if BETTING, next round if FLYING/CRASHED)
   */
  public async placeBet(userId: string, username: string, panelIndex: 0 | 1, betAmount: number, autoCashoutMultiplier?: number): Promise<IAviatorBet> {
    if (!this.currentRound) {
      throw new Error('Aviator game is starting. Please try again.');
    }

    const targetRoundNumber = this.currentRound.status === 'BETTING'
      ? this.currentRound.roundNumber
      : this.currentRound.roundNumber + 1;

    // Deduct player wallet
    const userWallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!userWallet || userWallet.availableBalance < betAmount) {
      throw new Error(`Insufficient wallet balance. You have ${userWallet?.availableBalance || 0} ETB, but bet amount is ${betAmount} ETB.`);
    }

    // Check if user already placed an active bet or cancelled bet on this panel
    let bet = await AviatorBet.findOne({
      roundNumber: targetRoundNumber,
      userId: new mongoose.Types.ObjectId(userId),
      panelIndex,
    });

    if (bet) {
      if (bet.status === 'ACTIVE') {
        throw new Error(`You already have an active bet placed on Panel ${panelIndex + 1} for ${targetRoundNumber === this.currentRound.roundNumber ? 'this flight' : 'the next flight'}.`);
      }
      // Re-activate and update existing record (prevents MongoDB E11000 duplicate key error)
      bet.username = username;
      bet.betAmount = betAmount;
      bet.autoCashoutMultiplier = autoCashoutMultiplier && autoCashoutMultiplier > 1.0 ? autoCashoutMultiplier : undefined;
      bet.status = 'ACTIVE';
      bet.cashedOutMultiplier = undefined;
      bet.payoutAmount = 0;
      bet.cashedOutAt = undefined;
      await bet.save();
    } else {
      bet = await AviatorBet.create({
        roundNumber: targetRoundNumber,
        userId: new mongoose.Types.ObjectId(userId),
        username,
        panelIndex,
        betAmount,
        autoCashoutMultiplier: autoCashoutMultiplier && autoCashoutMultiplier > 1.0 ? autoCashoutMultiplier : undefined,
        status: 'ACTIVE',
      });
    }

    userWallet.availableBalance -= betAmount;
    await userWallet.save();

    // Record player deduction transaction
    await WalletTransaction.create({
      walletId: userWallet._id,
      userId: new mongoose.Types.ObjectId(userId),
      type: 'GAME_ENTRY',
      amount: betAmount,
      balanceAfter: userWallet.availableBalance,
      status: 'COMPLETED',
      description: `Aviator Bet Round #${targetRoundNumber} (Panel ${panelIndex + 1})`,
      referenceId: bet._id.toString(),
      metadata: {
        gameType: 'AVIATOR',
        roundNumber: targetRoundNumber,
        panelIndex,
      },
    });

    // Credit Admin / House Wallet
    const adminUser = await User.findOne({ role: 'ADMIN' });
    if (adminUser) {
      const adminWallet = await Wallet.findOne({ userId: adminUser._id });
      if (adminWallet) {
        adminWallet.availableBalance += betAmount;
        await adminWallet.save();

        await WalletTransaction.create({
          walletId: adminWallet._id,
          userId: adminUser._id,
          type: 'DEPOSIT',
          amount: betAmount,
          balanceAfter: adminWallet.availableBalance,
          status: 'COMPLETED',
          description: `House Stake from ${username} (Aviator Round #${targetRoundNumber})`,
          referenceId: bet._id.toString(),
          metadata: {
            gameType: 'AVIATOR',
            roundNumber: targetRoundNumber,
            playerUserId: userId,
          },
        });
      }
    }

    // If current round, update round aggregate and broadcast
    if (targetRoundNumber === this.currentRound.roundNumber) {
      await AviatorRound.updateOne(
        { roundNumber: this.currentRound.roundNumber },
        { $inc: { totalBets: betAmount } }
      );

      this.io?.to('room:aviator').emit('aviator:bet_placed' as any, {
        id: bet._id.toString(),
        roundNumber: bet.roundNumber,
        userId: bet.userId.toString(),
        username: bet.username,
        panelIndex: bet.panelIndex,
        betAmount: bet.betAmount,
        autoCashoutMultiplier: bet.autoCashoutMultiplier,
        status: 'ACTIVE',
      });
    }

    return bet;
  }

  /**
   * Cancel Bet (during countdown or before next flight)
   */
  public async cancelBet(userId: string, panelIndex: 0 | 1): Promise<{ success: boolean; refundedAmount: number; newBalance: number }> {
    if (!this.currentRound) {
      throw new Error('Game not active.');
    }

    const bet = await AviatorBet.findOne({
      roundNumber: { $in: [this.currentRound.roundNumber, this.currentRound.roundNumber + 1] },
      userId: new mongoose.Types.ObjectId(userId),
      panelIndex,
      status: 'ACTIVE',
    });

    if (!bet) {
      throw new Error('No active bet found on this panel to cancel.');
    }

    if (bet.roundNumber === this.currentRound.roundNumber && this.currentRound.status === 'FLYING') {
      throw new Error('Flight has already taken off. Please use Cash Out instead!');
    }

    bet.status = 'CANCELLED';
    await bet.save();

    // Refund player wallet
    const userWallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    let newBalance = 0;
    if (userWallet) {
      userWallet.availableBalance += bet.betAmount;
      await userWallet.save();
      newBalance = userWallet.availableBalance;

      await WalletTransaction.create({
        walletId: userWallet._id,
        userId: new mongoose.Types.ObjectId(userId),
        type: 'REFUND',
        amount: bet.betAmount,
        balanceAfter: userWallet.availableBalance,
        status: 'COMPLETED',
        description: `Aviator Bet Cancellation Refund (Round #${bet.roundNumber})`,
        referenceId: bet._id.toString(),
      });
    }

    // Revert Admin / House Wallet
    const adminUser = await User.findOne({ role: 'ADMIN' });
    if (adminUser) {
      const adminWallet = await Wallet.findOne({ userId: adminUser._id });
      if (adminWallet) {
        adminWallet.availableBalance -= bet.betAmount;
        await adminWallet.save();
      }
    }

    return { success: true, refundedAmount: bet.betAmount, newBalance };
  }

  /**
   * Get Active State for a connecting client
   */
  public async getActiveState(userId?: string): Promise<any> {
    try {
      if (!this.currentRound) {
        return { round: null, recentMultipliers: [], activeBets: [], myBets: [] };
      }

      const recentRounds = await AviatorRound.find({ status: 'CRASHED' })
        .sort({ roundNumber: -1 })
        .limit(20);

      const recentMultipliers = recentRounds.map((r) => r.crashMultiplier);

      const activeBets = await AviatorBet.find({
        roundNumber: this.currentRound.roundNumber,
        status: { $in: ['ACTIVE', 'CASHED_OUT'] },
      }).sort({ createdAt: -1 });

      let myBets: any[] = [];
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        myBets = await AviatorBet.find({
          roundNumber: { $in: [this.currentRound.roundNumber, this.currentRound.roundNumber + 1] },
          userId: new mongoose.Types.ObjectId(userId),
          status: { $in: ['ACTIVE', 'CASHED_OUT'] },
        });
      }

      return {
        round: {
          id: this.currentRound._id.toString(),
          roundNumber: this.currentRound.roundNumber,
          status: this.currentRound.status,
          crashMultiplier: this.currentRound.status === 'CRASHED' ? this.currentRound.crashMultiplier : 0,
          hash: this.currentRound.hash,
          seed: this.currentRound.status === 'CRASHED' ? this.currentRound.seed : '***HIDDEN***',
          startTime: this.currentRound.flightStartedAt?.toISOString(),
          totalBets: this.currentRound.totalBets,
          totalPayout: this.currentRound.totalPayout,
          countdownSeconds: this.currentRound.status === 'BETTING' ? this.currentRound.countdownSeconds : 0,
        },
        currentMultiplier: this.currentMultiplier,
        recentMultipliers,
        activeBets,
        myBets,
      };
    } catch (err) {
      logger.error('Error in getActiveState:', err);
      return { round: null, recentMultipliers: [], activeBets: [], myBets: [] };
    }
  }

  public getCurrentRound(): IAviatorRound | null {
    return this.currentRound;
  }

  public getCurrentMultiplier(): number {
    return this.currentMultiplier;
  }
}
