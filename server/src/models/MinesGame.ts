import mongoose, { Schema, Document } from 'mongoose';
import { MinesStatus } from '../shared';

export interface IMinesGame extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  betAmount: number;
  mineCount: number;
  grid: boolean[]; // 25 elements: true if mine, false if gem
  revealedTiles: number[];
  currentMultiplier: number;
  payoutAmount: number;
  status: MinesStatus;
  serverSeed: string;
  clientSeed: string;
  hash: string;
  nonce: number;
  isGuest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MinesGameSchema = new Schema<IMinesGame>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    betAmount: {
      type: Number,
      required: true,
      min: 0.5,
    },
    mineCount: {
      type: Number,
      required: true,
      min: 1,
      max: 24,
      default: 3,
    },
    grid: {
      type: [Boolean],
      required: true,
    },
    revealedTiles: {
      type: [Number],
      default: [],
    },
    currentMultiplier: {
      type: Number,
      required: true,
      default: 1.0,
    },
    payoutAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'CASHED_OUT', 'EXPLODED'],
      required: true,
      default: 'IN_PROGRESS',
      index: true,
    },
    serverSeed: {
      type: String,
      required: true,
    },
    clientSeed: {
      type: String,
      required: true,
    },
    hash: {
      type: String,
      required: true,
      index: true,
    },
    nonce: {
      type: Number,
      required: true,
      default: 1,
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

MinesGameSchema.index({ userId: 1, status: 1 });
MinesGameSchema.index({ createdAt: -1 });

export const MinesGame = mongoose.model<IMinesGame>('MinesGame', MinesGameSchema);
