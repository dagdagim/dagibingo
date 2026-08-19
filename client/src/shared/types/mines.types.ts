export type MinesStatus = 'IN_PROGRESS' | 'CASHED_OUT' | 'EXPLODED';

export interface MinesTile {
  index: number;
  isRevealed: boolean;
  hasMine?: boolean;
}

export interface IMinesGameDTO {
  id: string;
  userId: string;
  betAmount: number;
  mineCount: number;
  revealedTiles: number[];
  currentMultiplier: number;
  nextMultiplier: number;
  payoutAmount: number;
  status: MinesStatus;
  hash: string;
  serverSeed?: string;
  clientSeed: string;
  nonce: number;
  createdAt: string;
  grid?: boolean[]; // 25 booleans (true = mine), only provided when game is finished
}

export interface MinesHistoryItem {
  id: string;
  betAmount: number;
  mineCount: number;
  revealedCount: number;
  multiplier: number;
  payoutAmount: number;
  status: MinesStatus;
  createdAt: string;
}

export interface MinesStatsDTO {
  totalGames: number;
  totalWon: number;
  highestMultiplier: number;
  highestPayout: number;
}
