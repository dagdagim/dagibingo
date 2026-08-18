import mongoose, { Schema, Document } from 'mongoose';

export interface IKenoBet extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  spots: number[];
  drawnNumbers: number[];
  matchedNumbers: number[];
  matchesCount: number;
  wager: number;
  multiplier: number;
  payout: number;
  isWin: boolean;
  status: 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

const KenoBetSchema = new Schema<IKenoBet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    spots: {
      type: [Number],
      required: true,
    },
    drawnNumbers: {
      type: [Number],
      required: true,
    },
    matchedNumbers: {
      type: [Number],
      default: [],
    },
    matchesCount: {
      type: Number,
      default: 0,
    },
    wager: {
      type: Number,
      required: true,
    },
    multiplier: {
      type: Number,
      default: 0,
    },
    payout: {
      type: Number,
      default: 0,
    },
    isWin: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'CANCELLED'],
      default: 'COMPLETED',
    },
  },
  {
    timestamps: true,
  }
);

KenoBetSchema.index({ userId: 1, createdAt: -1 });

export const KenoBet = mongoose.model<IKenoBet>('KenoBet', KenoBetSchema);
