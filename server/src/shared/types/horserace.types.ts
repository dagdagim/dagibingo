export type HorseRaceStatus = 'BETTING' | 'RACING' | 'FINISHED';
export type HorseBetType = 'WIN' | 'PLACE' | 'EXACTA';

export interface IHorse {
  number: number;
  name: string;
  color: string;
  winOdds: number;
  placeOdds: number;
  form: string;
  avatar: string;
}

export interface IHorseProgress {
  horseNumber: number;
  position: number; // 0 to 100 percentage of track
  speed: number;
}

export interface IHorseRaceRoundDTO {
  id: string;
  roundNumber: number;
  status: HorseRaceStatus;
  horses: IHorse[];
  positions: Record<number, number>;
  winner: number | null;
  podium: number[];
  hash: string;
  serverSeed?: string;
  commentary: string;
  countdownSeconds: number;
  totalBets: number;
  startedAt: string;
}

export interface IHorseRaceBetDTO {
  id: string;
  roundNumber: number;
  userId: string;
  username: string;
  betType: HorseBetType;
  horseNumber: number;
  secondHorseNumber?: number;
  betAmount: number;
  odds: number;
  payoutAmount: number;
  status: 'PENDING' | 'WON' | 'LOST' | 'CANCELLED';
  createdAt: string;
}

export interface HorseRaceStatsDTO {
  totalRaces: number;
  totalBets: number;
  highestPayout: number;
  recentWinners: {
    roundNumber: number;
    winnerNumber: number;
    winnerName: string;
    odds: number;
  }[];
}
