import mongoose, { Schema, Document } from 'mongoose';
import { KycStatus } from '../shared';

export interface IKycRecord extends Document {
  userId: mongoose.Types.ObjectId;
  documentType: string;
  documentNumber: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
  status: KycStatus;
  reviewedById?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KycRecordSchema = new Schema<IKycRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      required: true,
      enum: ['PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE'],
    },
    documentNumber: {
      type: String,
      required: true,
    },
    documentFrontUrl: {
      type: String,
    },
    documentBackUrl: {
      type: String,
    },
    selfieUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    reviewedById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const KycRecord = mongoose.model<IKycRecord>('KycRecord', KycRecordSchema);
