import mongoose, { Schema, Document } from 'mongoose';
import { TowersDifficulty, TowersGameStatus, TowersTileType } from '../shared';

export interface ITowersGame extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;
  difficulty: TowersDifficulty;
  betAmount: number;
  currentRow: number; // 0 to 8 (9 total floors)
  currentMultiplier: number;
  status: TowersGameStatus;
  payoutAmount: number;
  fullLayout: TowersTileType[][]; // Hidden full 9-row board (e.g. [['GEM','GEM','SKULL','GEM'],...])
  revealedRows: {
    rowIndex: number;
    tiles: TowersTileType[];
    selectedTileIndex?: number;
  }[];
  hash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  createdAt: Date;
  updatedAt: Date;
}

const TowersGameSchema = new Schema<ITowersGame>(
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
      enum: ['IN_PROGRESS', 'CASHED_OUT', 'BUSTED'],
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
      default: 'dagi_towers_client_seed',
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

TowersGameSchema.index({ userId: 1, status: 1 });
TowersGameSchema.index({ createdAt: -1 });

export const TowersGame = mongoose.model<ITowersGame>('TowersGame', TowersGameSchema);
