import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { Game, IGame } from '../models/Game';
import { BingoTicket, IBingoTicket } from '../models/BingoTicket';
import { GamePlayer } from '../models/GamePlayer';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { WalletTransaction } from '../models/WalletTransaction';
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';
import { RNGService } from './RNGService';
import { PatternValidator } from './PatternValidator';
import { GAME_SPEEDS, CalledBall } from '../shared';
import { logger } from '../utils/logger';

interface ActiveGameRuntime {
  gameId: string;
  deck: number[];
  currentBallIndex: number;
  timerInterval?: NodeJS.Timeout;
  countdownTimer?: NodeJS.Timeout;
}

export class GameEngine {
  private static instance: GameEngine;
  private io: Server | null = null;
  private activeRuntimes: Map<string, ActiveGameRuntime> = new Map();

  private constructor() {}

  public static getInstance(): GameEngine {
    if (!GameEngine.instance) {
      GameEngine.instance = new GameEngine();
    }
    return GameEngine.instance;
  }

  public setSocketServer(io: Server): void {
    this.io = io;
  }

  /**
   * Schedule countdown and start for a waiting game
   */
  public async scheduleGameStart(gameId: string, countdownSeconds = 15): Promise<void> {
    const game = await Game.findById(gameId);
    if (!game || (game.status !== 'WAITING' && game.status !== 'STARTING')) return;

    game.status = 'STARTING';
    await game.save();

    logger.info(`🎮 Game ${game.code} starting countdown: ${countdownSeconds}s`);

    this.io?.to(`room:game:${gameId}`).emit('game:starting', {
      gameId,
      countdownSeconds,
    });

    // Check if runtime exists
    let runtime = this.activeRuntimes.get(gameId);
    if (!runtime) {
      runtime = {
        gameId,
        deck: RNGService.generateShuffledBallDeck(),
        currentBallIndex: 0,
      };
      this.activeRuntimes.set(gameId, runtime);
    }

    if (runtime.countdownTimer) {
      clearTimeout(runtime.countdownTimer);
    }

    runtime.countdownTimer = setTimeout(async () => {
      await this.startGame(gameId);
    }, countdownSeconds * 1000);
  }

  /**
   * Transition game to LIVE and begin authoritative ball draws
   */
  public async startGame(gameId: string): Promise<void> {
    const game = await Game.findById(gameId);
    if (!game || game.status === 'LIVE' || game.status === 'FINISHED') return;

    game.status = 'LIVE';
    game.startedAt = new Date();
    await game.save();

    logger.info(`🔥 Game ${game.code} is now LIVE! Pattern: ${game.pattern}`);

    this.io?.to(`room:game:${gameId}`).emit('game:started', {
      gameId,
      startTime: game.startedAt.toISOString(),
    });

    let runtime = this.activeRuntimes.get(gameId);
    if (!runtime) {
      runtime = {
        gameId,
        deck: RNGService.generateShuffledBallDeck(),
        currentBallIndex: 0,
      };
      this.activeRuntimes.set(gameId, runtime);
    }

    const intervalSeconds = GAME_SPEEDS[game.speed]?.intervalSeconds || 4.5;

    // Start drawing balls periodically
    runtime.timerInterval = setInterval(async () => {
      await this.drawNextBall(gameId);
    }, intervalSeconds * 1000);
  }

  /**
   * Draw the next non-repeating ball and broadcast to players
   */
  public async drawNextBall(gameId: string): Promise<void> {
    const runtime = this.activeRuntimes.get(gameId);
    if (!runtime) return;

    const game = await Game.findById(gameId);
    if (!game || game.status !== 'LIVE') {
      this.stopGameTimer(gameId);
      return;
    }

    if (runtime.currentBallIndex >= runtime.deck.length) {
      // All 75 balls drawn, end game with no winner claim if any
      await this.finishGameNoWinner(game);
      return;
    }

    const nextNumber = runtime.deck[runtime.currentBallIndex];
    runtime.currentBallIndex++;

    const calledBall: CalledBall = RNGService.createCalledBall(
      nextNumber,
      runtime.currentBallIndex
    );

    game.drawnBalls.push(calledBall);
    game.drawnNumbers.push(nextNumber);
    game.ballSequence = runtime.currentBallIndex;
    await game.save();

    logger.debug(`🎯 Game ${game.code} Ball Drawn: ${calledBall.letter}${calledBall.number} (#${calledBall.sequence})`);

    this.io?.to(`room:game:${gameId}`).emit('game:number-called', {
      gameId,
      ball: calledBall,
      totalCalled: game.drawnBalls.length,
    });
  }

  /**
   * Validate a player's Bingo claim
   */
  public async claimBingo(
    gameId: string,
    userId: string,
    ticketId?: string
  ): Promise<{ isValid: boolean; message: string; prize?: number; patternMatched?: string }> {
    if (!gameId || !mongoose.Types.ObjectId.isValid(gameId)) {
      return { isValid: false, message: 'Invalid or missing game ID' };
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return { isValid: false, message: 'Invalid user authentication session' };
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return { isValid: false, message: 'Game session not found' };
    }

    if (game.status !== 'LIVE') {
      return { isValid: false, message: `Game is not currently active (Current status: ${game.status})` };
    }

    let ticket = null;
    if (ticketId && mongoose.Types.ObjectId.isValid(ticketId)) {
      ticket = await BingoTicket.findOne({
        _id: new mongoose.Types.ObjectId(ticketId),
        gameId: game._id,
        userId: new mongoose.Types.ObjectId(userId),
      });
    }

    // Fallback: Check if player has any registered ticket for this game
    if (!ticket) {
      ticket = await BingoTicket.findOne({
        gameId: game._id,
        userId: new mongoose.Types.ObjectId(userId),
      });
    }

    if (!ticket) {
      return { isValid: false, message: 'Ticket does not belong to this player or game' };
    }

    const user = await User.findById(userId);
    if (!user) {
      return { isValid: false, message: 'User not found' };
    }

    if (user.role === 'ADMIN') {
      return { isValid: false, message: 'Administrators are not permitted to play or claim prizes.' };
    }

    // Authoritative Server Validation
    const validation = PatternValidator.validate(
      ticket.grid,
      game.drawnNumbers,
      game.pattern
    );

    if (!validation.isValid) {
      logger.warn(`❌ Invalid Bingo Claim by ${user.username} in game ${game.code}: ${validation.reason}`);
      return { isValid: false, message: validation.reason || 'Bingo claim is not valid yet' };
    }

    // VALID BINGO! Stop the game timer immediately
    this.stopGameTimer(gameId);

    game.status = 'BINGO_CLAIMED';
    game.endedAt = new Date();
    game.winnerIds.push(user._id);

    const prizeAmount = game.prizePool;
    game.winningTickets.push({
      ticketId: ticket._id,
      userId: user._id,
      prize: prizeAmount,
      claimedAt: new Date(),
      pattern: validation.patternMatched || game.pattern,
    });

    await game.save();

    ticket.isWinner = true;
    ticket.winningPattern = validation.patternMatched || game.pattern;
    await ticket.save();

    // Credit Winner Virtual Wallet (Atomic)
    const winnerWallet = await Wallet.findOne({ userId: user._id });
    if (winnerWallet) {
      const balanceBefore = winnerWallet.availableBalance;
      winnerWallet.availableBalance += prizeAmount;
      winnerWallet.version += 1;
      await winnerWallet.save();

      await WalletTransaction.create({
        userId: user._id,
        walletId: winnerWallet._id,
        type: 'PRIZE',
        amount: prizeAmount,
        balanceBefore,
        balanceAfter: winnerWallet.availableBalance,
        currency: 'ETB',
        status: 'COMPLETED',
        referenceId: game._id.toString(),
        description: `Won Grand Prize in Bingo game ${game.title} (#${game.code})`,
        metadata: {
          pattern: validation.patternMatched,
          totalCalled: game.drawnNumbers.length,
        },
      });
    }

    // Debit Admin / House Wallet for the prize payout
    const adminUser = await User.findOne({ role: 'ADMIN' });
    if (adminUser) {
      const adminWallet = await Wallet.findOne({ userId: adminUser._id });
      if (adminWallet) {
        const adminBefore = adminWallet.availableBalance;
        adminWallet.availableBalance = Math.max(0, adminWallet.availableBalance - prizeAmount);
        adminWallet.version += 1;
        await adminWallet.save();

        await WalletTransaction.create({
          userId: adminUser._id,
          walletId: adminWallet._id,
          type: 'WITHDRAWAL',
          amount: prizeAmount,
          balanceBefore: adminBefore,
          balanceAfter: adminWallet.availableBalance,
          currency: 'ETB',
          status: 'COMPLETED',
          referenceId: game._id.toString(),
          description: `Prize payout awarded to winner @${user.username} for ${game.title} (#${game.code})`,
        });
      }
    }

    // Update Player Stats
    user.stats.gamesWon += 1;
    user.stats.totalWinnings += prizeAmount;
    if (prizeAmount > user.stats.highestWin) {
      user.stats.highestWin = prizeAmount;
    }
    user.stats.currentStreak += 1;
    if (user.stats.currentStreak > user.stats.bestStreak) {
      user.stats.bestStreak = user.stats.currentStreak;
    }
    if (user.stats.gamesPlayed > 0) {
      user.stats.winRate = Math.round((user.stats.gamesWon / user.stats.gamesPlayed) * 100);
    }
    await user.save();

    // Create Notification
    await Notification.create({
      userId: user._id,
      type: 'BINGO_WIN',
      title: '🎉 BINGO! You Won!',
      message: `Congratulations! You won ${prizeAmount.toLocaleString()} ETB Demo in ${game.title}!`,
      link: `/games/${game._id}`,
    });

    // Create Audit Log
    await AuditLog.create({
      actorId: user._id,
      actorName: user.username,
      action: 'BINGO_VERIFIED_WIN',
      resource: 'GAME',
      resourceId: game._id.toString(),
      metadata: {
        pattern: validation.patternMatched,
        prize: prizeAmount,
        ballsDrawn: game.drawnNumbers.length,
      },
    });

    logger.info(`🏆 WINNER! ${user.username} won game ${game.code} with prize: ${prizeAmount} ETB Demo`);

    // Broadcast Win
    this.io?.to(`room:game:${gameId}`).emit('game:winner', {
      gameId,
      winnerId: user._id.toString(),
      winnerName: user.username,
      prize: prizeAmount,
      pattern: validation.patternMatched || game.pattern,
      winningTicketId: ticket._id.toString(),
    });

    game.status = 'FINISHED';
    await game.save();

    this.activeRuntimes.delete(gameId);

    // Automatically schedule next game round in 30 seconds
    this.scheduleNextRound(gameId, 30);

    return {
      isValid: true,
      message: `BINGO Verified! You won ${prizeAmount.toLocaleString()} ETB Demo!`,
      prize: prizeAmount,
    };
  }

  private async finishGameNoWinner(game: IGame): Promise<void> {
    this.stopGameTimer(game._id.toString());
    game.status = 'FINISHED';
    game.endedAt = new Date();
    await game.save();

    this.io?.to(`room:game:${game._id.toString()}`).emit('game:finished', {
      gameId: game._id.toString(),
      summary: {
        id: game._id.toString(),
        code: game.code,
        title: game.title,
        pattern: game.pattern,
        category: game.category,
        speed: game.speed,
        entryFee: game.entryFee,
        prizePool: game.prizePool,
        status: 'FINISHED',
        currentPlayers: 0,
        maxPlayers: game.maxPlayers,
        minPlayers: game.minPlayers,
        calledNumbersCount: game.drawnBalls.length,
      },
    });

    this.activeRuntimes.delete(game._id.toString());

    // Automatically schedule next game round in 30 seconds
    this.scheduleNextRound(game._id.toString(), 30);
  }

  /**
   * Schedules next round countdown after game finish (30 seconds)
   */
  public scheduleNextRound(gameId: string, delaySeconds = 30): void {
    logger.info(`🔄 Scheduling next round for game ${gameId} in ${delaySeconds}s`);

    this.io?.to(`room:game:${gameId}`).emit('game:round-ended', {
      gameId,
      nextRoundInSeconds: delaySeconds,
      message: `Round complete! Next game starts in ${delaySeconds} seconds. Purchase your tickets to join!`,
    });

    setTimeout(async () => {
      try {
        await this.resetGameForNextRound(gameId);
      } catch (err) {
        logger.error(`Failed to reset game for next round: ${(err as Error).message}`);
      }
    }, delaySeconds * 1000);
  }

  /**
   * Resets room game state and tickets for a fresh round
   */
  public async resetGameForNextRound(gameId: string): Promise<void> {
    const game = await Game.findById(gameId);
    if (!game) return;

    logger.info(`✨ Resetting room ${game.code} for new round`);

    // Reset game state
    game.status = 'WAITING';
    game.drawnBalls = [];
    game.drawnNumbers = [];
    game.ballSequence = 0;
    game.startedAt = undefined;
    game.endedAt = undefined;
    game.winnerIds = [];
    game.winningTickets = [];
    game.prizePool = game.entryFee * 10;
    await game.save();

    // Clear previous round tickets and player registrations for this room
    await BingoTicket.deleteMany({ gameId: game._id });
    await GamePlayer.deleteMany({ gameId: game._id });

    // Clean up active runtime
    this.activeRuntimes.delete(gameId);

    // Broadcast round reset to all players in the room
    this.io?.to(`room:game:${gameId}`).emit('game:round-reset', {
      gameId,
      status: 'WAITING',
    });
  }

  public stopGameTimer(gameId: string): void {
    const runtime = this.activeRuntimes.get(gameId);
    if (runtime) {
      if (runtime.timerInterval) clearInterval(runtime.timerInterval);
      if (runtime.countdownTimer) clearTimeout(runtime.countdownTimer);
    }
  }
}
