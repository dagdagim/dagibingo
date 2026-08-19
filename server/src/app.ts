import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/environment';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';
import { NotFoundError } from './utils/errors';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import gamesRoutes from './modules/games/games.routes';
import walletRoutes from './modules/wallet/wallet.routes';
import leaderboardRoutes from './modules/leaderboards/leaderboard.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import adminRoutes from './modules/admin/admin.routes';
import kenoRoutes from './modules/keno/keno.routes';
import plinkoRoutes from './modules/plinko/plinko.routes';

const app = express();

// Security & Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // For local dev flexibility with Vite
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow local development ports and matching client url
      if (!origin || origin.includes('localhost') || origin === env.CLIENT_URL) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting
app.use('/api', apiRateLimiter);

// Root entry endpoint
app.get('/', (_req, res) => {
  res.status(200).json({
    name: 'DAGI BINGO Authoritative Real-Time Server Engine',
    version: '1.0.0',
    status: 'online',
    mode: env.GAME_MODE,
    developer: 'Dagim Bekele (Tobiya)',
    portfolio: 'https://dagimbekelebunera.vercel.app/',
    health: '/health',
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoints
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    mode: env.GAME_MODE,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    mode: env.GAME_MODE,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount Module Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/keno', kenoRoutes);
app.use('/api/plinko', plinkoRoutes);

// Catch all unmatched routes
app.use('*', (req, _res, next) => {
  next(new NotFoundError(`Endpoint ${req.originalUrl} does not exist`));
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
