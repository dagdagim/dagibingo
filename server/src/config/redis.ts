import Redis from 'ioredis';
import { env } from './environment';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;
let isRedisConnected = false;

// In-memory fallback map for non-redis dev environments
const memoryCache = new Map<string, { value: string; expiry?: number }>();

export const getRedisClient = (): Redis | null => {
  if (redisClient) return redisClient;

  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('⚠️ Redis unreachable, utilizing memory fallback for game state caching');
          return null; // stop retrying
        }
        return Math.min(times * 100, 2000);
      },
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      logger.info('✅ Redis Connected successfully');
    });

    redisClient.on('error', (err) => {
      isRedisConnected = false;
      logger.warn(`⚠️ Redis notice: ${err.message}`);
    });

    return redisClient;
  } catch (error) {
    logger.warn('⚠️ Redis initialization failed, using in-memory cache');
    return null;
  }
};

export const cacheService = {
  async get(key: string): Promise<string | null> {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.get(key);
      } catch {
        // Fallback to memory
      }
    }
    const item = memoryCache.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      memoryCache.delete(key);
      return null;
    }
    return item.value;
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (isRedisConnected && redisClient) {
      try {
        if (ttlSeconds) {
          await redisClient.set(key, value, 'EX', ttlSeconds);
        } else {
          await redisClient.set(key, value);
        }
        return;
      } catch {
        // Fallback to memory
      }
    }
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    memoryCache.set(key, { value, expiry });
  },

  async del(key: string): Promise<void> {
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.del(key);
        return;
      } catch {
        // Fallback
      }
    }
    memoryCache.delete(key);
  },
};
