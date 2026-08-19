import mongoose, { Schema, Document } from 'mongoose';
import { HorseRaceStatus, IHorse } from '../shared';

export interface IHorseRaceRound extends Document {
  _id: mongoose.Types.ObjectId;
  roundNumber: number;
  status: HorseRaceStatus;
  horses: IHorse[];
  winner: number | null; // horseNumber (1..6)
  podium: number[]; // [1st, 2nd, 3rd]
  hash: string;
  seed: string;
  commentary: string;
  countdownSeconds: number;
  totalBets: number;
  totalPayout: number;
  startedAt: Date;
  raceStartedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HorseRaceRoundSchema = new Schema<IHorseRaceRound>(
  {
    roundNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['BETTING', 'RACING', 'FINISHED'],
      required: true,
      default: 'BETTING',
      index: true,
    },
    horses: [
      {
        number: { type: Number, required: true },
        name: { type: String, required: true },
        color: { type: String, required: true },
        winOdds: { type: Number, required: true },
        placeOdds: { type: Number, required: true },
        form: { type: String, required: true },
        avatar: { type: String, required: true },
      },
    ],
    winner: {
      type: Number,
      default: null,
    },
    podium: {
      type: [Number],
      default: [],
    },
    hash: {
      type: String,
      required: true,
    },
    seed: {
      type: String,
      required: true,
    },
    commentary: {
      type: String,
      default: 'Horses are lining up at the starting gate!',
    },
    countdownSeconds: {
      type: Number,
      default: 15,
    },
    totalBets: {
      type: Number,
      default: 0,
    },
    totalPayout: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    raceStartedAt: {
      type: Date,
    },
    finishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

HorseRaceRoundSchema.index({ status: 1, createdAt: -1 });

export const HorseRaceRound = mongoose.model<IHorseRaceRound>('HorseRaceRound', HorseRaceRoundSchema);
