import mongoose, { Schema, Document } from 'mongoose';
import { KenoTicketStatus } from '../shared';

export interface IKenoTicket extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  roundId?: mongoose.Types.ObjectId;
  roundNumber?: number;
  selectedNumbers: number[];
  spotsCount: number;
  betAmount: number;
  drawnNumbers: number[];
  matchedNumbers: number[];
  hitsCount: number;
  multiplier: number;
  payoutAmount: number;
  status: KenoTicketStatus;
  isQuickPlay: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KenoTicketSchema = new Schema<IKenoTicket>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    roundId: {
      type: Schema.Types.ObjectId,
      ref: 'KenoRound',
      index: true,
    },
    roundNumber: {
      type: Number,
      index: true,
    },
    selectedNumbers: {
      type: [Number],
      required: true,
    },
    spotsCount: {
      type: Number,
      required: true,
    },
    betAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    drawnNumbers: {
      type: [Number],
      default: [],
    },
    matchedNumbers: {
      type: [Number],
      default: [],
    },
    hitsCount: {
      type: Number,
      default: 0,
    },
    multiplier: {
      type: Number,
      default: 0,
    },
    payoutAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'WON', 'LOST'],
      default: 'PENDING',
      index: true,
    },
    isQuickPlay: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const KenoTicket = mongoose.model<IKenoTicket>('KenoTicket', KenoTicketSchema);
