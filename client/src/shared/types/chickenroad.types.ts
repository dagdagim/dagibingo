export type ChickenRoadDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME' | 'NIGHTMARE';
export type ChickenRoadGameStatus = 'IN_PROGRESS' | 'CASHED_OUT' | 'CRUSHED';
export type ChickenRoadTileType = 'SAFE' | 'CAR' | 'HIDDEN';

export interface IChickenRoadDifficultyConfig {
  name: ChickenRoadDifficulty;
  label: string;
  tilesPerRow: number; // e.g. 4 lanes
  safePerRow: number;
  carsPerRow: number;
  multipliers: number[];
}

export interface IChickenRoadRowState {
  rowIndex: number;
  tiles: ChickenRoadTileType[];
  selectedTileIndex?: number;
}

export interface IChickenRoadGameDTO {
  id: string;
  userId: string;
  username: string;
  difficulty: ChickenRoadDifficulty;
  betAmount: number;
  currentRow: number; // 0 to 9 (10 total roads)
  currentMultiplier: number;
  status: ChickenRoadGameStatus;
  payoutAmount: number;
  rows: IChickenRoadRowState[];
  hash: string;
  serverSeed?: string;
  clientSeed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IChickenRoadStartRequest {
  difficulty: ChickenRoadDifficulty;
  betAmount: number;
}

export interface IChickenRoadStepRequest {
  gameId: string;
  tileIndex: number;
}

export interface IChickenRoadCashoutRequest {
  gameId: string;
}

export interface IChickenRoadHistoryDTO {
  id: string;
  difficulty: ChickenRoadDifficulty;
  betAmount: number;
  reachedRow: number;
  multiplier: number;
  payoutAmount: number;
  status: ChickenRoadGameStatus;
  createdAt: string;
}
