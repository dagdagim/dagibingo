import mongoose, { Document, Schema } from 'mongoose';
import { AviatorBetStatus } from '../shared';

export interface IAviatorBet extends Document {
  _id: mongoose.Types.ObjectId;
  roundNumber: number;
  userId: mongoose.Types.ObjectId;
  username: string;
  panelIndex: 0 | 1;
  betAmount: number;
  autoCashoutMultiplier?: number;
  cashedOutMultiplier?: number;
  payoutAmount: number;
  status: AviatorBetStatus;
  cashedOutAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AviatorBetSchema = new Schema<IAviatorBet>(
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
    panelIndex: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },
    betAmount: {
      type: Number,
      required: true,
      min: 0.5,
    },
    autoCashoutMultiplier: {
      type: Number,
      min: 1.01,
    },
    cashedOutMultiplier: {
      type: Number,
    },
    payoutAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CASHED_OUT', 'CRASHED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    cashedOutAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user round bets per panel
AviatorBetSchema.index({ roundNumber: 1, userId: 1, panelIndex: 1 }, { unique: true });

export const AviatorBet = mongoose.model<IAviatorBet>('AviatorBet', AviatorBetSchema);
