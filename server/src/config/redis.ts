import Redis from 'ioredis';
import { env } from './environment';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;
let isRedisConnected = false;

// In-memory fallback map for non-redis dev environments
const memoryCache = new Map<string, { value: string; expiry?: number }>();

export const getRedisClient = (): Redis | null => {
  if (redisClient) return redisClient;

  // If on production and REDIS_URL is local default, use in-memory cache directly
  if (env.NODE_ENV === 'production' && (!env.REDIS_URL || env.REDIS_URL.includes('127.0.0.1') || env.REDIS_URL.includes('localhost'))) {
    logger.info('ℹ️ Using high-performance in-memory cache for game state');
    return null;
  }

  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 1) {
          logger.info('ℹ️ Redis offline, switching to in-memory game state cache');
          return null; // stop retrying
        }
        return 500;
      },
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      logger.info('✅ Redis Connected successfully');
    });

    redisClient.on('error', (_err) => {
      isRedisConnected = false;
    });

    redisClient.connect().catch(() => {
      isRedisConnected = false;
      logger.info('ℹ️ Operating in high-performance in-memory cache mode');
    });

    return redisClient;
  } catch (error) {
    logger.info('ℹ️ Operating in high-performance in-memory cache mode');
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
