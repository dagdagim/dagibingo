import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { env } from './config/environment';
import { connectDatabase, disconnectDatabase } from './config/database';
import { getRedisClient } from './config/redis';
import { setupSocketServer } from './socket/socketManager';
import { Game } from './models/Game';
import { logger } from './utils/logger';

const initDefaultRooms = async (): Promise<void> => {
  try {
    const existingCount = await Game.countDocuments();
    if (existingCount === 0) {
      logger.info('🎰 Initializing default live Bingo rooms...');
      await Game.create([
        {
          code: 'BG-GOLD-01',
          title: 'Gold Bingo Arena',
          pattern: 'CLASSIC',
          category: 'CLASSIC',
          speed: 'STANDARD',
          entryFee: 50,
          prizePool: 2400,
          status: 'WAITING',
          maxPlayers: 50,
          minPlayers: 2,
        },
        {
          code: 'BG-TURBO-02',
          title: 'Turbo Speed Bingo',
          pattern: 'SPEED_BINGO',
          category: 'QUICK',
          speed: 'TURBO',
          entryFee: 25,
          prizePool: 1200,
          status: 'WAITING',
          maxPlayers: 30,
          minPlayers: 2,
        },
        {
          code: 'BG-JACKPOT-03',
          title: 'Mega Full House Jackpot',
          pattern: 'FULL_HOUSE',
          category: 'JACKPOT',
          speed: 'RELAXED',
          entryFee: 100,
          prizePool: 10000,
          status: 'WAITING',
          maxPlayers: 100,
          minPlayers: 2,
        },
        {
          code: 'BG-VIP-04',
          title: 'Diamond High Roller',
          pattern: 'FOUR_CORNERS',
          category: 'HIGH_ROLLER',
          speed: 'STANDARD',
          entryFee: 250,
          prizePool: 25000,
          status: 'WAITING',
          maxPlayers: 25,
          minPlayers: 2,
        },
      ]);
      logger.info('✅ Default live Bingo rooms initialized successfully');
    }
  } catch (error) {
    logger.warn(`Could not auto-seed rooms: ${(error as Error).message}`);
  }
};

// Global Crash Prevention Handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('⚠️ Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('⚠️ Uncaught Exception:', error);
});

const startServer = async (): Promise<void> => {
  try {
    // 1. Connect MongoDB
    await connectDatabase();
    await initDefaultRooms();

    // 2. Initialize Redis (with graceful fallback)
    getRedisClient();

    // 3. Create HTTP & WebSocket Server
    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 30000,
      pingInterval: 10000,
    });

    // 4. Setup Socket Events & Game Engines
    setupSocketServer(io);

    // 5. Start listening
    httpServer.listen(env.PORT, env.HOST, () => {
      logger.info('====================================================');
      logger.info(`🚀 BINGO ARENA Server running on http://${env.HOST}:${env.PORT}`);
      logger.info(`🎮 Active Mode: [${env.GAME_MODE}] (Sandbox Virtual Credits)`);
      logger.info(`🔒 Security: JWT Auth + Rate Limiting + Universal CORS Active`);
      logger.info('====================================================');
    });

    // Graceful Shutdown
    const handleShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Gracefully shutting down...`);
      httpServer.close(async () => {
        await disconnectDatabase();
        logger.info('Server closed cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  } catch (error) {
    logger.error(`Fatal error starting server: ${(error as Error).message}`);
    process.exit(1);
  }
};

startServer();
