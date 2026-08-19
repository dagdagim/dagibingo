import mongoose, { Schema, Document } from 'mongoose';
import { ChickenDifficulty, ChickenGameStatus, ChickenLaneOutcome } from '../shared';

export interface IChickenGame extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;
  difficulty: ChickenDifficulty;
  betAmount: number;
  currentStep: number; // 0 (start) to totalLanes
  currentMultiplier: number;
  status: ChickenGameStatus;
  payoutAmount: number;
  laneOutcomes: ChickenLaneOutcome[]; // Predetermined full lane outcomes (e.g. ['SAFE', 'SAFE', 'HAZARD', ...])
  stepHistory: {
    step: number;
    outcome: ChickenLaneOutcome;
    multiplier: number;
  }[];
  hash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChickenGameSchema = new Schema<IChickenGame>(
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
      default: 'MEDIUM',
    },
    betAmount: {
      type: Number,
      required: true,
      min: 0.5,
    },
    currentStep: {
      type: Number,
      default: 0,
    },
    currentMultiplier: {
      type: Number,
      default: 1.0,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'CASHED_OUT', 'BUSTED'],
      default: 'IN_PROGRESS',
      index: true,
    },
    payoutAmount: {
      type: Number,
      default: 0,
    },
    laneOutcomes: {
      type: [String],
      required: true,
    },
    stepHistory: [
      {
        step: { type: Number, required: true },
        outcome: { type: String, required: true },
        multiplier: { type: Number, required: true },
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

ChickenGameSchema.index({ userId: 1, status: 1 });
ChickenGameSchema.index({ createdAt: -1 });

export const ChickenGame = mongoose.model<IChickenGame>('ChickenGame', ChickenGameSchema);
