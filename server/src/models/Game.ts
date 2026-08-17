import mongoose, { Schema, Document } from 'mongoose';
import { CalledBall, GameCategory, GamePattern, GameSpeed, GameStatus } from '@bingo/shared';

export interface IGame extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  title: string;
  pattern: GamePattern;
  category: GameCategory;
  speed: GameSpeed;
  entryFee: number;
  prizePool: number;
  status: GameStatus;
  maxPlayers: number;
  minPlayers: number;
  isPrivate: boolean;
  privateCode?: string;
  drawnBalls: CalledBall[];
  drawnNumbers: number[];
  ballSequence: number;
  winnerIds: mongoose.Types.ObjectId[];
  winningTickets: {
    ticketId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    prize: number;
    claimedAt: Date;
    pattern: string;
  }[];
  startedAt?: Date;
  endedAt?: Date;
  createdById?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GameSchema = new Schema<IGame>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    pattern: {
      type: String,
      enum: ['CLASSIC', 'FULL_HOUSE', 'FOUR_CORNERS', 'X_PATTERN', 'SPEED_BINGO'],
      default: 'CLASSIC',
      index: true,
    },
    category: {
      type: String,
      enum: ['ALL', 'QUICK', 'CLASSIC', 'JACKPOT', 'TOURNAMENT', 'PRIVATE'],
      default: 'CLASSIC',
      index: true,
    },
    speed: {
      type: String,
      enum: ['RELAXED', 'STANDARD', 'TURBO'],
      default: 'STANDARD',
    },
    entryFee: {
      type: Number,
      required: true,
      default: 50,
    },
    prizePool: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['WAITING', 'STARTING', 'LIVE', 'BINGO_CLAIMED', 'FINISHED', 'CANCELLED'],
      default: 'WAITING',
      index: true,
    },
    maxPlayers: {
      type: Number,
      default: 50,
    },
    minPlayers: {
      type: Number,
      default: 2,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    privateCode: {
      type: String,
    },
    drawnBalls: [
      {
        letter: { type: String, required: true },
        number: { type: Number, required: true },
        sequence: { type: Number, required: true },
        timestamp: { type: String, required: true },
      },
    ],
    drawnNumbers: [{ type: Number }],
    ballSequence: {
      type: Number,
      default: 0,
    },
    winnerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    winningTickets: [
      {
        ticketId: { type: Schema.Types.ObjectId, ref: 'BingoTicket' },
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        prize: { type: Number },
        claimedAt: { type: Date, default: Date.now },
        pattern: { type: String },
      },
    ],
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const Game = mongoose.model<IGame>('Game', GameSchema);
