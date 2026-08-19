import mongoose, { Schema, Document } from 'mongoose';
import { LimboBetStatus } from '../shared';

export interface ILimboBet extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;
  betAmount: number;
  targetMultiplier: number;
  resultMultiplier: number;
  winChance: number;
  payoutAmount: number;
  status: LimboBetStatus;
  hash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  createdAt: Date;
  updatedAt: Date;
}

const LimboBetSchema = new Schema<ILimboBet>(
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
    betAmount: {
      type: Number,
      required: true,
      min: 0.5,
    },
    targetMultiplier: {
      type: Number,
      required: true,
      min: 1.01,
      max: 1000000,
    },
    resultMultiplier: {
      type: Number,
      required: true,
    },
    winChance: {
      type: Number,
      required: true,
    },
    payoutAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['WON', 'LOST'],
      required: true,
      index: true,
    },
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
      required: true,
    },
    nonce: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

LimboBetSchema.index({ userId: 1, createdAt: -1 });

export const LimboBet = mongoose.model<ILimboBet>('LimboBet', LimboBetSchema);
