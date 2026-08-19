export type TowersDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME' | 'NIGHTMARE';
export type TowersGameStatus = 'IN_PROGRESS' | 'CASHED_OUT' | 'BUSTED';

export type TowersTileType = 'GEM' | 'SKULL' | 'HIDDEN';

export interface ITowersDifficultyConfig {
  name: TowersDifficulty;
  label: string;
  tilesPerRow: number;
  gemsPerRow: number;
  skullsPerRow: number;
  multipliers: number[];
}

export interface ITowersRowState {
  rowIndex: number;
  tiles: TowersTileType[];
  selectedTileIndex?: number;
}

export interface ITowersGameDTO {
  id: string;
  userId: string;
  username: string;
  difficulty: TowersDifficulty;
  betAmount: number;
  currentRow: number; // 0 to 8 (9 total rows)
  currentMultiplier: number;
  status: TowersGameStatus;
  payoutAmount: number;
  rows: ITowersRowState[];
  hash: string;
  serverSeed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ITowersStartRequest {
  difficulty: TowersDifficulty;
  betAmount: number;
}

export interface ITowersStepRequest {
  gameId: string;
  tileIndex: number;
}

export interface ITowersCashoutRequest {
  gameId: string;
}

export interface ITowersHistoryDTO {
  id: string;
  difficulty: TowersDifficulty;
  betAmount: number;
  reachedRow: number;
  multiplier: number;
  payoutAmount: number;
  status: TowersGameStatus;
  createdAt: string;
}
