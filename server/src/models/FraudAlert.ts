import mongoose, { Schema, Document } from 'mongoose';

export interface IFraudAlert extends Document {
  userId: mongoose.Types.ObjectId;
  username: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  status: 'OPEN' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  metadata?: Record<string, unknown>;
  detectedAt: Date;
  resolvedById?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
}

const FraudAlertSchema = new Schema<IFraudAlert>(
  {
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
    type: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'LOW',
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'REVIEWED', 'RESOLVED', 'DISMISSED'],
      default: 'OPEN',
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    detectedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const FraudAlert = mongoose.model<IFraudAlert>('FraudAlert', FraudAlertSchema);
