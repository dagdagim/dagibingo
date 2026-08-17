import { BingoColumnLetter } from '../constants/game.constants';

export type GamePattern = 'CLASSIC' | 'FULL_HOUSE' | 'FOUR_CORNERS' | 'X_PATTERN' | 'SPEED_BINGO';

export type GameStatus = 'WAITING' | 'STARTING' | 'LIVE' | 'BINGO_CLAIMED' | 'FINISHED' | 'CANCELLED';

export type GameSpeed = 'RELAXED' | 'STANDARD' | 'TURBO';

export type GameCategory = 'ALL' | 'QUICK' | 'CLASSIC' | 'JACKPOT' | 'TOURNAMENT' | 'PRIVATE';

export interface CalledBall {
  letter: BingoColumnLetter;
  number: number;
  sequence: number;
  timestamp: string;
}

export type TicketGrid = number[][]; // 5x5 array, [row][col], center is 0 (FREE)

export interface BingoTicketDTO {
  id: string;
  ticketNumber: number; // 1, 2, 3, 4
  gameId: string;
  userId: string;
  grid: TicketGrid;
  markedPositions: [number, number][]; // [row, col]
  isWinner: boolean;
  winningPattern?: string;
  createdAt: string;
}

export interface GameRoomSummary {
  id: string;
  code: string; // e.g. BG-928341
  title: string;
  pattern: GamePattern;
  category: GameCategory;
  speed: GameSpeed;
  entryFee: number; // in ETB
  prizePool: number; // in ETB
  status: GameStatus;
  currentPlayers: number;
  maxPlayers: number;
  minPlayers: number;
  calledNumbersCount: number;
  currentBall?: CalledBall | null;
  startTime?: string | null;
  timeUntilStartSeconds?: number;
  isPrivate?: boolean;
}

export interface GameRoomDetails extends GameRoomSummary {
  calledBalls: CalledBall[];
  participants: {
    userId: string;
    username: string;
    avatarUrl?: string;
    ticketsCount: number;
    joinedAt: string;
  }[];
  winners: {
    userId: string;
    username: string;
    ticketId: string;
    prizeAmount: number;
    claimedAt: string;
    pattern: string;
  }[];
  endedAt?: string | null;
}

export interface BingoClaimPayload {
  gameId: string;
  ticketId: string;
  claimedPattern?: GamePattern;
}

export interface BingoClaimResult {
  isValid: boolean;
  message: string;
  winner?: {
    userId: string;
    username: string;
    prize: number;
    ticketId: string;
    pattern: GamePattern;
  };
}
