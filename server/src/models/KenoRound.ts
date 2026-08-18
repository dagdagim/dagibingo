import mongoose, { Schema, Document } from 'mongoose';
import { KenoRoundStatus } from '../shared';

export interface IKenoRound extends Document {
  _id: mongoose.Types.ObjectId;
  roundNumber: number;
  status: KenoRoundStatus;
  drawnNumbers: number[];
  currentBallIndex: number;
  totalBets: number;
  totalPayouts: number;
  startedAt?: Date;
  endedAt?: Date;
  nextRoundAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const KenoRoundSchema = new Schema<IKenoRound>(
  {
    roundNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['BETTING', 'DRAWING', 'SETTLING', 'COMPLETED'],
      default: 'BETTING',
      index: true,
    },
    drawnNumbers: {
      type: [Number],
      default: [],
    },
    currentBallIndex: {
      type: Number,
      default: 0,
    },
    totalBets: {
      type: Number,
      default: 0,
    },
    totalPayouts: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    nextRoundAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const KenoRound = mongoose.model<IKenoRound>('KenoRound', KenoRoundSchema);
