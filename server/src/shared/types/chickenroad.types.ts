export type ChickenRoadDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'DAREDEVIL';
export type ChickenRoadGameStatus = 'IN_PROGRESS' | 'CASHED_OUT' | 'CRASHED';
export type ChickenSkinType = 'CLASSIC' | 'BABY' | 'ROYAL' | 'NINJA' | 'COWBOY' | 'SPACE' | 'GOLDEN';
export type ChickenStageTheme = 'COUNTRY' | 'HIGHWAY' | 'CITY' | 'NIGHT' | 'SPEEDWAY';

export interface IChickenSkinConfig {
  id: ChickenSkinType;
  name: string;
  emoji: string;
  description: string;
  color: string;
  unlockedAtMultiplier: number;
}

export interface IChickenRoadGameDTO {
  id: string;
  userId: string;
  username: string;
  difficulty: ChickenRoadDifficulty;
  skin: ChickenSkinType;
  betAmount: number;
  currentRoad: number; // 0 to 25
  currentMultiplier: number;
  autoStopMultiplier?: number;
  status: ChickenRoadGameStatus;
  payoutAmount: number;
  stageTheme: ChickenStageTheme;
  revealedRoads: {
    roadIndex: number;
    isSafe: boolean;
  }[];
  hash: string;
  serverSeed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IChickenRoadStartRequest {
  difficulty?: ChickenRoadDifficulty;
  skin?: ChickenSkinType;
  betAmount: number;
  autoStopMultiplier?: number;
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
  skin: ChickenSkinType;
  betAmount: number;
  reachedRoad: number;
  multiplier: number;
  payoutAmount: number;
  status: ChickenRoadGameStatus;
  createdAt: string;
}

export interface ChickenLiveRunDTO {
  id: string;
  username: string;
  skin: ChickenSkinType;
  currentRoad: number;
  multiplier: number;
  status: 'ACTIVE' | 'WON' | 'CRASHED';
  payoutAmount: number;
  timestamp: string;
}
