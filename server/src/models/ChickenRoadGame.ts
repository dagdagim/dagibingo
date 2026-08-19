import mongoose, { Schema, Document } from 'mongoose';
import { ChickenRoadDifficulty, ChickenRoadGameStatus, ChickenRoadTileType } from '../shared';

export interface IChickenRoadGame extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;
  difficulty: ChickenRoadDifficulty;
  betAmount: number;
  currentRow: number; // 0 to 9 (10 total roads)
  currentMultiplier: number;
  status: ChickenRoadGameStatus;
  payoutAmount: number;
  fullLayout: ChickenRoadTileType[][];
  revealedRows: {
    rowIndex: number;
    tiles: ChickenRoadTileType[];
    selectedTileIndex?: number;
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
      enum: ['EASY', 'MEDIUM', 'HARD', 'EXTREME', 'NIGHTMARE'],
      required: true,
      default: 'EASY',
    },
    betAmount: {
      type: Number,
      required: true,
      min: 0.5,
    },
    currentRow: {
      type: Number,
      default: 0,
    },
    currentMultiplier: {
      type: Number,
      default: 1.0,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'CASHED_OUT', 'CRUSHED'],
      default: 'IN_PROGRESS',
      index: true,
    },
    payoutAmount: {
      type: Number,
      default: 0,
    },
    fullLayout: {
      type: [[String]],
      required: true,
    },
    revealedRows: [
      {
        rowIndex: { type: Number, required: true },
        tiles: [{ type: String }],
        selectedTileIndex: { type: Number },
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
      default: 'chickenroad_client_seed',
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
