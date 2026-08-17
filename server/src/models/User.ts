import mongoose, { Schema, Document } from 'mongoose';
import { UserRole, KycStatus, ResponsibleGamingLimits } from '../shared';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  phone?: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  kycStatus: KycStatus;
  country: string;
  dateOfBirth?: Date;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  refreshTokenHash?: string;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    totalWinnings: number;
    highestWin: number;
    currentStreak: number;
    bestStreak: number;
  };
  responsibleGaming: ResponsibleGamingLimits;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN', 'MODERATOR'],
      default: 'USER',
      index: true,
    },
    kycStatus: {
      type: String,
      enum: ['NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'],
      default: 'NOT_STARTED',
      index: true,
    },
    country: {
      type: String,
      required: true,
      default: 'Ethiopia',
    },
    dateOfBirth: {
      type: Date,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
    },
    stats: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      winRate: { type: Number, default: 0 },
      totalWinnings: { type: Number, default: 0 },
      highestWin: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      bestStreak: { type: Number, default: 0 },
    },
    responsibleGaming: {
      dailyDepositLimit: { type: Number },
      weeklyDepositLimit: { type: Number },
      monthlyDepositLimit: { type: Number },
      sessionTimeLimitMinutes: { type: Number },
      coolingOffUntil: { type: String, default: null },
      selfExcludedUntil: { type: String, default: null },
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
