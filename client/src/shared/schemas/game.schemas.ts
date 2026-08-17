import { z } from 'zod';

export const createGameSchema = z.object({
  title: z.string().min(3, 'Game title must be at least 3 characters').max(60),
  pattern: z.enum(['CLASSIC', 'FULL_HOUSE', 'FOUR_CORNERS', 'X_PATTERN', 'SPEED_BINGO']),
  category: z.enum(['ALL', 'QUICK', 'CLASSIC', 'JACKPOT', 'TOURNAMENT', 'PRIVATE']).default('CLASSIC'),
  speed: z.enum(['RELAXED', 'STANDARD', 'TURBO']).default('STANDARD'),
  entryFee: z.number().min(0, 'Entry fee cannot be negative').max(10000),
  prizePool: z.number().min(0, 'Prize pool cannot be negative'),
  maxPlayers: z.number().min(2).max(500).default(50),
  minPlayers: z.number().min(1).max(50).default(2),
  startInSeconds: z.number().min(5).max(3600).default(30),
  isPrivate: z.boolean().default(false),
});

export const joinGameSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required'),
  ticketsCount: z.number().min(1).max(4).default(1),
});

export const bingoClaimSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required'),
  ticketId: z.string().min(1, 'Ticket ID is required'),
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;
export type BingoClaimInput = z.infer<typeof bingoClaimSchema>;
