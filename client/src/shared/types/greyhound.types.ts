export type GreyhoundRaceStatus = 'BETTING' | 'RACING' | 'FINISHED';
export type GreyhoundBetType = 'WIN' | 'PLACE' | 'EXACTA';

export interface IGreyhound {
  trapNumber: number;
  name: string;
  color: string;
  vestColor: string;
  vestTextColor: string;
  winOdds: number;
  placeOdds: number;
  form: string;
  avatar: string;
}

export interface IGreyhoundRoundDTO {
  id: string;
  roundNumber: number;
  status: GreyhoundRaceStatus;
  dogs: IGreyhound[];
  positions: Record<number, number>;
  harePosition: number;
  winner: number | null;
  podium: number[];
  hash: string;
  serverSeed?: string;
  commentary: string;
  countdownSeconds: number;
  totalBets: number;
  startedAt: string;
}

export interface IGreyhoundBetDTO {
  id: string;
  roundNumber: number;
  userId: string;
  username: string;
  betType: GreyhoundBetType;
  trapNumber: number;
  secondTrapNumber?: number;
  betAmount: number;
  odds: number;
  payoutAmount: number;
  status: 'PENDING' | 'WON' | 'LOST' | 'CANCELLED';
  createdAt: string;
}

export interface GreyhoundStatsDTO {
  totalRaces: number;
  totalBets: number;
  highestPayout: number;
  recentWinners: {
    roundNumber: number;
    trapNumber: number;
    dogName: string;
    odds: number;
  }[];
}
