import mongoose, { Schema, Document } from 'mongoose';
import { ChickenRoadDifficulty, ChickenRoadGameStatus } from '../shared';

export interface IChickenRoadGame extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;
  difficulty: ChickenRoadDifficulty;
  betAmount: number;
  currentLane: number; // 0 to 24 (25 total lanes)
  currentMultiplier: number;
  status: ChickenRoadGameStatus;
  payoutAmount: number;
  fullLaneLayout: boolean[]; // true = SAFE, false = CAR_CRASH
  revealedLanes: {
    laneIndex: number;
    isSafe: boolean;
  }[];
  hash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChickenRoadGameSchema = new Schema<IChickenRoadGame>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD', 'DAREDEVIL'],
      required: true,
      default: 'EASY',
    },
    betAmount: {
      type: Number,
      required: true,
      min: 0.5,
    },
    currentLane: {
      type: Number,
      default: 0,
    },
    currentMultiplier: {
      type: Number,
      default: 1.0,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'CASHED_OUT', 'CRASHED'],
      default: 'IN_PROGRESS',
      index: true,
    },
    payoutAmount: {
      type: Number,
      default: 0,
    },
    fullLaneLayout: {
      type: [Boolean],
      required: true,
    },
    revealedLanes: [
      {
        laneIndex: { type: Number, required: true },
        isSafe: { type: Boolean, required: true },
      },
    ],
    hash: {
      type: String,
      required: true,
    },
    serverSeed: {
      type: String,
      required: true,
    },
    clientSeed: {
      type: String,
      default: 'dagi_chicken_client_seed',
    },
    nonce: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

ChickenRoadGameSchema.index({ userId: 1, status: 1 });
ChickenRoadGameSchema.index({ createdAt: -1 });

export const ChickenRoadGame = mongoose.model<IChickenRoadGame>('ChickenRoadGame', ChickenRoadGameSchema);
