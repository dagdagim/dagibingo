import crypto from 'crypto';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { HorseRaceRound, IHorseRaceRound } from '../models/HorseRaceRound';
import { HorseRaceBet, IHorseRaceBet } from '../models/HorseRaceBet';
import { Wallet } from '../models/Wallet';
import { WalletTransaction } from '../models/WalletTransaction';
import { User } from '../models/User';
import {
  IHorse,
  IHorseRaceRoundDTO,
  IHorseRaceBetDTO,
  HorseBetType,
  HorseRaceStatsDTO,
} from '../shared';
import { logger } from '../utils/logger';

const HORSE_ROSTER: IHorse[] = [
  {
    number: 1,
    name: '⚡ Thunder Bolt',
    color: '#ef4444',
    winOdds: 2.5,
    placeOdds: 1.35,
    form: '1-1-2',
    avatar: '🐎',
  },
  {
    number: 2,
    name: '🔥 Solar Flare',
    color: '#f97316',
    winOdds: 3.8,
    placeOdds: 1.75,
    form: '2-1-3',
    avatar: '🐎',
  },
  {
    number: 3,
    name: '👑 Royal Crown',
    color: '#eab308',
    winOdds: 5.5,
    placeOdds: 2.3,
    form: '1-4-1',
    avatar: '🐎',
  },
  {
    number: 4,
    name: '🌪️ Desert Storm',
    color: '#10b981',
    winOdds: 8.0,
    placeOdds: 3.2,
    form: '3-2-2',
    avatar: '🐎',
  },
  {
    number: 5,
    name: '💎 Diamond Dash',
    color: '#06b6d4',
    winOdds: 14.0,
    placeOdds: 5.5,
    form: '4-3-1',
    avatar: '🐎',
  },
  {
    number: 6,
    name: '🚀 Red Comet',
    color: '#8b5cf6',
    winOdds: 26.0,
    placeOdds: 9.0,
    form: '5-2-4',
    avatar: '🐎',
  },
];

export class HorseRaceEngine {
  private static instance: HorseRaceEngine;
  private io: Server | null = null;
  private currentRound: IHorseRaceRound | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private raceInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private bettingDurationSeconds = 15;
  private cooldownDurationSeconds = 6;

  // Live in-memory positions { 1: 0, 2: 0, ... }
  private currentPositions: Record<number, number> = {};
  private raceStartTime = 0;
  private precomputedFinishOrder: number[] = [];

  private constructor() {}

  public static getInstance(): HorseRaceEngine {
    if (!HorseRaceEngine.instance) {
      HorseRaceEngine.instance = new HorseRaceEngine();
    }
    return HorseRaceEngine.instance;
  }

  public setSocketServer(io: Server): void {
    this.io = io;
  }

  /**
   * Start the continuous Horse Racing engine
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('🐎 Initializing Authoritative Dagi Derby Horse Race Engine...');

    try {
      let round = (await HorseRaceRound.findOne({
        status: { $in: ['BETTING', 'RACING'] },
      }).sort({ roundNumber: -1 })) as IHorseRaceRound | null;

      if (!round) {
        round = await this.createNewRound();
      }

      this.currentRound = round;
      this.runBettingCountdown(this.bettingDurationSeconds);
    } catch (err) {
      logger.error('Error starting Horse Race Engine:', err);
    }
  }

  /**
   * Generate a provably fair round
   */
  private async createNewRound(): Promise<IHorseRaceRound> {
    try {
      const lastRound = await HorseRaceRound.findOne().sort({ roundNumber: -1 });
      const nextRoundNumber = lastRound ? lastRound.roundNumber + 1 : 5001;

      const seed = crypto.randomBytes(16).toString('hex');
      const hash = crypto.createHash('sha256').update(seed).digest('hex');

      // Reset positions
      this.currentPositions = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

      // Pre-compute finish order using provably fair weighted probabilities based on win odds
      this.precomputedFinishOrder = this.generateFinishOrder(seed);

      const round = (await HorseRaceRound.create({
        roundNumber: nextRoundNumber,
        status: 'BETTING',
        horses: HORSE_ROSTER,
        winner: null,
        podium: [],
        hash,
        seed,
        commentary: 'Horses are lining up at the starting gates! Place your bets.',
        countdownSeconds: this.bettingDurationSeconds,
        totalBets: 0,
        totalPayout: 0,
        startedAt: new Date(),
      })) as unknown as IHorseRaceRound;

      return round;
    } catch (err) {
      logger.error('Error in HorseRace createNewRound:', err);
      throw err;
    }
  }

  /**
   * Weighted random finish order generation based on horse win probabilities
   */
  private generateFinishOrder(seed: string): number[] {
    const weights = [
      { num: 1, w: 1 / 2.5 },
      { num: 2, w: 1 / 3.8 },
      { num: 3, w: 1 / 5.5 },
      { num: 4, w: 1 / 8.0 },
      { num: 5, w: 1 / 14.0 },
      { num: 6, w: 1 / 26.0 },
    ];

    const order: number[] = [];
    const pool = [...weights];

    // Seeded random generator
    let seedVal = parseInt(crypto.createHash('sha256').update(seed).digest('hex').substring(0, 8), 16);

    while (pool.length > 0) {
      const totalWeight = pool.reduce((sum, item) => sum + item.w, 0);
      seedVal = (seedVal * 9301 + 49297) % 233280;
      const rnd = (seedVal / 233280) * totalWeight;

      let acc = 0;
      let selectedIdx = 0;
      for (let i = 0; i < pool.length; i++) {
        acc += pool[i].w;
        if (rnd <= acc) {
          selectedIdx = i;
          break;
        }
      }

      order.push(pool[selectedIdx].num);
      pool.splice(selectedIdx, 1);
    }

    return order;
  }

  /**
   * Phase 1: Betting Countdown (15s)
   */
  private runBettingCountdown(secondsRemaining: number): void {
    try {
      if (!this.currentRound) return;

      this.currentRound.status = 'BETTING';
      this.currentRound.countdownSeconds = secondsRemaining;
      this.currentRound.commentary = `Gates open in ${secondsRemaining}s! Place your bets.`;

      this.io?.to('room:horserace').emit('horserace:countdown' as any, {
        roundNumber: this.currentRound.roundNumber,
        countdownSeconds: secondsRemaining,
        status: 'BETTING',
        commentary: this.currentRound.commentary,
      });

      if (this.countdownTimer) clearTimeout(this.countdownTimer);

      if (secondsRemaining > 0) {
        this.countdownTimer = setTimeout(() => {
          this.runBettingCountdown(secondsRemaining - 1);
        }, 1000);
      } else {
        this.startRacePhase().catch((err) => logger.error('Error starting race phase:', err));
      }
    } catch (err) {
      logger.error('Error in runBettingCountdown:', err);
    }
  }

  /**
   * Phase 2: Live Race Phase (10s–12s)
   */
  private async startRacePhase(): Promise<void> {
    try {
      if (!this.currentRound) return;

      this.currentRound.status = 'RACING';
      this.currentRound.raceStartedAt = new Date();
      this.currentRound.commentary = '🎺 AND THEY ARE OFF! The gates burst open!';
      await this.currentRound.save();

      this.raceStartTime = Date.now();
      this.currentPositions = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

      // Broadcast race started event
      this.io?.to('room:horserace').emit('horserace:race_started' as any, {
        roundNumber: this.currentRound.roundNumber,
        status: 'RACING',
        commentary: this.currentRound.commentary,
        startTime: this.currentRound.raceStartedAt.toISOString(),
      });

      const raceDurationMs = 11000; // 11 seconds race
      const podium = this.precomputedFinishOrder.slice(0, 3);
      const winner = podium[0];

      if (this.raceInterval) clearInterval(this.raceInterval);

      this.raceInterval = setInterval(async () => {
        try {
          if (!this.currentRound || this.currentRound.status !== 'RACING') {
            if (this.raceInterval) clearInterval(this.raceInterval);
            return;
          }

          const elapsedMs = Date.now() - this.raceStartTime;
          const progress = Math.min(1.0, elapsedMs / raceDurationMs);

          // Update each horse's position with realistic bursts and curves
          HORSE_ROSTER.forEach((h) => {
            const finishRank = this.precomputedFinishOrder.indexOf(h.number); // 0 is winner, 5 is last
            const rankBonus = (5 - finishRank) * 0.08;
            const noise = Math.sin(elapsedMs * 0.005 + h.number) * 3;

            let pos = progress * 100 + (progress > 0.4 ? rankBonus * (progress * 15) : noise);
            if (progress >= 1.0) {
              pos = finishRank === 0 ? 100 : Math.max(88, 100 - finishRank * 2.5);
            }
            this.currentPositions[h.number] = Math.min(100, Math.max(0, Math.floor(pos * 10) / 10));
          });

          // Dynamic commentary generator
          let commentary = 'Horses battling down the main stretch!';
          if (progress < 0.25) {
            commentary = '⚡ Thunder Bolt and 🔥 Solar Flare leading the early charge!';
          } else if (progress < 0.6) {
            commentary = '🌪️ Desert Storm challenging on the outside rail!';
          } else if (progress < 0.85) {
            commentary = '🔥 IT IS NECK AND NECK! Into the final furlong!';
          } else {
            const winnerHorse = HORSE_ROSTER.find((h) => h.number === winner);
            commentary = `🏁 ${winnerHorse?.name} CROSSES THE FINISH LINE FIRST!`;
          }

          if (progress >= 1.0) {
            if (this.raceInterval) {
              clearInterval(this.raceInterval);
              this.raceInterval = null;
            }
            await this.endRacePhase(winner, podium);
          } else {
            // Broadcast live tick
            this.io?.to('room:horserace').emit('horserace:tick' as any, {
              roundNumber: this.currentRound.roundNumber,
              positions: this.currentPositions,
              commentary,
              elapsedMs,
            });
          }
        } catch (tickErr) {
          logger.error('Error during HorseRace tick:', tickErr);
        }
      }, 80);
    } catch (err) {
      logger.error('Error in startRacePhase:', err);
    }
  }

  /**
   * Phase 3: Finish & Payouts (5s)
   */
  private async endRacePhase(winner: number, podium: number[]): Promise<void> {
    try {
      if (!this.currentRound) return;

      this.currentRound.status = 'FINISHED';
      this.currentRound.winner = winner;
      this.currentRound.podium = podium;
      this.currentRound.finishedAt = new Date();

      const winnerHorse = HORSE_ROSTER.find((h) => h.number === winner);
      this.currentRound.commentary = `🏆 WINNER: ${winnerHorse?.name}! Congratulations to all winners!`;
      await this.currentRound.save();

      // Process and settle all player bets
      await this.settleRoundBets(this.currentRound.roundNumber, winner, podium);

      // Broadcast finished event
      this.io?.to('room:horserace').emit('horserace:finished' as any, {
        roundNumber: this.currentRound.roundNumber,
        winner,
        podium,
        seed: this.currentRound.seed,
        hash: this.currentRound.hash,
        commentary: this.currentRound.commentary,
        status: 'FINISHED',
      });

      // Cooldown then loop to next round
      setTimeout(async () => {
        try {
          this.currentRound = await this.createNewRound();
          this.runBettingCountdown(this.bettingDurationSeconds);
        } catch (nextErr) {
          logger.error('Error creating next round in HorseRace:', nextErr);
        }
      }, this.cooldownDurationSeconds * 1000);
    } catch (err) {
      logger.error('Error in endRacePhase:', err);
    }
  }

  /**
   * Settle bets with double-entry wallet accounting
   */
  private async settleRoundBets(roundNumber: number, winner: number, podium: number[]): Promise<void> {
    try {
      const bets = await HorseRaceBet.find({ roundNumber, status: 'PENDING' });
      let totalPayoutForRound = 0;

      for (const bet of bets) {
        let isWon = false;

        if (bet.betType === 'WIN' && bet.horseNumber === winner) {
          isWon = true;
        } else if (bet.betType === 'PLACE' && podium.slice(0, 2).includes(bet.horseNumber)) {
          isWon = true;
        } else if (bet.betType === 'EXACTA' && podium[0] === bet.horseNumber && podium[1] === bet.secondHorseNumber) {
          isWon = true;
        }

        if (isWon) {
          const payoutAmount = Math.floor(bet.betAmount * bet.odds * 100) / 100;
          bet.status = 'WON';
          bet.payoutAmount = payoutAmount;
          await bet.save();

          totalPayoutForRound += payoutAmount;

          // Double-Entry Ledger: Credit Player Wallet, Debit Admin
          const userWallet = await Wallet.findOne({ userId: bet.userId });
          if (userWallet) {
            const userBalBefore = userWallet.availableBalance;
            userWallet.availableBalance += payoutAmount;
            await userWallet.save();

            await WalletTransaction.create({
              walletId: userWallet._id,
              userId: bet.userId,
              type: 'PRIZE',
              amount: payoutAmount,
              balanceBefore: userBalBefore,
              balanceAfter: userWallet.availableBalance,
              currency: 'ETB',
              status: 'COMPLETED',
              description: `Horse Race Win Round #${roundNumber} (${bet.betType} #${bet.horseNumber}, ${bet.odds}x)`,
              referenceId: bet._id.toString(),
              metadata: {
                gameType: 'HORSE_RACE',
                roundNumber,
                betType: bet.betType,
                horseNumber: bet.horseNumber,
                odds: bet.odds,
              },
            });

            // Debit Admin Wallet
            const adminUser = await User.findOne({ role: 'ADMIN' });
            if (adminUser) {
              const adminWallet = await Wallet.findOne({ userId: adminUser._id });
              if (adminWallet) {
                const adminBalBefore = adminWallet.availableBalance;
                adminWallet.availableBalance -= payoutAmount;
                await adminWallet.save();

                await WalletTransaction.create({
                  walletId: adminWallet._id,
                  userId: adminUser._id,
                  type: 'WITHDRAWAL',
                  amount: payoutAmount,
                  balanceBefore: adminBalBefore,
                  balanceAfter: adminWallet.availableBalance,
                  currency: 'ETB',
                  status: 'COMPLETED',
                  description: `House Horse Race Payout to ${bet.username} (Round #${roundNumber})`,
                  referenceId: bet._id.toString(),
                });
              }
            }

            // Direct socket notification to player
            this.io?.to(`user:${bet.userId.toString()}`).emit('horserace:user_payout' as any, {
              betId: bet._id.toString(),
              roundNumber,
              payoutAmount,
              newBalance: userWallet.availableBalance,
            });
          }
        } else {
          bet.status = 'LOST';
          bet.payoutAmount = 0;
          await bet.save();
        }
      }

      await HorseRaceRound.updateOne(
        { roundNumber },
        { $inc: { totalPayout: totalPayoutForRound } }
      );
    } catch (err) {
      logger.error('Error settling horse race bets:', err);
    }
  }

  /**
   * Place Bet (Accepts Win, Place, or Exacta bets at any time)
   */
  public async placeBet(
    userId: string,
    username: string,
    betType: HorseBetType,
    horseNumber: number,
    betAmount: number,
    secondHorseNumber?: number
  ): Promise<{ bet: IHorseRaceBetDTO; newBalance: number }> {
    if (!this.currentRound) {
      throw new Error('Race engine initializing. Please try again.');
    }

    if (!betAmount || betAmount < 0.5) {
      throw new Error('Minimum bet is 0.5 ETB.');
    }

    const horse = HORSE_ROSTER.find((h) => h.number === horseNumber);
    if (!horse) {
      throw new Error('Invalid horse selected.');
    }

    if (betType === 'EXACTA') {
      if (!secondHorseNumber || secondHorseNumber === horseNumber) {
        throw new Error('Exacta bets require two distinct horses for 1st and 2nd place.');
      }
    }

    // Determine target round: current if BETTING, next if RACING/FINISHED
    const targetRoundNumber =
      this.currentRound.status === 'BETTING'
        ? this.currentRound.roundNumber
        : this.currentRound.roundNumber + 1;

    // Calculate Odds
    let odds = horse.winOdds;
    if (betType === 'PLACE') {
      odds = horse.placeOdds;
    } else if (betType === 'EXACTA') {
      const secondHorse = HORSE_ROSTER.find((h) => h.number === secondHorseNumber);
      const secondOdds = secondHorse?.winOdds || 5.0;
      odds = Math.floor(horse.winOdds * secondOdds * 0.75 * 100) / 100;
    }

    // Deduct player wallet
    const userWallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!userWallet || userWallet.availableBalance < betAmount) {
      throw new Error(`Insufficient wallet balance. You have ${userWallet?.availableBalance || 0} ETB.`);
    }

    const userBalBefore = userWallet.availableBalance;
    userWallet.availableBalance -= betAmount;
    await userWallet.save();

    // Create bet record
    const bet = await HorseRaceBet.create({
      roundNumber: targetRoundNumber,
      userId: new mongoose.Types.ObjectId(userId),
      username,
      betType,
      horseNumber,
      secondHorseNumber: betType === 'EXACTA' ? secondHorseNumber : undefined,
      betAmount,
      odds,
      payoutAmount: 0,
      status: 'PENDING',
    });

    // Record Player Transaction
    await WalletTransaction.create({
      walletId: userWallet._id,
      userId: new mongoose.Types.ObjectId(userId),
      type: 'GAME_ENTRY',
      amount: betAmount,
      balanceBefore: userBalBefore,
      balanceAfter: userWallet.availableBalance,
      currency: 'ETB',
      status: 'COMPLETED',
      description: `Horse Race Bet #${targetRoundNumber} (${betType} Horse #${horseNumber}, ${odds}x)`,
      referenceId: bet._id.toString(),
      metadata: {
        gameType: 'HORSE_RACE',
        roundNumber: targetRoundNumber,
        betType,
        horseNumber,
      },
    });

    // Credit Admin Wallet
    const adminUser = await User.findOne({ role: 'ADMIN' });
    if (adminUser) {
      const adminWallet = await Wallet.findOne({ userId: adminUser._id });
      if (adminWallet) {
        const adminBalBefore = adminWallet.availableBalance;
        adminWallet.availableBalance += betAmount;
        await adminWallet.save();

        await WalletTransaction.create({
          walletId: adminWallet._id,
          userId: adminUser._id,
          type: 'DEPOSIT',
          amount: betAmount,
          balanceBefore: adminBalBefore,
          balanceAfter: adminWallet.availableBalance,
          currency: 'ETB',
          status: 'COMPLETED',
          description: `House Stake from ${username} (Horse Race #${targetRoundNumber})`,
          referenceId: bet._id.toString(),
        });
      }
    }

    // Update Round Aggregate
    if (targetRoundNumber === this.currentRound.roundNumber) {
      await HorseRaceRound.updateOne(
        { roundNumber: this.currentRound.roundNumber },
        { $inc: { totalBets: betAmount } }
      );

      this.io?.to('room:horserace').emit('horserace:bet_placed' as any, {
        id: bet._id.toString(),
        roundNumber: bet.roundNumber,
        userId: bet.userId.toString(),
        username: bet.username,
        betType: bet.betType,
        horseNumber: bet.horseNumber,
        betAmount: bet.betAmount,
        odds: bet.odds,
      });
    }

    const betDTO: IHorseRaceBetDTO = {
      id: bet._id.toString(),
      roundNumber: bet.roundNumber,
      userId: bet.userId.toString(),
      username: bet.username,
      betType: bet.betType,
      horseNumber: bet.horseNumber,
      secondHorseNumber: bet.secondHorseNumber,
      betAmount: bet.betAmount,
      odds: bet.odds,
      payoutAmount: bet.payoutAmount,
      status: bet.status,
      createdAt: bet.createdAt.toISOString(),
    };

    return {
      bet: betDTO,
      newBalance: userWallet.availableBalance,
    };
  }

  /**
   * Get Active State for a connecting client
   */
  public async getActiveState(userId?: string): Promise<{ round: IHorseRaceRoundDTO | null; myBets: IHorseRaceBetDTO[]; roster: IHorse[] }> {
    if (!this.currentRound) {
      return { round: null, myBets: [], roster: HORSE_ROSTER };
    }

    const roundDTO: IHorseRaceRoundDTO = {
      id: this.currentRound._id.toString(),
      roundNumber: this.currentRound.roundNumber,
      status: this.currentRound.status,
      horses: this.currentRound.horses || HORSE_ROSTER,
      positions: this.currentPositions,
      winner: this.currentRound.winner,
      podium: this.currentRound.podium || [],
      hash: this.currentRound.hash,
      serverSeed: this.currentRound.status === 'FINISHED' ? this.currentRound.seed : undefined,
      commentary: this.currentRound.commentary,
      countdownSeconds: this.currentRound.status === 'BETTING' ? this.currentRound.countdownSeconds : 0,
      totalBets: this.currentRound.totalBets,
      startedAt: this.currentRound.startedAt.toISOString(),
    };

    let myBets: IHorseRaceBetDTO[] = [];
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const bets = await HorseRaceBet.find({
        roundNumber: { $in: [this.currentRound.roundNumber, this.currentRound.roundNumber + 1] },
        userId: new mongoose.Types.ObjectId(userId),
      }).sort({ createdAt: -1 });

      myBets = bets.map((b) => ({
        id: b._id.toString(),
        roundNumber: b.roundNumber,
        userId: b.userId.toString(),
        username: b.username,
        betType: b.betType,
        horseNumber: b.horseNumber,
        secondHorseNumber: b.secondHorseNumber,
        betAmount: b.betAmount,
        odds: b.odds,
        payoutAmount: b.payoutAmount,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
      }));
    }

    return {
      round: roundDTO,
      myBets,
      roster: HORSE_ROSTER,
    };
  }

  /**
   * Get User Personal History
   */
  public async getMyHistory(userId: string, limit = 20): Promise<IHorseRaceBetDTO[]> {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return [];

    const bets = await HorseRaceBet.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100));

    return bets.map((b) => ({
      id: b._id.toString(),
      roundNumber: b.roundNumber,
      userId: b.userId.toString(),
      username: b.username,
      betType: b.betType,
      horseNumber: b.horseNumber,
      secondHorseNumber: b.secondHorseNumber,
      betAmount: b.betAmount,
      odds: b.odds,
      payoutAmount: b.payoutAmount,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
    }));
  }

  /**
   * Get Platform Statistics
   */
  public async getStats(): Promise<HorseRaceStatsDTO> {
    try {
      const totalRaces = await HorseRaceRound.countDocuments({ status: 'FINISHED' });
      const totalBets = await HorseRaceBet.countDocuments();
      const topWin = await HorseRaceBet.findOne({ status: 'WON' }).sort({ payoutAmount: -1 });

      const recentFinished = await HorseRaceRound.find({ status: 'FINISHED' })
        .sort({ roundNumber: -1 })
        .limit(10);

      const recentWinners = recentFinished
        .filter((r) => r.winner !== null)
        .map((r) => {
          const horse = HORSE_ROSTER.find((h) => h.number === r.winner);
          return {
            roundNumber: r.roundNumber,
            winnerNumber: r.winner!,
            winnerName: horse?.name || `Horse #${r.winner}`,
            odds: horse?.winOdds || 2.5,
          };
        });

      return {
        totalRaces,
        totalBets,
        highestPayout: topWin?.payoutAmount || 0,
        recentWinners,
      };
    } catch (err) {
      logger.error('Error fetching HorseRace stats:', err);
      return { totalRaces: 0, totalBets: 0, highestPayout: 0, recentWinners: [] };
    }
  }
}
