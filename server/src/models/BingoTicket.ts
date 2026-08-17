import mongoose, { Schema, Document } from 'mongoose';
import { TicketGrid } from '../shared';

export interface IBingoTicket extends Document {
  _id: mongoose.Types.ObjectId;
  gameId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  ticketNumber: number;
  grid: TicketGrid; // 5x5 matrix
  markedPositions: [number, number][];
  isWinner: boolean;
  winningPattern?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BingoTicketSchema = new Schema<IBingoTicket>(
  {
    gameId: {
      type: Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ticketNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    grid: {
      type: [[Number]],
      required: true,
    },
    markedPositions: {
      type: [[Number]],
      default: [[2, 2]], // Center FREE space is marked by default
    },
    isWinner: {
      type: Boolean,
      default: false,
      index: true,
    },
    winningPattern: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for player tickets in a specific game
BingoTicketSchema.index({ gameId: 1, userId: 1, ticketNumber: 1 }, { unique: true });

export const BingoTicket = mongoose.model<IBingoTicket>('BingoTicket', BingoTicketSchema);
