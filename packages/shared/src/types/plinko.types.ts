export type PlinkoRisk = 'LOW' | 'MEDIUM' | 'HIGH';
export type PlinkoRows = 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

/**
 * Standard Plinko Paytable Matrix indexed by [rows][risk]
 * The array contains multiplier values for each landing bucket from left to right (rows + 1 buckets)
 */
export const PLINKO_PAYTABLES: Record<number, Record<PlinkoRisk, number[]>> = {
  8: {
    LOW: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    MEDIUM: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    HIGH: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
  },
  9: {
    LOW: [5.6, 2.0, 1.6, 1.0, 0.7, 0.7, 1.0, 1.6, 2.0, 5.6],
    MEDIUM: [18, 4, 1.7, 0.9, 0.5, 0.5, 0.9, 1.7, 4, 18],
    HIGH: [43, 7, 2, 0.6, 0.2, 0.2, 0.6, 2, 7, 43],
  },
  10: {
    LOW: [8.9, 3, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3, 8.9],
    MEDIUM: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
    HIGH: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76],
  },
  11: {
    LOW: [8.4, 3, 1.9, 1.3, 1.0, 0.7, 0.7, 1.0, 1.3, 1.9, 3, 8.4],
    MEDIUM: [24, 6, 3, 1.8, 0.7, 0.5, 0.5, 0.7, 1.8, 3, 6, 24],
    HIGH: [120, 14, 5.2, 1.4, 0.4, 0.2, 0.2, 0.4, 1.4, 5.2, 14, 120],
  },
  12: {
    LOW: [10, 3, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3, 10],
    MEDIUM: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    HIGH: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
  },
  13: {
    LOW: [8.1, 4, 2.5, 1.5, 1.2, 1.0, 0.7, 0.7, 1.0, 1.2, 1.5, 2.5, 4, 8.1],
    MEDIUM: [43, 13, 6, 3, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 3, 6, 13, 43],
    HIGH: [260, 37, 11, 4, 1, 0.2, 0.2, 0.2, 0.2, 1, 4, 11, 37, 260],
  },
  14: {
    LOW: [7.1, 4, 1.9, 1.4, 1.3, 1.1, 1.0, 0.5, 1.0, 1.1, 1.3, 1.4, 1.9, 4, 7.1],
    MEDIUM: [58, 15, 7, 4, 1.9, 1.0, 0.5, 0.2, 0.5, 1.0, 1.9, 4, 7, 15, 58],
    HIGH: [420, 56, 18, 5, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5, 18, 56, 420],
  },
  15: {
    LOW: [15, 8, 3, 2, 1.5, 1.1, 1.0, 0.7, 0.7, 1.0, 1.1, 1.5, 2, 3, 8, 15],
    MEDIUM: [88, 18, 11, 5, 3, 1.3, 0.5, 0.3, 0.3, 0.5, 1.3, 3, 5, 11, 18, 88],
    HIGH: [620, 83, 27, 8, 3, 0.5, 0.2, 0.2, 0.2, 0.2, 0.5, 3, 8, 27, 83, 620],
  },
  16: {
    LOW: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    MEDIUM: [110, 41, 10, 5, 3, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3, 5, 10, 41, 110],
    HIGH: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
};

export const PLINKO_PRESET_BETS = [1, 5, 10, 25, 50, 100, 250, 500];

export interface PlinkoDropInput {
  betAmount: number;
  rows: PlinkoRows;
  risk: PlinkoRisk;
}

export interface PlinkoBatchDropInput {
  betAmount: number;
  count: number; // 1 to 20 balls
  rows: PlinkoRows;
  risk: PlinkoRisk;
}

export interface PlinkoDropResult {
  id: string;
  userId?: string | null;
  betAmount: number;
  rows: PlinkoRows;
  risk: PlinkoRisk;
  path: number[]; // 0 = left, 1 = right bounce
  bucketIndex: number;
  multiplier: number;
  payoutAmount: number;
  status: 'WON' | 'LOST';
  newBalance?: number;
  createdAt: string;
}

export interface PlinkoStats {
  totalDrops: number;
  totalWagered: number;
  totalWon: number;
  highestWin: number;
  highestMultiplier: number;
  recentDrops: PlinkoDropResult[];
}
