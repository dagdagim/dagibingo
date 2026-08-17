import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

// Check local .env first, then root monorepo .env
const localEnv = path.resolve(process.cwd(), '.env');
const rootEnv = path.resolve(process.cwd(), '../.env');

if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  HOST: z.string().default('0.0.0.0'),
  MONGODB_URI: z.string().default('mongodb://admin:password123@127.0.0.1:27017/bingo_arena?authSource=admin'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  JWT_SECRET: z.string().default('bingo_super_secret_jwt_key_development_2026_x89f'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_SECRET: z.string().default('bingo_super_secret_refresh_jwt_key_development_2026_q27m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  GAME_MODE: z.enum(['DEMO', 'REGULATED_REAL_MONEY']).default('DEMO'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('debug'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
