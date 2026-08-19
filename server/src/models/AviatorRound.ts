import mongoose, { Document, Schema } from 'mongoose';
import { AviatorRoundStatus } from '../shared';

export interface IAviatorRound extends Document {
  _id: mongoose.Types.ObjectId;
  roundNumber: number;
  status: AviatorRoundStatus;
  crashMultiplier: number;
  hash: string;
  seed: string;
  startedAt: Date;
  flightStartedAt?: Date;
  crashedAt?: Date;
  totalBets: number;
  totalPayout: number;
  countdownSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AviatorRoundSchema = new Schema<IAviatorRound>(
  {
    roundNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['BETTING', 'FLYING', 'CRASHED'],
      default: 'BETTING',
      index: true,
    },
    crashMultiplier: {
      type: Number,
      required: true,
    },
    hash: {
      type: String,
      required: true,
    },
    seed: {
      type: String,
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    flightStartedAt: {
      type: Date,
    },
    crashedAt: {
      type: Date,
    },
    totalBets: {
      type: Number,
      default: 0,
    },
    totalPayout: {
      type: Number,
      default: 0,
    },
    countdownSeconds: {
      type: Number,
      default: 6,
    },
  },
  {
    timestamps: true,
  }
);

export const AviatorRound = mongoose.model<IAviatorRound>('AviatorRound', AviatorRoundSchema);
