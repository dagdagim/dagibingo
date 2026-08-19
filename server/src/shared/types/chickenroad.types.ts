export type ChickenRoadDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'DAREDEVIL';
export type ChickenRoadGameStatus = 'IN_PROGRESS' | 'CASHED_OUT' | 'CRASHED';

export interface IChickenRoadDifficultyConfig {
  name: ChickenRoadDifficulty;
  label: string;
  totalLanes: number;
  safeProbability: number;
  multipliers: number[];
}

export interface IChickenRoadGameDTO {
  id: string;
  userId: string;
  username: string;
  difficulty: ChickenRoadDifficulty;
  betAmount: number;
  currentLane: number; // 0 to totalLanes - 1
  currentMultiplier: number;
  status: ChickenRoadGameStatus;
  payoutAmount: number;
  revealedLanes: {
    laneIndex: number;
    isSafe: boolean;
  }[];
  hash: string;
  serverSeed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IChickenRoadStartRequest {
  difficulty: ChickenRoadDifficulty;
  betAmount: number;
}

export interface IChickenRoadStepRequest {
  gameId: string;
}

export interface IChickenRoadCashoutRequest {
  gameId: string;
}

export interface ChickenRoadHistoryDTO {
  id: string;
  difficulty: ChickenRoadDifficulty;
  betAmount: number;
  reachedLane: number;
  multiplier: number;
  payoutAmount: number;
  status: ChickenRoadGameStatus;
  createdAt: string;
}
