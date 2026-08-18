export interface KenoPaytable {
  [spotsCount: number]: {
    [hitsCount: number]: number; // multiplier e.g. 5 hits out of 5 spots = 500x
  };
}

export const KENO_PAYTABLE: KenoPaytable = {
  1: { 1: 3 },
  2: { 2: 12 },
  3: { 2: 2, 3: 42 },
  4: { 2: 1, 3: 5, 4: 120 },
  5: { 3: 3, 4: 15, 5: 500 },
  6: { 3: 2, 4: 8, 5: 80, 6: 1500 },
  7: { 3: 1, 4: 4, 5: 20, 6: 300, 7: 4000 },
  8: { 4: 3, 5: 12, 6: 75, 7: 800, 8: 10000 },
  9: { 4: 2, 5: 6, 6: 30, 7: 250, 8: 2500, 9: 15000 },
  10: { 0: 2, 5: 5, 6: 20, 7: 80, 8: 500, 9: 4000, 10: 25000 },
};

export interface KenoPlayInput {
  spots: number[]; // 1-10 numbers between 1 and 80
  wager: number; // min 1 ETB
}

export interface KenoPlayResult {
  betId: string;
  spots: number[];
  drawnNumbers: number[];
  matchedNumbers: number[];
  matchesCount: number;
  wager: number;
  multiplier: number;
  payout: number;
  isWin: boolean;
  balance: {
    availableBalance: number;
    lockedBalance: number;
    bonusBalance: number;
    totalBalance: number;
  };
  createdAt: string;
}

export interface KenoHistoryItem {
  id: string;
  spots: number[];
  drawnNumbers: number[];
  matchedNumbers: number[];
  matchesCount: number;
  wager: number;
  multiplier: number;
  payout: number;
  isWin: boolean;
  createdAt: string;
}

export interface KenoStats {
  totalRounds: number;
  hotNumbers: { number: number; count: number }[];
  coldNumbers: { number: number; count: number }[];
}
