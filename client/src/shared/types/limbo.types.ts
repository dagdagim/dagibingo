export type LimboBetStatus = 'WON' | 'LOST';

export interface ILimboBetDTO {
  id: string;
  userId: string;
  username: string;
  betAmount: number;
  targetMultiplier: number;
  resultMultiplier: number;
  winChance: number;
  payoutAmount: number;
  status: LimboBetStatus;
  hash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  createdAt: string;
}

export interface ILimboBetRequest {
  betAmount: number;
  targetMultiplier: number;
  clientSeed?: string;
}

export interface LimboStatsDTO {
  totalBets: number;
  totalWon: number;
  highestMultiplier: number;
  highestPayout: number;
  recentBets: {
    id: string;
    username: string;
    targetMultiplier: number;
    resultMultiplier: number;
    payoutAmount: number;
    status: LimboBetStatus;
    createdAt: string;
  }[];
}
