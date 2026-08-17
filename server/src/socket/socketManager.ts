import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { GameEngine } from '../game-engine/GameEngine';
import { logger } from '../utils/logger';
import { ClientToServerEvents, ServerToClientEvents } from '../shared';

interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  userId?: string;
  username?: string;
  role?: string;
}

// Simple in-memory rate limiter for chat per socket
const userChatTimestamps = new Map<string, number>();

export const setupSocketServer = (io: Server<ClientToServerEvents, ServerToClientEvents>): void => {
  const gameEngine = GameEngine.getInstance();
  gameEngine.setSocketServer(io);

  // Authentication Middleware for Sockets
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        // Allow guest or require auth
        socket.userId = `guest_${socket.id.substring(0, 5)}`;
        socket.username = `Player_${socket.id.substring(0, 4)}`;
        return next();
      }

      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        userId: string;
        username: string;
        role: string;
      };

      socket.userId = decoded.userId;
      socket.username = decoded.username;
      socket.role = decoded.role;
      next();
    } catch (error) {
      // If token expired or invalid, connect as guest or reject
      socket.userId = `guest_${socket.id.substring(0, 5)}`;
      socket.username = `Player_${socket.id.substring(0, 4)}`;
      next();
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`🔌 Socket connected: ${socket.id} (User: ${socket.username})`);

    // Personal user channel for targeted notifications
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Join Game Room
    socket.on('room:join', (gameId: string, callback) => {
      if (!gameId) {
        if (callback) callback({ success: false, error: 'Game ID required' });
        return;
      }

      const roomName = `room:game:${gameId}`;
      socket.join(roomName);

      const roomSockets = io.sockets.adapter.rooms.get(roomName);
      const userCount = roomSockets ? roomSockets.size : 1;

      logger.info(`👥 User ${socket.username} joined room ${gameId}. Total users: ${userCount}`);

      // Broadcast presence update
      io.to(roomName).emit('room:joined', { gameId, userCount });

      if (callback) {
        callback({ success: true });
      }
    });

    // Leave Game Room
    socket.on('room:leave', (gameId: string) => {
      const roomName = `room:game:${gameId}`;
      socket.leave(roomName);

      const roomSockets = io.sockets.adapter.rooms.get(roomName);
      const userCount = roomSockets ? roomSockets.size : 0;

      io.to(roomName).emit('room:left', { gameId, userCount });
      logger.info(`👋 User ${socket.username} left room ${gameId}`);
    });

    // Handle Player Bingo Claim
    socket.on('game:claim-bingo', async (payload, callback) => {
      try {
        if (!socket.userId) {
          if (callback) callback({ success: false, isValid: false, message: 'Authentication required to claim Bingo' });
          return;
        }

        const { gameId, ticketId } = payload;
        const result = await gameEngine.claimBingo(gameId, socket.userId, ticketId);

        if (callback) {
          callback({
            success: true,
            isValid: result.isValid,
            message: result.message,
          });
        }
      } catch (error) {
        logger.error(`Error processing bingo claim: ${(error as Error).message}`);
        if (callback) {
          callback({
            success: false,
            isValid: false,
            message: 'Internal server error while evaluating claim',
          });
        }
      }
    });

    // Handle Live Chat Message
    socket.on('chat:send', (payload, callback) => {
      try {
        const { gameId, message } = payload;
        if (!gameId || !message || message.trim().length === 0) {
          if (callback) callback({ success: false, error: 'Empty message' });
          return;
        }

        // Chat rate limiting (max 1 message every 800ms)
        const now = Date.now();
        const lastChat = userChatTimestamps.get(socket.id) || 0;
        if (now - lastChat < 800) {
          if (callback) callback({ success: false, error: 'Please wait before sending another message' });
          return;
        }
        userChatTimestamps.set(socket.id, now);

        // Sanitize and trim
        const sanitizedMsg = message.substring(0, 140).trim();

        const chatPayload = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          gameId,
          userId: socket.userId || 'anon',
          username: socket.username || 'Anonymous',
          message: sanitizedMsg,
          timestamp: new Date().toISOString(),
        };

        io.to(`room:game:${gameId}`).emit('chat:message', chatPayload);

        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, error: (error as Error).message });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 Socket disconnected: ${socket.id} (User: ${socket.username})`);
      userChatTimestamps.delete(socket.id);
    });
  });
};
