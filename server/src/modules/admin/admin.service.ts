import mongoose from 'mongoose';
import { User } from '../../models/User';
import { Game } from '../../models/Game';
import { GamePlayer } from '../../models/GamePlayer';
import { Wallet } from '../../models/Wallet';
import { BingoTicket } from '../../models/BingoTicket';
import { WalletTransaction } from '../../models/WalletTransaction';
import { KycRecord } from '../../models/KycRecord';
import { FraudAlert } from '../../models/FraudAlert';
import { AuditLog } from '../../models/AuditLog';
import { GameEngine } from '../../game-engine/GameEngine';
import { NotFoundError } from '../../utils/errors';
import { AdminDashboardMetrics, AdminUserListItem, AdminBetLedgerData, AdminBetRecord, BetOutcome } from '@bingo/shared';

export class AdminService {
  public async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalRegisteredUsers,
      liveGamesCount,
      gamesFinishedToday,
      pendingKycCount,
      highRiskAlertsCount,
      depositTxs,
      withdrawalTxs,
      prizeTxs,
    ] = await Promise.all([
      User.countDocuments(),
      Game.countDocuments({ status: 'LIVE' }),
      Game.countDocuments({ status: 'FINISHED', updatedAt: { $gte: oneDayAgo } }),
      KycRecord.countDocuments({ status: 'PENDING' }),
      FraudAlert.countDocuments({ severity: 'HIGH', status: 'OPEN' }),
      WalletTransaction.aggregate([
        { $match: { type: 'DEPOSIT', createdAt: { $gte: oneDayAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      WalletTransaction.aggregate([
        { $match: { type: 'WITHDRAWAL', createdAt: { $gte: oneDayAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      WalletTransaction.aggregate([
        { $match: { type: 'PRIZE', createdAt: { $gte: oneDayAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const demoDepositsVolume24h = depositTxs[0]?.total || 0;
    const demoWithdrawalsVolume24h = withdrawalTxs[0]?.total || 0;
    const virtualPrizesDistributed24h = prizeTxs[0]?.total || 0;

    // Generate 7-day trend arrays
    const userGrowth = [
      { date: 'Mon', count: Math.max(12, totalRegisteredUsers - 25) },
      { date: 'Tue', count: Math.max(18, totalRegisteredUsers - 20) },
      { date: 'Wed', count: Math.max(25, totalRegisteredUsers - 15) },
      { date: 'Thu', count: Math.max(34, totalRegisteredUsers - 10) },
      { date: 'Fri', count: Math.max(48, totalRegisteredUsers - 5) },
      { date: 'Sat', count: Math.max(62, totalRegisteredUsers - 2) },
      { date: 'Sun', count: totalRegisteredUsers },
    ];

    const dailyGameVolume = [
      { date: 'Mon', count: 14, volume: 14000 },
      { date: 'Tue', count: 22, volume: 24000 },
      { date: 'Wed', count: 19, volume: 21000 },
      { date: 'Thu', count: 31, volume: 38000 },
      { date: 'Fri', count: 45, volume: 62000 },
      { date: 'Sat', count: 58, volume: 85000 },
      { date: 'Sun', count: 64, volume: 92000 },
    ];

    return {
      activePlayersOnline: Math.max(1, Math.floor(totalRegisteredUsers * 0.4)),
      totalRegisteredUsers,
      liveGamesCount,
      gamesFinishedToday,
      demoDepositsVolume24h,
      demoWithdrawalsVolume24h,
      virtualPrizesDistributed24h,
      pendingKycCount,
      highRiskAlertsCount,
      userGrowth,
      dailyGameVolume,
    };
  }

  public async listUsers(search?: string, role?: string, kycStatus?: string, page = 1, limit = 20): Promise<{ users: AdminUserListItem[]; total: number }> {
    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) query.role = role;
    if (kycStatus) query.kycStatus = kycStatus;

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    const mappedUsers: AdminUserListItem[] = users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      email: u.email,
      phone: u.phone,
      role: u.role,
      kycStatus: u.kycStatus,
      isActive: u.isActive,
      walletBalance: 0,
      gamesPlayed: u.stats?.gamesPlayed || 0,
      gamesWon: u.stats?.gamesWon || 0,
      createdAt: u.createdAt.toISOString(),
      riskScore: u.stats?.winRate > 75 && u.stats?.gamesPlayed > 10 ? 'HIGH' : 'LOW',
    }));

    return { users: mappedUsers, total };
  }

  public async toggleUserStatus(adminId: string, adminName: string, userId: string, isActive: boolean): Promise<void> {
    const user = await User.findByIdAndUpdate(userId, { isActive }, { new: true });
    if (!user) throw new NotFoundError('User not found');

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(adminId),
      actorName: adminName,
      action: isActive ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
      resource: 'USER',
      resourceId: user._id.toString(),
    });
  }

  public async listGames(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [games, total] = await Promise.all([
      Game.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Game.countDocuments(),
    ]);

    return {
      games: games.map((g) => ({
        id: g._id.toString(),
        code: g.code,
        title: g.title,
        pattern: g.pattern,
        speed: g.speed,
        entryFee: g.entryFee,
        prizePool: g.prizePool,
        status: g.status,
        currentPlayers: 0,
        maxPlayers: g.maxPlayers,
        calledNumbersCount: g.drawnBalls.length,
        createdAt: g.createdAt.toISOString(),
      })),
      total,
    };
  }

  public async forceStartGame(adminId: string, adminName: string, gameId: string): Promise<void> {
    const game = await Game.findById(gameId);
    if (!game) throw new NotFoundError('Game not found');

    await GameEngine.getInstance().startGame(gameId);

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(adminId),
      actorName: adminName,
      action: 'ADMIN_FORCE_START_GAME',
      resource: 'GAME',
      resourceId: gameId,
    });
  }

  public async cancelGame(adminId: string, adminName: string, gameId: string, reason: string): Promise<void> {
    const game = await Game.findById(gameId);
    if (!game) throw new NotFoundError('Game not found');

    // 1. Stop any active timers or intervals in the engine
    GameEngine.getInstance().stopGameTimer(gameId);

    // 2. Refund all registered players for this round
    const registeredPlayers = await GamePlayer.find({ gameId: game._id });
    const adminUser = await User.findById(adminId);
    const adminWallet = adminUser ? await Wallet.findOne({ userId: adminUser._id }) : null;

    for (const player of registeredPlayers) {
      const ticketsCount = player.ticketsCount || 1;
      const refundAmount = game.entryFee * ticketsCount;

      if (refundAmount > 0) {
        // Refund player wallet
        const playerWallet = await Wallet.findOne({ userId: player.userId });
        if (playerWallet) {
          const pBefore = playerWallet.availableBalance;
          playerWallet.availableBalance += refundAmount;
          playerWallet.version += 1;
          await playerWallet.save();

          await WalletTransaction.create({
            userId: player.userId,
            walletId: playerWallet._id,
            type: 'REFUND',
            amount: refundAmount,
            balanceBefore: pBefore,
            balanceAfter: playerWallet.availableBalance,
            currency: 'ETB',
            status: 'COMPLETED',
            referenceId: game._id.toString(),
            description: `Refund for cancelled room ${game.title} (${ticketsCount} tickets): ${reason || 'Admin reset room to waiting'}`,
          });
        }

        // Deduct refunded amount from admin wallet
        if (adminWallet) {
          const aBefore = adminWallet.availableBalance;
          adminWallet.availableBalance = Math.max(0, adminWallet.availableBalance - refundAmount);
          adminWallet.version += 1;
          await adminWallet.save();

          await WalletTransaction.create({
            userId: adminUser!._id,
            walletId: adminWallet._id,
            type: 'WITHDRAWAL',
            amount: refundAmount,
            balanceBefore: aBefore,
            balanceAfter: adminWallet.availableBalance,
            currency: 'ETB',
            status: 'COMPLETED',
            referenceId: game._id.toString(),
            description: `Player refund deduction for cancelled room ${game.title} (#${game.code})`,
          });
        }
      }
    }

    // 3. Clear old tickets and player registrations for this room
    await BingoTicket.deleteMany({ gameId: game._id });
    await GamePlayer.deleteMany({ gameId: game._id });

    // 4. Reset game state back to WAITING status so players can start fresh
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

    // 5. Broadcast reset event to all connected sockets in that room
    const io = (GameEngine.getInstance() as any).io;
    io?.to(`room:game:${gameId}`).emit('game:round-reset', {
      gameId,
      status: 'WAITING',
    });

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(adminId),
      actorName: adminName,
      action: 'ADMIN_CANCEL_AND_RESET_TO_WAITING',
      resource: 'GAME',
      resourceId: gameId,
      metadata: { reason, refundedPlayersCount: registeredPlayers.length },
    });
  }

  public async listKycRecords() {
    const records = await KycRecord.find().populate('userId', 'username email firstName lastName').sort({ createdAt: -1 });
    return records.map((r: any) => ({
      id: r._id.toString(),
      userId: r.userId?._id?.toString() || r.userId.toString(),
      username: r.userId?.username || 'User',
      email: r.userId?.email || '',
      fullName: `${r.userId?.firstName || ''} ${r.userId?.lastName || ''}`.trim(),
      documentType: r.documentType,
      documentNumber: r.documentNumber,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  public async reviewKyc(adminId: string, adminName: string, kycId: string, status: 'VERIFIED' | 'REJECTED', reason?: string): Promise<void> {
    const record = await KycRecord.findById(kycId);
    if (!record) throw new NotFoundError('KYC record not found');

    record.status = status;
    record.reviewedById = new mongoose.Types.ObjectId(adminId);
    record.reviewedAt = new Date();
    if (reason) record.rejectionReason = reason;
    await record.save();

    await User.findByIdAndUpdate(record.userId, { kycStatus: status });

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(adminId),
      actorName: adminName,
      action: status === 'VERIFIED' ? 'KYC_APPROVED' : 'KYC_REJECTED',
      resource: 'KYC',
      resourceId: record._id.toString(),
      metadata: { reason },
    });
  }

  public async listAuditLogs(limit = 50) {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(limit);
    return logs.map((l) => ({
      id: l._id.toString(),
      actorId: l.actorId.toString(),
      actorName: l.actorName,
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId,
      metadata: l.metadata,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  /**
   * Generates a complete ledger of all player bets, wins, and losses
   */
  public async listBetRecords(): Promise<AdminBetLedgerData> {
    const gamePlayers = await GamePlayer.find()
      .populate('userId', 'username email avatarUrl')
      .populate('gameId', 'title code status pattern entryFee prizePool winnerIds winningTickets createdAt endedAt')
      .sort({ joinedAt: -1 })
      .lean();

    const records: AdminBetRecord[] = [];
    let totalBetsVolume = 0;
    let totalPrizesPaid = 0;
    let totalPlayerWins = 0;
    let totalPlayerLosses = 0;
    let activeBetsCount = 0;

    for (const gp of gamePlayers) {
      const user = gp.userId as any;
      const game = gp.gameId as any;
      if (!user || !game) continue;

      const ticketsCount = gp.ticketsCount || 1;
      const betAmount = (game.entryFee || 0) * ticketsCount;
      totalBetsVolume += betAmount;

      const isWinner = game.winnerIds?.some((wId: any) => wId.toString() === user._id.toString());
      const winningTicket = game.winningTickets?.find((wt: any) => wt.userId?.toString() === user._id.toString());
      const prizeWon = isWinner ? (winningTicket?.prize || game.prizePool || 0) : 0;

      let outcome: BetOutcome = 'ACTIVE';
      if (isWinner) {
        outcome = 'WON';
        totalPlayerWins += 1;
        totalPrizesPaid += prizeWon;
      } else if (game.status === 'FINISHED' || game.status === 'BINGO_CLAIMED') {
        outcome = 'LOST';
        totalPlayerLosses += 1;
      } else if (game.status === 'CANCELLED') {
        outcome = 'CANCELLED';
      } else {
        outcome = 'ACTIVE';
        activeBetsCount += 1;
      }

      const netPlayerProfit = prizeWon - betAmount;
      const houseRevenueImpact = betAmount - prizeWon;

      records.push({
        id: gp._id.toString(),
        gameId: game._id.toString(),
        gameTitle: game.title,
        gameCode: game.code,
        gameStatus: game.status,
        pattern: game.pattern,
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        ticketsCount,
        betAmount,
        prizeWon,
        netPlayerProfit,
        houseRevenueImpact,
        outcome,
        timestamp: gp.joinedAt ? gp.joinedAt.toISOString() : (gp as any).createdAt?.toISOString() || new Date().toISOString(),
      });
    }

    const netHouseProfit = totalBetsVolume - totalPrizesPaid;

    return {
      records,
      summary: {
        totalBetsCount: records.length,
        totalBetsVolume,
        totalPrizesPaid,
        netHouseProfit,
        totalPlayerWins,
        totalPlayerLosses,
        activeBetsCount,
      },
    };
  }

  public async listFraudAlerts() {
    const alerts = await FraudAlert.find().sort({ detectedAt: -1 });
    return alerts.map((a) => ({
      id: a._id.toString(),
      userId: a.userId.toString(),
      username: a.username,
      type: a.type,
      severity: a.severity,
      description: a.description,
      status: a.status,
      detectedAt: a.detectedAt.toISOString(),
    }));
  }
}
