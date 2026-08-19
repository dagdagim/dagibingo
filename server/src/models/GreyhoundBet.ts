import mongoose, { Schema, Document } from 'mongoose';
import { GreyhoundBetType } from '../shared';

export interface IGreyhoundBet extends Document {
  _id: mongoose.Types.ObjectId;
  roundNumber: number;
  userId: mongoose.Types.ObjectId;
  username: string;
  betType: GreyhoundBetType;
  trapNumber: number;
  secondTrapNumber?: number; // for EXACTA
  betAmount: number;
  odds: number;
  payoutAmount: number;
  status: 'PENDING' | 'WON' | 'LOST' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

const GreyhoundBetSchema = new Schema<IGreyhoundBet>(
  {
    roundNumber: {
      type: Number,
      required: true,
      index: true,
    },
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
    betType: {
      type: String,
      enum: ['WIN', 'PLACE', 'EXACTA'],
      required: true,
      default: 'WIN',
    },
    trapNumber: {
      type: Number,
      required: true,
    },
    secondTrapNumber: {
      type: Number,
    },
    betAmount: {
      type: Number,
      required: true,
      min: 0.5,
    },
    odds: {
      type: Number,
      required: true,
    },
    payoutAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'WON', 'LOST', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

GreyhoundBetSchema.index({ roundNumber: 1, userId: 1 });
GreyhoundBetSchema.index({ createdAt: -1 });

export const GreyhoundBet = mongoose.model<IGreyhoundBet>('GreyhoundBet', GreyhoundBetSchema);
