import mongoose, { Schema, Document } from 'mongoose';
import { HorseBetType } from '../shared';

export interface IHorseRaceBet extends Document {
  _id: mongoose.Types.ObjectId;
  roundNumber: number;
  userId: mongoose.Types.ObjectId;
  username: string;
  betType: HorseBetType;
  horseNumber: number;
  secondHorseNumber?: number; // for EXACTA
  betAmount: number;
  odds: number;
  payoutAmount: number;
  status: 'PENDING' | 'WON' | 'LOST' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

const HorseRaceBetSchema = new Schema<IHorseRaceBet>(
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
    horseNumber: {
      type: Number,
      required: true,
    },
    secondHorseNumber: {
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

HorseRaceBetSchema.index({ roundNumber: 1, userId: 1 });
HorseRaceBetSchema.index({ createdAt: -1 });

export const HorseRaceBet = mongoose.model<IHorseRaceBet>('HorseRaceBet', HorseRaceBetSchema);
