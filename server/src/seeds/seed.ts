import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/environment';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { WalletTransaction } from '../models/WalletTransaction';
import { Game } from '../models/Game';
import { GamePlayer } from '../models/GamePlayer';
import { BingoTicket } from '../models/BingoTicket';
import { KycRecord } from '../models/KycRecord';
import { FraudAlert } from '../models/FraudAlert';
import { Notification } from '../models/Notification';
import { TicketGenerator } from '../game-engine/TicketGenerator';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { logger } from '../utils/logger';

const seedDatabase = async () => {
  try {
    logger.info('🌱 Connecting to database for seeding...');
    await connectDatabase();

    logger.info('🧹 Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Wallet.deleteMany({}),
      WalletTransaction.deleteMany({}),
      Game.deleteMany({}),
      GamePlayer.deleteMany({}),
      BingoTicket.deleteMany({}),
      KycRecord.deleteMany({}),
      FraudAlert.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    logger.info('👥 Creating Admin and Demo Users...');
    const adminPasswordHash = await bcrypt.hash('password1234', 10);
    const playerPasswordHash = await bcrypt.hash('Player@123456', 10);

    const admin = await User.create({
      username: 'admin@dagibingo.com',
      email: 'admin@dagibingo.com',
      passwordHash: adminPasswordHash,
      firstName: 'Dagim',
      lastName: 'Admin',
      role: 'ADMIN',
      kycStatus: 'VERIFIED',
      country: 'Ethiopia',
      isEmailVerified: true,
      isActive: true,
      stats: { gamesPlayed: 0, gamesWon: 0, winRate: 0, totalWinnings: 0, highestWin: 0, currentStreak: 0, bestStreak: 0 },
    });

    const player1 = await User.create({
      username: 'alex_champion',
      email: 'player1@bingoarena.com',
      passwordHash: playerPasswordHash,
      firstName: 'Alex',
      lastName: 'Tadesse',
      role: 'USER',
      kycStatus: 'VERIFIED',
      country: 'Ethiopia',
      isEmailVerified: true,
      isActive: true,
      stats: { gamesPlayed: 85, gamesWon: 24, winRate: 28, totalWinnings: 18500, highestWin: 4200, currentStreak: 2, bestStreak: 4 },
    });

    const player2 = await User.create({
      username: 'maya_bingo',
      email: 'player2@bingoarena.com',
      passwordHash: playerPasswordHash,
      firstName: 'Maya',
      lastName: 'Kebede',
      role: 'USER',
      kycStatus: 'PENDING',
      country: 'Ethiopia',
      isEmailVerified: true,
      isActive: true,
      stats: { gamesPlayed: 42, gamesWon: 11, winRate: 26, totalWinnings: 8400, highestWin: 2400, currentStreak: 0, bestStreak: 3 },
    });

    const player3 = await User.create({
      username: 'sam_lucky',
      email: 'player3@bingoarena.com',
      passwordHash: playerPasswordHash,
      firstName: 'Samuel',
      lastName: 'Bekele',
      role: 'USER',
      kycStatus: 'NOT_STARTED',
      country: 'Ethiopia',
      isEmailVerified: true,
      isActive: true,
      stats: { gamesPlayed: 18, gamesWon: 3, winRate: 17, totalWinnings: 2100, highestWin: 1200, currentStreak: 1, bestStreak: 2 },
    });

    logger.info('💰 Creating Wallets & Transactions...');
    const adminWallet = await Wallet.create({ userId: admin._id, availableBalance: 50000, lockedBalance: 0, bonusBalance: 0 });
    const p1Wallet = await Wallet.create({ userId: player1._id, availableBalance: 5450, lockedBalance: 0, bonusBalance: 200 });
    const p2Wallet = await Wallet.create({ userId: player2._id, availableBalance: 2450, lockedBalance: 0, bonusBalance: 100 });
    const p3Wallet = await Wallet.create({ userId: player3._id, availableBalance: 1200, lockedBalance: 0, bonusBalance: 0 });

    // Seed transaction ledger
    await WalletTransaction.create([
      {
        userId: player1._id,
        walletId: p1Wallet._id,
        type: 'DEPOSIT',
        amount: 2000,
        balanceBefore: 0,
        balanceAfter: 2000,
        currency: 'ETB',
        status: 'COMPLETED',
        description: 'Demo Credit Deposit via Telebirr Mock',
      },
      {
        userId: player1._id,
        walletId: p1Wallet._id,
        type: 'PRIZE',
        amount: 4200,
        balanceBefore: 2000,
        balanceAfter: 6200,
        currency: 'ETB',
        status: 'COMPLETED',
        description: '1st Place Prize - Gold Bingo Room',
      },
      {
        userId: player2._id,
        walletId: p2Wallet._id,
        type: 'DEPOSIT',
        amount: 3000,
        balanceBefore: 0,
        balanceAfter: 3000,
        currency: 'ETB',
        status: 'COMPLETED',
        description: 'Demo Credit Deposit via CBE Birr Mock',
      },
    ]);

    logger.info('🎰 Creating Live Game Rooms...');
    const game1 = await Game.create({
      code: 'BG-928341',
      title: 'Gold Bingo Arena',
      pattern: 'CLASSIC',
      category: 'CLASSIC',
      speed: 'STANDARD',
      entryFee: 50,
      prizePool: 2400,
      status: 'WAITING',
      maxPlayers: 50,
      minPlayers: 2,
    });

    const game2 = await Game.create({
      code: 'BG-837192',
      title: 'Turbo Speed Bingo',
      pattern: 'SPEED_BINGO',
      category: 'QUICK',
      speed: 'TURBO',
      entryFee: 25,
      prizePool: 1200,
      status: 'WAITING',
      maxPlayers: 30,
      minPlayers: 2,
    });

    const game3 = await Game.create({
      code: 'BG-712390',
      title: 'Mega Full House Jackpot',
      pattern: 'FULL_HOUSE',
      category: 'JACKPOT',
      speed: 'RELAXED',
      entryFee: 100,
      prizePool: 10000,
      status: 'WAITING',
      maxPlayers: 100,
      minPlayers: 2,
    });

    const game4 = await Game.create({
      code: 'BG-654128',
      title: 'Four Corners Blitz',
      pattern: 'FOUR_CORNERS',
      category: 'CLASSIC',
      speed: 'STANDARD',
      entryFee: 40,
      prizePool: 1800,
      status: 'WAITING',
      maxPlayers: 40,
      minPlayers: 2,
    });

    const game5 = await Game.create({
      code: 'BG-519284',
      title: 'X-Factor Challenge',
      pattern: 'X_PATTERN',
      category: 'TOURNAMENT',
      speed: 'STANDARD',
      entryFee: 60,
      prizePool: 3200,
      status: 'WAITING',
      maxPlayers: 50,
      minPlayers: 2,
    });

    // Add players to game1
    await GamePlayer.create([
      { gameId: game1._id, userId: player1._id, ticketsCount: 2 },
      { gameId: game1._id, userId: player2._id, ticketsCount: 1 },
      { gameId: game1._id, userId: player3._id, ticketsCount: 1 },
    ]);

    // Create unique tickets for seeded players
    const seedSignatures = new Set<string>();
    await BingoTicket.create([
      {
        gameId: game1._id,
        userId: player1._id,
        ticketNumber: 1,
        grid: TicketGenerator.generateUniqueTicket(seedSignatures),
        markedPositions: [[2, 2]],
      },
      {
        gameId: game1._id,
        userId: player1._id,
        ticketNumber: 2,
        grid: TicketGenerator.generateUniqueTicket(seedSignatures),
        markedPositions: [[2, 2]],
      },
      {
        gameId: game1._id,
        userId: player2._id,
        ticketNumber: 1,
        grid: TicketGenerator.generateUniqueTicket(seedSignatures),
        markedPositions: [[2, 2]],
      },
    ]);

    logger.info('📋 Creating Sample KYC and Fraud records for admin...');
    await KycRecord.create({
      userId: player2._id,
      documentType: 'NATIONAL_ID',
      documentNumber: 'ETH-98234710',
      status: 'PENDING',
    });

    await FraudAlert.create({
      userId: player3._id,
      username: player3.username,
      type: 'RAPID_LOGIN_ATTEMPTS',
      severity: 'LOW',
      description: 'Multiple session sign-ins from different IP ranges within 5 minutes',
      status: 'OPEN',
    });

    await Notification.create([
      {
        userId: player1._id,
        type: 'SYSTEM',
        title: 'Daily Bonus Ready',
        message: 'Claim your 100 ETB Demo daily login bonus!',
      },
      {
        userId: player1._id,
        type: 'TOURNAMENT',
        title: 'Mega Jackpot Starting Soon',
        message: 'Mega Full House Jackpot opens in 10 minutes with 10,000 ETB Demo pool!',
      },
    ]);

    logger.info('====================================================');
    logger.info('🎉 Database seeding completed successfully!');
    logger.info('----------------------------------------------------');
    logger.info('🔑 Admin Login: admin@bingoarena.com / Admin@123456');
    logger.info('🔑 Player 1 Login: player1@bingoarena.com / Player@123456');
    logger.info('🔑 Player 2 Login: player2@bingoarena.com / Player@123456');
    logger.info('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Seeding failed: ${(error as Error).message}`);
    process.exit(1);
  }
};

seedDatabase();
