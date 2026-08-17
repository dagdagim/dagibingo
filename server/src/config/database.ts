import mongoose from 'mongoose';
import { env } from './environment';
import { logger } from '../utils/logger';

export const connectDatabase = async (): Promise<void> => {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`✅ MongoDB Connected successfully to: ${mongoose.connection.host}`);
  } catch (error) {
    logger.warn(`⚠️ Primary MongoDB Connection Failed: ${(error as Error).message}`);
    const localUri = 'mongodb://admin:password123@127.0.0.1:27017/bingo_arena?authSource=admin';
    if (env.MONGODB_URI !== localUri) {
      try {
        logger.info(`🔄 Attempting fallback connection to authenticated local MongoDB...`);
        await mongoose.connect(localUri, {
          autoIndex: true,
          serverSelectionTimeoutMS: 5000,
        });
        logger.info(`✅ Connected to local MongoDB fallback: ${mongoose.connection.host}`);
        return;
      } catch (fallbackErr) {
        logger.error(`❌ Local MongoDB Fallback Error: ${(fallbackErr as Error).message}`);
      }
    }
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected.');
};
