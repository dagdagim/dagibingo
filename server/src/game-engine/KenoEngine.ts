import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { KenoRound, IKenoRound } from '../models/KenoRound';
import { KenoTicket, IKenoTicket } from '../models/KenoTicket';
import { Wallet } from '../models/Wallet';
import { WalletTransaction } from '../models/WalletTransaction';
import { Notification } from '../models/Notification';
import {
  KENO_PAYTABLE,
  KENO_TOTAL_NUMBERS,
  KENO_DRAW_COUNT,
  KENO_MIN_SPOTS,
  KENO_MAX_SPOTS,
  KenoRoundStatus,
} from '../shared';
import { logger } from '../utils/logger';

export class KenoEngine {
  private static instance: KenoEngine;
  private io: Server | null = null;
  private currentRound: IKenoRound | null = null;
  private activeDrawDeck: number[] = [];
  private currentBallIndex: number = 0;
  private loopTimer: NodeJS.Timeout | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private drawInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  private bettingDuration = 25; // 25s betting window
  private ballIntervalMs = 1200; // 1.2s per drawn ball (24s total draw)
  private cooldownDuration = 10; // 10s cooldown before next round

  private constructor() {}

  public static getInstance(): KenoEngine {
    if (!KenoEngine.instance) {
      KenoEngine.instance = new KenoEngine();
    }
    return KenoEngine.instance;
  }

  public setSocketServer(io: Server): void {
    this.io = io;
  }

  /**
   * Start authoritative Keno background game loop
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('🎰 Initializing Authoritative Keno Engine...');

    try {
      // Find latest uncompleted round or create a new one
      let round = await KenoRound.findOne({
        status: { $in: ['BETTING', 'DRAWING'] },
      }).sort({ roundNumber: -1 });

      if (!round) {
        const lastRound = await KenoRound.findOne().sort({ roundNumber: -1 });
        const nextRoundNumber = lastRound ? lastRound.roundNumber + 1 : 1001;

        round = await KenoRound.create({
          roundNumber: nextRoundNumber,
          status: 'BETTING',
          drawnNumbers: [],
          currentBallIndex: 0,
          totalBets: 0,
          totalPayouts: 0,
          startedAt: new Date(),
          nextRoundAt: new Date(Date.now() + this.bettingDuration * 1000),
        });
      }

      this.currentRound = round;
      this.runBettingPhase(this.bettingDuration);
    } catch (err) {
      logger.error('Error starting Keno Engine:', err);
    }
  }

  /**
   * Phase 1: Betting Phase Countdown
   */
  private runBettingPhase(secondsRemaining: number): void {
    if (!this.currentRound) return;

    this.currentRound.status = 'BETTING';
    this.currentRound.drawnNumbers = [];
    this.currentRound.currentBallIndex = 0;
    this.currentRound.save().catch((e) => logger.error('Error saving round state:', e));

    let countdown = secondsRemaining;

    if (this.countdownTimer) clearInterval(this.countdownTimer);

    // Initial broadcast
    this.io?.to('room:keno').emit('keno:round_state', {
      round: this.getRoundPayload(this.currentRound, countdown),
    });

    this.countdownTimer = setInterval(async () => {
      countdown--;

      this.io?.to('room:keno').emit('keno:countdown', {
        roundNumber: this.currentRound?.roundNumber,
        countdownSeconds: Math.max(0, countdown),
        status: 'BETTING',
      });

      if (countdown <= 0) {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        await this.startDrawPhase();
      }
    }, 1000);
  }

  /**
   * Phase 2: 20-Ball Live Draw Sequence
   */
  private async startDrawPhase(): Promise<void> {
    if (!this.currentRound) return;

    this.currentRound.status = 'DRAWING';
    await this.currentRound.save();

    // Generate 20 unique random numbers from 1 to 80
    this.activeDrawDeck = this.generate20KenoNumbers();
    this.currentBallIndex = 0;
    const drawnNumbers: number[] = [];

    logger.info(`🎰 Round #${this.currentRound.roundNumber} DRAWING started: 20 balls prepared.`);

    this.io?.to('room:keno').emit('keno:draw_started', {
      roundNumber: this.currentRound.roundNumber,
      status: 'DRAWING',
    });

    if (this.drawInterval) clearInterval(this.drawInterval);

    this.drawInterval = setInterval(async () => {
      if (this.currentBallIndex < KENO_DRAW_COUNT) {
        const nextBall = this.activeDrawDeck[this.currentBallIndex];
        drawnNumbers.push(nextBall);
        this.currentBallIndex++;

        if (this.currentRound) {
          this.currentRound.drawnNumbers = [...drawnNumbers];
          this.currentRound.currentBallIndex = this.currentBallIndex;
        }

        // Broadcast drawn ball
        this.io?.to('room:keno').emit('keno:ball_drawn', {
          roundNumber: this.currentRound?.roundNumber,
          ballNumber: nextBall,
          ballIndex: this.currentBallIndex,
          drawnNumbers: [...drawnNumbers],
          totalDrawn: KENO_DRAW_COUNT,
        });
      } else {
        if (this.drawInterval) clearInterval(this.drawInterval);
        await this.settleRound(drawnNumbers);
      }
    }, this.ballIntervalMs);
  }

  /**
   * Phase 3: Settle Round and Credit Winners
   */
  private async settleRound(drawnNumbers: number[]): Promise<void> {
    if (!this.currentRound) return;

    this.currentRound.status = 'SETTLING';
    this.currentRound.drawnNumbers = drawnNumbers;
    await this.currentRound.save();

    logger.info(`🎰 Settle Round #${this.currentRound.roundNumber}: Drawn [${drawnNumbers.join(', ')}]`);

    // Find all active tickets for this round
    const tickets = await KenoTicket.find({
      roundId: this.currentRound._id,
      status: 'PENDING',
    });

    let totalRoundPayouts = 0;
    const winnersPayload: Array<{
      userId: string;
      ticketId: string;
      spotsCount: number;
      hitsCount: number;
      multiplier: number;
      payoutAmount: number;
    }> = [];

    for (const ticket of tickets) {
      const matched = ticket.selectedNumbers.filter((n) => drawnNumbers.includes(n));
      const hitsCount = matched.length;
      const multiplier = KENO_PAYTABLE[ticket.spotsCount]?.[hitsCount] || 0;
      const payoutAmount = Math.round(ticket.betAmount * multiplier * 100) / 100;

      ticket.drawnNumbers = drawnNumbers;
      ticket.matchedNumbers = matched;
      ticket.hitsCount = hitsCount;
      ticket.multiplier = multiplier;
      ticket.payoutAmount = payoutAmount;
      ticket.status = payoutAmount > 0 ? 'WON' : 'LOST';

      await ticket.save();

      if (payoutAmount > 0) {
        totalRoundPayouts += payoutAmount;

        // Credit User Wallet
        const wallet = await Wallet.findOne({ userId: ticket.userId });
        if (wallet) {
          const balanceBefore = wallet.availableBalance;
          wallet.availableBalance += payoutAmount;
          await wallet.save();

          await WalletTransaction.create({
            userId: ticket.userId,
            walletId: wallet._id,
            type: 'PRIZE',
            amount: payoutAmount,
            balanceBefore,
            balanceAfter: wallet.availableBalance,
            currency: 'ETB',
            status: 'COMPLETED',
            description: `Keno Round #${this.currentRound.roundNumber} Payout (${hitsCount}/${ticket.spotsCount} Hits, ${multiplier}x Multiplier)`,
            referenceId: ticket._id.toString(),
            metadata: {
              roundNumber: this.currentRound.roundNumber,
              spotsCount: ticket.spotsCount,
              hitsCount,
              multiplier,
            },
          });

          await Notification.create({
            userId: ticket.userId,
            type: 'GAME_WIN',
            title: '🎰 Keno Win!',
            message: `Congratulations! You matched ${hitsCount} of ${ticket.spotsCount} numbers in Keno Round #${this.currentRound.roundNumber} and won ${payoutAmount.toLocaleString()} ETB!`,
            data: { ticketId: ticket._id, roundNumber: this.currentRound.roundNumber, payoutAmount },
          });

          // Private notification to winning user
          this.io?.to(`user:${ticket.userId.toString()}`).emit('keno:ticket_won', {
            ticketId: ticket._id,
            roundNumber: this.currentRound.roundNumber,
            hitsCount,
            multiplier,
            payoutAmount,
            newBalance: wallet.availableBalance,
          });

          winnersPayload.push({
            userId: ticket.userId.toString(),
            ticketId: ticket._id.toString(),
            spotsCount: ticket.spotsCount,
            hitsCount,
            multiplier,
            payoutAmount,
          });
        }
      }
    }

    this.currentRound.status = 'COMPLETED';
    this.currentRound.totalPayouts = totalRoundPayouts;
    this.currentRound.endedAt = new Date();
    this.currentRound.nextRoundAt = new Date(Date.now() + this.cooldownDuration * 1000);
    await this.currentRound.save();

    // Broadcast Settlement Result
    this.io?.to('room:keno').emit('keno:round_settled', {
      roundNumber: this.currentRound.roundNumber,
      drawnNumbers,
      totalWinners: winnersPayload.length,
      totalPayouts: totalRoundPayouts,
      winners: winnersPayload,
      nextRoundInSeconds: this.cooldownDuration,
    });

    // Phase 4: Wait Cooldown and Start Next Round
    setTimeout(async () => {
      await this.createNewRound();
    }, this.cooldownDuration * 1000);
  }

  /**
   * Create next consecutive round
   */
  private async createNewRound(): Promise<void> {
    try {
      const nextRoundNumber = (this.currentRound?.roundNumber || 1000) + 1;

      const newRound = await KenoRound.create({
        roundNumber: nextRoundNumber,
        status: 'BETTING',
        drawnNumbers: [],
        currentBallIndex: 0,
        totalBets: 0,
        totalPayouts: 0,
        startedAt: new Date(),
        nextRoundAt: new Date(Date.now() + this.bettingDuration * 1000),
      });

      this.currentRound = newRound;
      logger.info(`🎰 New Keno Round #${nextRoundNumber} created. Betting open for ${this.bettingDuration}s.`);

      this.runBettingPhase(this.bettingDuration);
    } catch (err) {
      logger.error('Error creating new Keno round:', err);
    }
  }

  /**
   * Place bet in active live multiplayer round
   */
  public async placeBet(params: {
    userId: string;
    selectedNumbers: number[];
    betAmount: number;
  }): Promise<IKenoTicket> {
    if (!this.currentRound || this.currentRound.status !== 'BETTING') {
      throw new Error('Betting is closed for the current round. Please wait for the next round.');
    }

    const { userId, selectedNumbers, betAmount } = params;

    // Validate numbers
    if (
      !Array.isArray(selectedNumbers) ||
      selectedNumbers.length < KENO_MIN_SPOTS ||
      selectedNumbers.length > KENO_MAX_SPOTS
    ) {
      throw new Error(`You must choose between ${KENO_MIN_SPOTS} and ${KENO_MAX_SPOTS} spots.`);
    }

    // Check unique 1-80 range
    const uniqueNums = Array.from(new Set(selectedNumbers));
    if (uniqueNums.length !== selectedNumbers.length) {
      throw new Error('Duplicate numbers selected.');
    }
    for (const num of uniqueNums) {
      if (num < 1 || num > KENO_TOTAL_NUMBERS) {
        throw new Error(`Numbers must be between 1 and ${KENO_TOTAL_NUMBERS}.`);
      }
    }

    if (betAmount <= 0) {
      throw new Error('Bet amount must be greater than 0.');
    }

    // Wallet Balance Check and Deduction
    const wallet = await Wallet.findOne({ userId });
    if (!wallet || wallet.availableBalance < betAmount) {
      throw new Error('Insufficient wallet balance to place this Keno bet.');
    }

    const balanceBefore = wallet.availableBalance;
    wallet.availableBalance -= betAmount;
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
      description: `Keno Round #${this.currentRound.roundNumber} Bet (${uniqueNums.length} Spots)`,
      referenceId: this.currentRound._id.toString(),
      metadata: {
        roundNumber: this.currentRound.roundNumber,
        spots: uniqueNums,
        betAmount,
      },
    });

    const ticket = await KenoTicket.create({
      userId: new mongoose.Types.ObjectId(userId),
      roundId: this.currentRound._id,
      roundNumber: this.currentRound.roundNumber,
      selectedNumbers: uniqueNums.sort((a, b) => a - b),
      spotsCount: uniqueNums.length,
      betAmount,
      status: 'PENDING',
      isQuickPlay: false,
    });

    // Update Round total bets
    this.currentRound.totalBets += betAmount;
    await this.currentRound.save();

    return ticket;
  }

  /**
   * Instant Solo Quick Play (Immediate single player draw)
   */
  public async playQuickGame(params: {
    userId: string;
    selectedNumbers: number[];
    betAmount: number;
  }): Promise<{ ticket: IKenoTicket; newBalance: number }> {
    const { userId, selectedNumbers, betAmount } = params;

    if (
      !Array.isArray(selectedNumbers) ||
      selectedNumbers.length < KENO_MIN_SPOTS ||
      selectedNumbers.length > KENO_MAX_SPOTS
    ) {
      throw new Error(`You must choose between ${KENO_MIN_SPOTS} and ${KENO_MAX_SPOTS} spots.`);
    }

    const uniqueNums = Array.from(new Set(selectedNumbers));
    if (uniqueNums.length !== selectedNumbers.length) {
      throw new Error('Duplicate numbers selected.');
    }
    for (const num of uniqueNums) {
      if (num < 1 || num > KENO_TOTAL_NUMBERS) {
        throw new Error(`Numbers must be between 1 and ${KENO_TOTAL_NUMBERS}.`);
      }
    }

    if (betAmount <= 0) {
      throw new Error('Bet amount must be greater than 0.');
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet || wallet.availableBalance < betAmount) {
      throw new Error('Insufficient wallet balance for Quick Play.');
    }

    // Deduct Bet
    const balanceBefore = wallet.availableBalance;
    wallet.availableBalance -= betAmount;
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
      description: `Keno Instant Solo Bet (${uniqueNums.length} Spots)`,
      metadata: { spots: uniqueNums, betAmount },
    });

    // Draw 20 Numbers
    const drawnNumbers = this.generate20KenoNumbers();
    const matched = uniqueNums.filter((n) => drawnNumbers.includes(n));
    const hitsCount = matched.length;
    const multiplier = KENO_PAYTABLE[uniqueNums.length]?.[hitsCount] || 0;
    const payoutAmount = Math.round(betAmount * multiplier * 100) / 100;

    if (payoutAmount > 0) {
      const prizeBalanceBefore = wallet.availableBalance;
      wallet.availableBalance += payoutAmount;
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
        description: `Keno Instant Solo Win (${hitsCount}/${uniqueNums.length} Hits, ${multiplier}x Multiplier)`,
        metadata: { hitsCount, multiplier, spotsCount: uniqueNums.length },
      });
    }

    const ticket = await KenoTicket.create({
      userId: new mongoose.Types.ObjectId(userId),
      selectedNumbers: uniqueNums.sort((a, b) => a - b),
      spotsCount: uniqueNums.length,
      betAmount,
      drawnNumbers,
      matchedNumbers: matched,
      hitsCount,
      multiplier,
      payoutAmount,
      status: payoutAmount > 0 ? 'WON' : 'LOST',
      isQuickPlay: true,
    });

    return { ticket, newBalance: wallet.availableBalance };
  }

  /**
   * Helper: Generate 20 unique random numbers from 1 to 80
   */
  private generate20KenoNumbers(): number[] {
    const deck = Array.from({ length: KENO_TOTAL_NUMBERS }, (_, i) => i + 1);
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck.slice(0, KENO_DRAW_COUNT);
  }

  /**
   * Get Active Round Payload
   */
  public getActiveRound(): { round: any } {
    return {
      round: this.getRoundPayload(this.currentRound),
    };
  }

  private getRoundPayload(round: IKenoRound | null, countdown = 0): any {
    if (!round) return null;
    return {
      _id: round._id.toString(),
      roundNumber: round.roundNumber,
      status: round.status,
      drawnNumbers: round.drawnNumbers || [],
      currentBallIndex: round.currentBallIndex || 0,
      totalBets: round.totalBets || 0,
      totalPayouts: round.totalPayouts || 0,
      countdownSeconds: countdown,
      startedAt: round.startedAt?.toISOString(),
      endedAt: round.endedAt?.toISOString(),
      nextRoundAt: round.nextRoundAt?.toISOString(),
    };
  }
}
