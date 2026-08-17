import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { env } from './config/environment';
import { connectDatabase, disconnectDatabase } from './config/database';
import { getRedisClient } from './config/redis';
import { setupSocketServer } from './socket/socketManager';
import { logger } from './utils/logger';

const startServer = async (): Promise<void> => {
  try {
    // 1. Connect MongoDB
    await connectDatabase();

    // 2. Initialize Redis (with graceful fallback)
    getRedisClient();

    // 3. Create HTTP & WebSocket Server
    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // 4. Setup Socket Events & Game Engine
    setupSocketServer(io);

    // 5. Start listening
    httpServer.listen(env.PORT, env.HOST, () => {
      logger.info('====================================================');
      logger.info(`🚀 BINGO ARENA Server running on http://${env.HOST}:${env.PORT}`);
      logger.info(`🎮 Active Mode: [${env.GAME_MODE}] (Sandbox Virtual Credits)`);
      logger.info(`🔒 Security: JWT Auth + Rate Limiting + Role RBAC Active`);
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
