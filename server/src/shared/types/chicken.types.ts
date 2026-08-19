export type ChickenDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'DAREDEVIL';
export type ChickenGameStatus = 'IN_PROGRESS' | 'CASHED_OUT' | 'BUSTED';
export type ChickenLaneOutcome = 'SAFE' | 'HAZARD';

export interface IChickenDifficultyConfig {
  name: ChickenDifficulty;
  label: string;
  totalLanes: number;
  safeChance: number;
  multipliers: number[];
}

export interface IChickenGameDTO {
  id: string;
  userId: string;
  username: string;
  difficulty: ChickenDifficulty;
  betAmount: number;
  currentStep: number;
  currentMultiplier: number;
  status: ChickenGameStatus;
  payoutAmount: number;
  stepHistory: { step: number; outcome: ChickenLaneOutcome; multiplier: number }[];
  totalLanes: number;
  multipliers: number[];
  hash: string;
  serverSeed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IChickenStartRequest {
  difficulty: ChickenDifficulty;
  betAmount: number;
}

export interface IChickenStepRequest {
  gameId: string;
}

export interface IChickenCashoutRequest {
  gameId: string;
}

export interface ChickenHistoryDTO {
  id: string;
  difficulty: ChickenDifficulty;
  betAmount: number;
  reachedStep: number;
  multiplier: number;
  payoutAmount: number;
  status: ChickenGameStatus;
  createdAt: string;
}
