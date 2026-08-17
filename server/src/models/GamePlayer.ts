import mongoose, { Schema, Document } from 'mongoose';

export interface IGamePlayer extends Document {
  _id: mongoose.Types.ObjectId;
  gameId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  ticketsCount: number;
  hasClaimed: boolean;
  isOnline: boolean;
  joinedAt: Date;
}

const GamePlayerSchema = new Schema<IGamePlayer>(
  {
    gameId: {
      type: Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ticketsCount: {
      type: Number,
      required: true,
      default: 1,
    },
    hasClaimed: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate joins by same user in same game
GamePlayerSchema.index({ gameId: 1, userId: 1 }, { unique: true });

export const GamePlayer = mongoose.model<IGamePlayer>('GamePlayer', GamePlayerSchema);
