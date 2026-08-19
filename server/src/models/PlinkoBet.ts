import mongoose, { Schema, Document } from 'mongoose';
import { PlinkoRisk, PlinkoRows } from '../shared';

export interface IPlinkoBet extends Document {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId | null;
  betAmount: number;
  rows: PlinkoRows;
  risk: PlinkoRisk;
  path: number[];
  bucketIndex: number;
  multiplier: number;
  payoutAmount: number;
  status: 'WON' | 'LOST';
  isGuest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlinkoBetSchema = new Schema<IPlinkoBet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },
    betAmount: {
      type: Number,
      required: true,
      min: 0.1,
    },
    rows: {
      type: Number,
      required: true,
      min: 8,
      max: 16,
      default: 16,
    },
    risk: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      required: true,
      default: 'MEDIUM',
    },
    path: {
      type: [Number],
      required: true,
    },
    bucketIndex: {
      type: Number,
      required: true,
    },
    multiplier: {
      type: Number,
      required: true,
    },
    payoutAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['WON', 'LOST'],
      required: true,
      default: 'LOST',
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

PlinkoBetSchema.index({ createdAt: -1 });
PlinkoBetSchema.index({ userId: 1, createdAt: -1 });

export const PlinkoBet = mongoose.model<IPlinkoBet>('PlinkoBet', PlinkoBetSchema);
