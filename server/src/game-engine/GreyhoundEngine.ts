import crypto from 'crypto';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { GreyhoundRound, IGreyhoundRound } from '../models/GreyhoundRound';
import { GreyhoundBet, IGreyhoundBet } from '../models/GreyhoundBet';
import { Wallet } from '../models/Wallet';
import { WalletTransaction } from '../models/WalletTransaction';
import { User } from '../models/User';
import {
  IGreyhound,
  IGreyhoundRoundDTO,
  IGreyhoundBetDTO,
  GreyhoundBetType,
  GreyhoundStatsDTO,
} from '../shared';
import { logger } from '../utils/logger';

const GREYHOUND_ROSTER: IGreyhound[] = [
  {
    trapNumber: 1,
    name: '⚡ Blitzing Bullet',
    color: '#1e293b',
    vestColor: '#ef4444',
    vestTextColor: '#ffffff',
    winOdds: 2.4,
    placeOdds: 1.35,
    form: '1-1-1',
    avatar: '🐕',
  },
  {
    trapNumber: 2,
    name: '🔥 Apex Phantom',
    color: '#d97706',
    vestColor: '#3b82f6',
    vestTextColor: '#ffffff',
    winOdds: 3.8,
    placeOdds: 1.75,
    form: '2-1-2',
    avatar: '🐕',
  },
  {
    trapNumber: 3,
    name: '👑 Silver Sonic',
    color: '#94a3b8',
    vestColor: '#f8fafc',
    vestTextColor: '#0f172a',
    winOdds: 5.5,
    placeOdds: 2.3,
    form: '1-3-1',
    avatar: '🐕',
  },
  {
    trapNumber: 4,
    name: '🌪️ Night Stalker',
    color: '#0f172a',
    vestColor: '#18181b',
    vestTextColor: '#ffffff',
    winOdds: 8.0,
    placeOdds: 3.2,
    form: '3-2-2',
    avatar: '🐕',
  },
  {
    trapNumber: 5,
    name: '💎 Golden Flash',
    color: '#78350f',
    vestColor: '#f97316',
    vestTextColor: '#ffffff',
    winOdds: 14.0,
    placeOdds: 5.5,
    form: '4-1-3',
    avatar: '🐕',
  },
  {
    trapNumber: 6,
    name: '🚀 Turbo Tornado',
    color: '#334155',
    vestColor: '#10b981',
    vestTextColor: '#ffffff',
    winOdds: 26.0,
    placeOdds: 9.0,
    form: '5-2-4',
    avatar: '🐕',
  },
];

export class GreyhoundEngine {
  private static instance: GreyhoundEngine;
  private io: Server | null = null;
  private currentRound: IGreyhoundRound | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private raceInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private bettingDurationSeconds = 15;
  private cooldownDurationSeconds = 6;

  private currentPositions: Record<number, number> = {};
  private harePosition = 0;
  private raceStartTime = 0;
  private precomputedFinishOrder: number[] = [];

  private constructor() {}

  public static getInstance(): GreyhoundEngine {
    if (!GreyhoundEngine.instance) {
      GreyhoundEngine.instance = new GreyhoundEngine();
    }
    return GreyhoundEngine.instance;
  }

  public setSocketServer(io: Server): void {
    this.io = io;
  }

  /**
   * Start the continuous Greyhound Racing engine
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('🐕 Initializing Authoritative Dagi Hounds Greyhound Engine...');

    try {
      let round = (await GreyhoundRound.findOne({
        status: { $in: ['BETTING', 'RACING'] },
      }).sort({ roundNumber: -1 })) as IGreyhoundRound | null;

      if (!round) {
        round = await this.createNewRound();
      }

      this.currentRound = round;
      this.runBettingCountdown(this.bettingDurationSeconds);
    } catch (err) {
      logger.error('Error starting Greyhound Engine:', err);
    }
  }

  /**
   * Generate a provably fair round
   */
  private async createNewRound(): Promise<IGreyhoundRound> {
    try {
      const lastRound = await GreyhoundRound.findOne().sort({ roundNumber: -1 });
      const nextRoundNumber = lastRound ? lastRound.roundNumber + 1 : 7001;

      const seed = crypto.randomBytes(16).toString('hex');
      const hash = crypto.createHash('sha256').update(seed).digest('hex');

      this.currentPositions = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      this.harePosition = 0;
      this.precomputedFinishOrder = this.generateFinishOrder(seed);

      const round = (await GreyhoundRound.create({
        roundNumber: nextRoundNumber,
        status: 'BETTING',
        dogs: GREYHOUND_ROSTER,
        winner: null,
        podium: [],
        hash,
        seed,
        commentary: 'Hounds are loaded in traps! Mechanical lure on standby. Place your bets.',
        countdownSeconds: this.bettingDurationSeconds,
        totalBets: 0,
        totalPayout: 0,
        startedAt: new Date(),
      })) as unknown as IGreyhoundRound;

      return round;
    } catch (err) {
      logger.error('Error in Greyhound createNewRound:', err);
      throw err;
    }
  }

  /**
   * Weighted random finish order generation based on dog probabilities
   */
  private generateFinishOrder(seed: string): number[] {
    const weights = [
      { num: 1, w: 1 / 2.4 },
      { num: 2, w: 1 / 3.8 },
      { num: 3, w: 1 / 5.5 },
      { num: 4, w: 1 / 8.0 },
      { num: 5, w: 1 / 14.0 },
      { num: 6, w: 1 / 26.0 },
    ];

    const order: number[] = [];
    const pool = [...weights];

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
      this.currentRound.commentary = `Traps open in ${secondsRemaining}s! Place your bets on the hounds.`;

      this.io?.to('room:greyhound').emit('greyhound:countdown' as any, {
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
        this.startRacePhase().catch((err) => logger.error('Error starting greyhound race phase:', err));
      }
    } catch (err) {
      logger.error('Error in runBettingCountdown:', err);
    }
  }

  /**
   * Phase 2: Live Race Phase (9s–10s)
   */
  private async startRacePhase(): Promise<void> {
    try {
      if (!this.currentRound) return;

      this.currentRound.status = 'RACING';
      this.currentRound.raceStartedAt = new Date();
      this.currentRound.commentary = '⚡ MECHANICAL HARE RUNNING! THE TRAPS FLY OPEN!';
      await this.currentRound.save();

      this.raceStartTime = Date.now();
      this.currentPositions = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      this.harePosition = 0;

      this.io?.to('room:greyhound').emit('greyhound:race_started' as any, {
        roundNumber: this.currentRound.roundNumber,
        status: 'RACING',
        commentary: this.currentRound.commentary,
        startTime: this.currentRound.raceStartedAt.toISOString(),
      });

      const raceDurationMs = 9500; // 9.5 seconds high-speed sprint
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

          // Hare travels just ahead of dogs
          this.harePosition = Math.min(100, Math.floor((progress * 105) * 10) / 10);

          GREYHOUND_ROSTER.forEach((d) => {
            const finishRank = this.precomputedFinishOrder.indexOf(d.trapNumber);
            const rankBonus = (5 - finishRank) * 0.09;
            const noise = Math.sin(elapsedMs * 0.006 + d.trapNumber) * 3;

            let pos = progress * 100 + (progress > 0.4 ? rankBonus * (progress * 14) : noise);
            if (progress >= 1.0) {
              pos = finishRank === 0 ? 100 : Math.max(88, 100 - finishRank * 2.5);
            }
            this.currentPositions[d.trapNumber] = Math.min(100, Math.max(0, Math.floor(pos * 10) / 10));
          });

          // Dynamic commentary
          let commentary = 'Hounds chasing the lure around the first bend!';
          if (progress < 0.3) {
            commentary = '⚡ Trap 1 Blitzing Bullet and Trap 2 Apex Phantom break fast!';
          } else if (progress < 0.65) {
            commentary = '🐕 Night Stalker railing hard on the inside line!';
          } else if (progress < 0.88) {
            commentary = '🔥 IT IS A SPRINT TO THE LINE! Hounds flying!';
          } else {
            const winnerDog = GREYHOUND_ROSTER.find((d) => d.trapNumber === winner);
            commentary = `🏁 TRAP #${winner} ${winnerDog?.name} WINS THE DERBY!`;
          }

          if (progress >= 1.0) {
            if (this.raceInterval) {
              clearInterval(this.raceInterval);
              this.raceInterval = null;
            }
            await this.endRacePhase(winner, podium);
          } else {
            this.io?.to('room:greyhound').emit('greyhound:tick' as any, {
              roundNumber: this.currentRound.roundNumber,
              positions: this.currentPositions,
              harePosition: this.harePosition,
              commentary,
              elapsedMs,
            });
          }
        } catch (tickErr) {
          logger.error('Error during Greyhound tick:', tickErr);
        }
      }, 70);
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

      const winnerDog = GREYHOUND_ROSTER.find((d) => d.trapNumber === winner);
      this.currentRound.commentary = `🏆 WINNER: TRAP #${winner} ${winnerDog?.name}! Payouts credited.`;
      await this.currentRound.save();

      await this.settleRoundBets(this.currentRound.roundNumber, winner, podium);

      this.io?.to('room:greyhound').emit('greyhound:finished' as any, {
        roundNumber: this.currentRound.roundNumber,
        winner,
        podium,
        seed: this.currentRound.seed,
        hash: this.currentRound.hash,
        commentary: this.currentRound.commentary,
        status: 'FINISHED',
      });

      setTimeout(async () => {
        try {
          this.currentRound = await this.createNewRound();
          this.runBettingCountdown(this.bettingDurationSeconds);
        } catch (nextErr) {
          logger.error('Error creating next round in Greyhound:', nextErr);
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
      const bets = await GreyhoundBet.find({ roundNumber, status: 'PENDING' });
      let totalPayoutForRound = 0;

      for (const bet of bets) {
        let isWon = false;

        if (bet.betType === 'WIN' && bet.trapNumber === winner) {
          isWon = true;
        } else if (bet.betType === 'PLACE' && podium.slice(0, 2).includes(bet.trapNumber)) {
          isWon = true;
        } else if (bet.betType === 'EXACTA' && podium[0] === bet.trapNumber && podium[1] === bet.secondTrapNumber) {
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
              description: `Greyhound Win Round #${roundNumber} (${bet.betType} Trap #${bet.trapNumber}, ${bet.odds}x)`,
              referenceId: bet._id.toString(),
              metadata: {
                gameType: 'GREYHOUND_RACE',
                roundNumber,
                betType: bet.betType,
                trapNumber: bet.trapNumber,
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
                  description: `House Greyhound Payout to ${bet.username} (Round #${roundNumber})`,
                  referenceId: bet._id.toString(),
                });
              }
            }

            this.io?.to(`user:${bet.userId.toString()}`).emit('greyhound:user_payout' as any, {
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

      await GreyhoundRound.updateOne(
        { roundNumber },
        { $inc: { totalPayout: totalPayoutForRound } }
      );
    } catch (err) {
      logger.error('Error settling greyhound bets:', err);
    }
  }

  /**
   * Place Bet
   */
  public async placeBet(
    userId: string,
    username: string,
    betType: GreyhoundBetType,
    trapNumber: number,
    betAmount: number,
    secondTrapNumber?: number
  ): Promise<{ bet: IGreyhoundBetDTO; newBalance: number }> {
    if (!this.currentRound) {
      throw new Error('Greyhound engine initializing. Please try again.');
    }

    if (!betAmount || betAmount < 0.5) {
      throw new Error('Minimum bet is 0.5 ETB.');
    }

    const dog = GREYHOUND_ROSTER.find((d) => d.trapNumber === trapNumber);
    if (!dog) {
      throw new Error('Invalid trap selected.');
    }

    if (betType === 'EXACTA') {
      if (!secondTrapNumber || secondTrapNumber === trapNumber) {
        throw new Error('Exacta bets require two distinct traps for 1st and 2nd place.');
      }
    }

    const targetRoundNumber =
      this.currentRound.status === 'BETTING'
        ? this.currentRound.roundNumber
        : this.currentRound.roundNumber + 1;

    let odds = dog.winOdds;
    if (betType === 'PLACE') {
      odds = dog.placeOdds;
    } else if (betType === 'EXACTA') {
      const secondDog = GREYHOUND_ROSTER.find((d) => d.trapNumber === secondTrapNumber);
      const secondOdds = secondDog?.winOdds || 5.0;
      odds = Math.floor(dog.winOdds * secondOdds * 0.75 * 100) / 100;
    }

    const userWallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!userWallet || userWallet.availableBalance < betAmount) {
      throw new Error(`Insufficient wallet balance. You have ${userWallet?.availableBalance || 0} ETB.`);
    }

    const userBalBefore = userWallet.availableBalance;
    userWallet.availableBalance -= betAmount;
    await userWallet.save();

    const bet = await GreyhoundBet.create({
      roundNumber: targetRoundNumber,
      userId: new mongoose.Types.ObjectId(userId),
      username,
      betType,
      trapNumber,
      secondTrapNumber: betType === 'EXACTA' ? secondTrapNumber : undefined,
      betAmount,
      odds,
      payoutAmount: 0,
      status: 'PENDING',
    });

    await WalletTransaction.create({
      walletId: userWallet._id,
      userId: new mongoose.Types.ObjectId(userId),
      type: 'GAME_ENTRY',
      amount: betAmount,
      balanceBefore: userBalBefore,
      balanceAfter: userWallet.availableBalance,
      currency: 'ETB',
      status: 'COMPLETED',
      description: `Greyhound Bet #${targetRoundNumber} (${betType} Trap #${trapNumber}, ${odds}x)`,
      referenceId: bet._id.toString(),
      metadata: {
        gameType: 'GREYHOUND_RACE',
        roundNumber: targetRoundNumber,
        betType,
        trapNumber,
      },
    });

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
          description: `House Stake from ${username} (Greyhound #${targetRoundNumber})`,
          referenceId: bet._id.toString(),
        });
      }
    }

    if (targetRoundNumber === this.currentRound.roundNumber) {
      await GreyhoundRound.updateOne(
        { roundNumber: this.currentRound.roundNumber },
        { $inc: { totalBets: betAmount } }
      );

      this.io?.to('room:greyhound').emit('greyhound:bet_placed' as any, {
        id: bet._id.toString(),
        roundNumber: bet.roundNumber,
        userId: bet.userId.toString(),
        username: bet.username,
        betType: bet.betType,
        trapNumber: bet.trapNumber,
        betAmount: bet.betAmount,
        odds: bet.odds,
      });
    }

    const betDTO: IGreyhoundBetDTO = {
      id: bet._id.toString(),
      roundNumber: bet.roundNumber,
      userId: bet.userId.toString(),
      username: bet.username,
      betType: bet.betType,
      trapNumber: bet.trapNumber,
      secondTrapNumber: bet.secondTrapNumber,
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
   * Get Active State
   */
  public async getActiveState(userId?: string): Promise<{ round: IGreyhoundRoundDTO | null; myBets: IGreyhoundBetDTO[]; roster: IGreyhound[] }> {
    if (!this.currentRound) {
      return { round: null, myBets: [], roster: GREYHOUND_ROSTER };
    }

    const roundDTO: IGreyhoundRoundDTO = {
      id: this.currentRound._id.toString(),
      roundNumber: this.currentRound.roundNumber,
      status: this.currentRound.status,
      dogs: this.currentRound.dogs || GREYHOUND_ROSTER,
      positions: this.currentPositions,
      harePosition: this.harePosition,
      winner: this.currentRound.winner,
      podium: this.currentRound.podium || [],
      hash: this.currentRound.hash,
      serverSeed: this.currentRound.status === 'FINISHED' ? this.currentRound.seed : undefined,
      commentary: this.currentRound.commentary,
      countdownSeconds: this.currentRound.status === 'BETTING' ? this.currentRound.countdownSeconds : 0,
      totalBets: this.currentRound.totalBets,
      startedAt: this.currentRound.startedAt.toISOString(),
    };

    let myBets: IGreyhoundBetDTO[] = [];
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const bets = await GreyhoundBet.find({
        roundNumber: { $in: [this.currentRound.roundNumber, this.currentRound.roundNumber + 1] },
        userId: new mongoose.Types.ObjectId(userId),
      }).sort({ createdAt: -1 });

      myBets = bets.map((b) => ({
        id: b._id.toString(),
        roundNumber: b.roundNumber,
        userId: b.userId.toString(),
        username: b.username,
        betType: b.betType,
        trapNumber: b.trapNumber,
        secondTrapNumber: b.secondTrapNumber,
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
      roster: GREYHOUND_ROSTER,
    };
  }

  /**
   * Get User Personal History
   */
  public async getMyHistory(userId: string, limit = 20): Promise<IGreyhoundBetDTO[]> {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return [];

    const bets = await GreyhoundBet.find({
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
      trapNumber: b.trapNumber,
      secondTrapNumber: b.secondTrapNumber,
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
  public async getStats(): Promise<GreyhoundStatsDTO> {
    try {
      const totalRaces = await GreyhoundRound.countDocuments({ status: 'FINISHED' });
      const totalBets = await GreyhoundBet.countDocuments();
      const topWin = await GreyhoundBet.findOne({ status: 'WON' }).sort({ payoutAmount: -1 });

      const recentFinished = await GreyhoundRound.find({ status: 'FINISHED' })
        .sort({ roundNumber: -1 })
        .limit(10);

      const recentWinners = recentFinished
        .filter((r) => r.winner !== null)
        .map((r) => {
          const dog = GREYHOUND_ROSTER.find((d) => d.trapNumber === r.winner);
          return {
            roundNumber: r.roundNumber,
            trapNumber: r.winner!,
            dogName: dog?.name || `Trap #${r.winner}`,
            odds: dog?.winOdds || 2.4,
          };
        });

      return {
        totalRaces,
        totalBets,
        highestPayout: topWin?.payoutAmount || 0,
        recentWinners,
      };
    } catch (err) {
      logger.error('Error fetching Greyhound stats:', err);
      return { totalRaces: 0, totalBets: 0, highestPayout: 0, recentWinners: [] };
    }
  }
}
