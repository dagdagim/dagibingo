import mongoose from 'mongoose';
import { Game, IGame } from '../../models/Game';
import { GamePlayer } from '../../models/GamePlayer';
import { BingoTicket, IBingoTicket } from '../../models/BingoTicket';
import { Wallet } from '../../models/Wallet';
import { WalletTransaction } from '../../models/WalletTransaction';
import { User } from '../../models/User';
import { TicketGenerator } from '../../game-engine/TicketGenerator';
import { GameEngine } from '../../game-engine/GameEngine';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import {
  CreateGameInput,
  GameCategory,
  GameRoomDetails,
  GameRoomSummary,
  BingoTicketDTO,
} from '../../shared';

export class GamesService {
  public async listGames(category?: GameCategory): Promise<GameRoomSummary[]> {
    const query: Record<string, unknown> = {
      status: { $in: ['WAITING', 'STARTING', 'LIVE'] },
    };

    if (category && category !== 'ALL') {
      query.category = category;
    }

    const games = await Game.find(query).sort({ createdAt: -1 });

    const gameSummaries = await Promise.all(
      games.map(async (game) => {
        const currentPlayers = await GamePlayer.countDocuments({ gameId: game._id });
        return {
          id: game._id.toString(),
          code: game.code,
          title: game.title,
          pattern: game.pattern,
          category: game.category,
          speed: game.speed,
          entryFee: game.entryFee,
          prizePool: game.prizePool,
          status: game.status,
          currentPlayers,
          maxPlayers: game.maxPlayers,
          minPlayers: game.minPlayers,
          calledNumbersCount: game.drawnBalls.length,
          currentBall: game.drawnBalls.length > 0 ? game.drawnBalls[game.drawnBalls.length - 1] : null,
          startTime: game.startedAt ? game.startedAt.toISOString() : null,
          isPrivate: game.isPrivate,
        };
      })
    );

    return gameSummaries;
  }

  public async getGameDetails(gameId: string): Promise<GameRoomDetails> {
    const game = await Game.findById(gameId);
    if (!game) {
      throw new NotFoundError('Game session not found');
    }

    const players = await GamePlayer.find({ gameId: game._id }).populate('userId', 'username avatarUrl');
    const currentPlayers = players.length;

    const participants = players.map((p: any) => ({
      userId: p.userId?._id?.toString() || p.userId.toString(),
      username: p.userId?.username || 'Unknown',
      avatarUrl: p.userId?.avatarUrl,
      ticketsCount: p.ticketsCount,
      joinedAt: p.joinedAt.toISOString(),
    }));

    return {
      id: game._id.toString(),
      code: game.code,
      title: game.title,
      pattern: game.pattern,
      category: game.category,
      speed: game.speed,
      entryFee: game.entryFee,
      prizePool: game.prizePool,
      status: game.status,
      currentPlayers,
      maxPlayers: game.maxPlayers,
      minPlayers: game.minPlayers,
      calledNumbersCount: game.drawnBalls.length,
      currentBall: game.drawnBalls.length > 0 ? game.drawnBalls[game.drawnBalls.length - 1] : null,
      startTime: game.startedAt ? game.startedAt.toISOString() : null,
      calledBalls: game.drawnBalls,
      participants,
      winners: (game.winningTickets || []).map((w) => ({
        userId: w.userId.toString(),
        username: 'Winner',
        ticketId: w.ticketId.toString(),
        prizeAmount: w.prize,
        claimedAt: w.claimedAt.toISOString(),
        pattern: w.pattern,
      })),
      isPrivate: game.isPrivate,
      endedAt: game.endedAt?.toISOString(),
    };
  }

  public async joinGame(userId: string, gameId: string, ticketsCount = 1): Promise<{ tickets: BingoTicketDTO[]; game: GameRoomSummary }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Prohibit Admin from participating as a player
    if (user.role === 'ADMIN') {
      throw new BadRequestError('Administrators are not permitted to participate in games or purchase tickets.');
    }

    const game = await Game.findById(gameId);
    if (!game) {
      throw new NotFoundError('Game session not found');
    }

    if (game.status !== 'WAITING' && game.status !== 'STARTING') {
      throw new BadRequestError('This round is already LIVE. Ticket sales are closed. Please join an upcoming game in the lobby!');
    }

    const existingPlayer = await GamePlayer.findOne({
      gameId: game._id,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (existingPlayer) {
      // User already joined, return existing tickets
      const tickets = await BingoTicket.find({
        gameId: game._id,
        userId: new mongoose.Types.ObjectId(userId),
      });
      const summary = (await this.listGames()).find((g) => g.id === gameId);
      return {
        tickets: tickets.map(this.mapTicketToDTO),
        game: summary!,
      };
    }

    const currentPlayersCount = await GamePlayer.countDocuments({ gameId: game._id });
    if (currentPlayersCount >= game.maxPlayers) {
      throw new BadRequestError('Game room is at maximum capacity');
    }

    // Check entry fee & wallet balance
    const totalCost = game.entryFee * ticketsCount;
    if (totalCost > 0) {
      const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (!wallet || wallet.availableBalance < totalCost) {
        throw new BadRequestError(`Insufficient balance. Required: ${totalCost} ETB, Available: ${wallet?.availableBalance || 0} ETB`);
      }

      // Deduct entry fee from player wallet
      const balanceBefore = wallet.availableBalance;
      wallet.availableBalance -= totalCost;
      wallet.version += 1;
      await wallet.save();

      await WalletTransaction.create({
        userId: wallet.userId,
        walletId: wallet._id,
        type: 'GAME_ENTRY',
        amount: totalCost,
        balanceBefore,
        balanceAfter: wallet.availableBalance,
        currency: 'ETB',
        status: 'COMPLETED',
        referenceId: game._id.toString(),
        description: `Entry bet for Bingo game ${game.title} (${ticketsCount} ticket${ticketsCount > 1 ? 's' : ''})`,
      });

      // Transfer bet money into Admin / House wallet
      const adminUser = await User.findOne({ role: 'ADMIN' });
      if (adminUser) {
        const adminWallet = await Wallet.findOne({ userId: adminUser._id });
        if (adminWallet) {
          const adminBefore = adminWallet.availableBalance;
          adminWallet.availableBalance += totalCost;
          adminWallet.version += 1;
          await adminWallet.save();

          await WalletTransaction.create({
            userId: adminUser._id,
            walletId: adminWallet._id,
            type: 'DEPOSIT',
            amount: totalCost,
            balanceBefore: adminBefore,
            balanceAfter: adminWallet.availableBalance,
            currency: 'ETB',
            status: 'COMPLETED',
            referenceId: game._id.toString(),
            description: `Player entry bet income from @${user.username} for ${game.title} (${ticketsCount} tickets)`,
          });
        }
      }

      // Add to prize pool
      game.prizePool += totalCost;
      await game.save();
    }

    // Register player
    await GamePlayer.create({
      gameId: game._id,
      userId: new mongoose.Types.ObjectId(userId),
      ticketsCount,
      joinedAt: new Date(),
    });

    // Update user stats
    await User.findByIdAndUpdate(userId, {
      $inc: { 'stats.gamesPlayed': 1 },
    });

    // Generate valid, cryptographically unique 75-ball tickets server-side
    const existingGameTickets = await BingoTicket.find({ gameId: game._id });
    const existingSignatures = new Set<string>(
      existingGameTickets.map((t) => TicketGenerator.getGridSignature(t.grid))
    );

    const createdTickets: IBingoTicket[] = [];
    for (let i = 1; i <= ticketsCount; i++) {
      const grid = TicketGenerator.generateUniqueTicket(existingSignatures);
      const ticket = await BingoTicket.create({
        gameId: game._id,
        userId: new mongoose.Types.ObjectId(userId),
        ticketNumber: i,
        grid,
        markedPositions: [[2, 2]], // Center is FREE
      });
      createdTickets.push(ticket);
    }

    // Check if player threshold reached to trigger countdown
    const newPlayerCount = currentPlayersCount + 1;
    if (newPlayerCount >= game.minPlayers && game.status === 'WAITING') {
      GameEngine.getInstance().scheduleGameStart(game._id.toString(), 15);
    }

    const details = await this.getGameDetails(gameId);

    return {
      tickets: createdTickets.map(this.mapTicketToDTO),
      game: details,
    };
  }

  public async getPlayerTickets(userId: string, gameId: string): Promise<BingoTicketDTO[]> {
    const tickets = await BingoTicket.find({
      gameId: new mongoose.Types.ObjectId(gameId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    return tickets.map(this.mapTicketToDTO);
  }

  public async createGame(input: CreateGameInput, creatorId?: string): Promise<GameRoomSummary> {
    const code = `BG-${Math.floor(100000 + Math.random() * 900000)}`;
    const game = await Game.create({
      code,
      title: input.title,
      pattern: input.pattern,
      category: input.category || 'CLASSIC',
      speed: input.speed || 'STANDARD',
      entryFee: input.entryFee,
      prizePool: input.prizePool || input.entryFee * 10,
      maxPlayers: input.maxPlayers || 50,
      minPlayers: input.minPlayers || 2,
      isPrivate: input.isPrivate || false,
      privateCode: input.isPrivate ? Math.random().toString(36).substring(2, 8).toUpperCase() : undefined,
      createdById: creatorId ? new mongoose.Types.ObjectId(creatorId) : undefined,
    });

    return {
      id: game._id.toString(),
      code: game.code,
      title: game.title,
      pattern: game.pattern,
      category: game.category,
      speed: game.speed,
      entryFee: game.entryFee,
      prizePool: game.prizePool,
      status: game.status,
      currentPlayers: 0,
      maxPlayers: game.maxPlayers,
      minPlayers: game.minPlayers,
      calledNumbersCount: 0,
      currentBall: null,
      isPrivate: game.isPrivate,
    };
  }

  private mapTicketToDTO(ticket: IBingoTicket): BingoTicketDTO {
    return {
      id: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      gameId: ticket.gameId.toString(),
      userId: ticket.userId.toString(),
      grid: ticket.grid,
      markedPositions: ticket.markedPositions,
      isWinner: ticket.isWinner,
      winningPattern: ticket.winningPattern,
      createdAt: ticket.createdAt.toISOString(),
    };
  }
}
