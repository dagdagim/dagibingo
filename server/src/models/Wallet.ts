import mongoose, { Schema, Document } from 'mongoose';

export interface IWallet extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  availableBalance: number;
  lockedBalance: number;
  bonusBalance: number;
  currency: string;
  isDemo: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    availableBalance: {
      type: Number,
      required: true,
      default: 1000, // Initial demo starting balance
      min: 0,
    },
    lockedBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    bonusBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'ETB',
    },
    isDemo: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Wallet = mongoose.model<IWallet>('Wallet', WalletSchema);
