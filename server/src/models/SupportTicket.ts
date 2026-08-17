import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportTicket extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  category: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  replies: {
    senderId: mongoose.Types.ObjectId;
    senderRole: string;
    message: string;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['GAME_ISSUE', 'WALLET_TRANSACTION', 'ACCOUNT', 'KYC', 'OTHER'],
      default: 'GAME_ISSUE',
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
    },
    replies: [
      {
        senderId: { type: Schema.Types.ObjectId, ref: 'User' },
        senderRole: { type: String, default: 'USER' },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
