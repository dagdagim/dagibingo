export type KenoRoundStatus = 'BETTING' | 'DRAWING' | 'SETTLING' | 'COMPLETED';

export type KenoTicketStatus = 'PENDING' | 'WON' | 'LOST';

export interface KenoRound {
  _id: string;
  roundNumber: number;
  status: KenoRoundStatus;
  drawnNumbers: number[];
  currentBallIndex: number;
  totalBets: number;
  totalPayouts: number;
  countdownSeconds: number;
  startedAt?: string;
  endedAt?: string;
  nextRoundAt?: string;
}

export interface KenoTicket {
  _id: string;
  userId: string;
  roundId?: string;
  roundNumber?: number;
  selectedNumbers: number[];
  spotsCount: number;
  betAmount: number;
  drawnNumbers: number[];
  matchedNumbers: number[];
  hitsCount: number;
  multiplier: number;
  payoutAmount: number;
  status: KenoTicketStatus;
  isQuickPlay?: boolean;
  createdAt: string;
}

export interface KenoStats {
  totalDraws: number;
  hotNumbers: { number: number; frequency: number }[];
  coldNumbers: { number: number; frequency: number }[];
  lastDraws: {
    roundNumber: number;
    numbers: number[];
    timestamp: string;
  }[];
}

/**
 * Standard Keno Paytable Matrix
 * Format: KENO_PAYTABLE[spotsChosen][hitsCount] = multiplier
 */
export const KENO_PAYTABLE: Record<number, Record<number, number>> = {
  1: {
    1: 3.5,
  },
  2: {
    1: 1.0,
    2: 12.0,
  },
  3: {
    2: 2.0,
    3: 45.0,
  },
  4: {
    2: 1.0,
    3: 5.0,
    4: 120.0,
  },
  5: {
    3: 3.0,
    4: 20.0,
    5: 600.0,
  },
  6: {
    3: 2.0,
    4: 6.0,
    5: 60.0,
    6: 1800.0,
  },
  7: {
    3: 1.0,
    4: 3.0,
    5: 20.0,
    6: 120.0,
    7: 5000.0,
  },
  8: {
    4: 3.0,
    5: 12.0,
    6: 70.0,
    7: 600.0,
    8: 15000.0,
  },
  9: {
    4: 2.0,
    5: 6.0,
    6: 30.0,
    7: 150.0,
    8: 1500.0,
    9: 30000.0,
  },
  10: {
    0: 2.0, // Special bonus: 0 hits on 10 picks gives 2x
    5: 5.0,
    6: 22.0,
    7: 100.0,
    8: 800.0,
    9: 4000.0,
    10: 50000.0,
  },
};

export const KENO_PRESET_BETS = [5, 10, 25, 50, 100, 250, 500];
export const KENO_TOTAL_NUMBERS = 80;
export const KENO_DRAW_COUNT = 20;
export const KENO_MIN_SPOTS = 1;
export const KENO_MAX_SPOTS = 10;
