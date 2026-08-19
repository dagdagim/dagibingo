export type AviatorRoundStatus = 'BETTING' | 'FLYING' | 'CRASHED';

export type AviatorBetStatus = 'ACTIVE' | 'CASHED_OUT' | 'CRASHED' | 'CANCELLED';

export interface AviatorRound {
  id: string;
  roundNumber: number;
  status: AviatorRoundStatus;
  crashMultiplier: number;
  hash: string;
  seed: string;
  startTime?: string;
  crashedAt?: string;
  totalBets: number;
  totalPayout: number;
  countdownSeconds?: number;
}

export interface AviatorBet {
  id: string;
  roundNumber: number;
  userId: string;
  username: string;
  panelIndex: 0 | 1;
  betAmount: number;
  autoCashoutMultiplier?: number;
  cashedOutMultiplier?: number;
  payoutAmount: number;
  status: AviatorBetStatus;
  createdAt: string;
  cashedOutAt?: string;
}

export interface AviatorPlaceBetDTO {
  panelIndex: 0 | 1;
  betAmount: number;
  autoCashoutMultiplier?: number;
}

export interface AviatorCancelBetDTO {
  panelIndex: 0 | 1;
}

export interface AviatorCashoutDTO {
  panelIndex: 0 | 1;
}

export interface AviatorLiveTickPayload {
  roundNumber: number;
  multiplier: number;
  elapsedMs: number;
  status: AviatorRoundStatus;
  crashMultiplier?: number; // Only sent when status is 'CRASHED'
}

export interface AviatorRoundStatePayload {
  round: AviatorRound;
  recentMultipliers: number[];
  activeBets: AviatorBet[];
  myBets: AviatorBet[];
  currentMultiplier?: number;
}

export interface AviatorStatsDTO {
  totalRounds: number;
  totalBets: number;
  highestMultiplier: number;
  highestPayout: number;
  recentMultipliers: number[];
}
