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

import path from 'path';
import fs from 'fs';

// Mount Module Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);

// Serve Frontend Static Build if present (Unified Single-Service Hosting)
const clientDistPath = path.resolve(process.cwd(), '../client/dist');
const localClientDistPath = path.resolve(process.cwd(), 'client/dist');
const resolvedDist = fs.existsSync(clientDistPath) ? clientDistPath : fs.existsSync(localClientDistPath) ? localClientDistPath : null;

if (resolvedDist) {
  app.use(express.static(resolvedDist));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/socket.io') || req.originalUrl === '/health') {
      return next();
    }
    res.sendFile(path.join(resolvedDist, 'index.html'));
  });
}

// Catch all unmatched API routes
app.use('/api/*', (req, _res, next) => {
  next(new NotFoundError(`API Endpoint ${req.originalUrl} does not exist`));
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
