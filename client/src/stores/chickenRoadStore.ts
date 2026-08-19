import { create } from 'zustand';
import { api } from '../services/api';
import { useAuthStore } from './authStore';
import { useWalletStore } from './walletStore';
import {
  ChickenRoadDifficulty,
  IChickenRoadGameDTO,
  ChickenRoadHistoryDTO,
  IChickenRoadDifficultyConfig,
} from '../shared';

export const CHICKEN_ROAD_DIFFICULTY_DATA: Record<ChickenRoadDifficulty, IChickenRoadDifficultyConfig> = {
  EASY: {
    name: 'EASY',
    label: 'Country Road (95% Safe/Lane)',
    totalLanes: 25,
    safeProbability: 0.95,
    multipliers: [
      1.02, 1.07, 1.13, 1.19, 1.25, 1.32, 1.39, 1.46, 1.54, 1.62,
      1.71, 1.80, 1.90, 2.00, 2.11, 2.22, 2.34, 2.47, 2.60, 2.74,
      2.89, 3.05, 3.22, 3.40, 3.59,
    ],
  },
  MEDIUM: {
    name: 'MEDIUM',
    label: 'City Avenue (85% Safe/Lane)',
    totalLanes: 25,
    safeProbability: 0.85,
    multipliers: [
      1.14, 1.34, 1.58, 1.86, 2.19, 2.57, 3.03, 3.56, 4.19, 4.93,
      5.80, 6.82, 8.03, 9.45, 11.12, 13.08, 15.39, 18.11, 21.31, 25.07,
      29.49, 34.69, 40.81, 48.01, 56.48,
    ],
  },
  HARD: {
    name: 'HARD',
    label: 'Interstate Highway (70% Safe/Lane)',
    totalLanes: 25,
    safeProbability: 0.7,
    multipliers: [
      1.38, 1.98, 2.82, 4.04, 5.77, 8.24, 11.77, 16.82, 24.03, 34.33,
      49.04, 70.06, 100.08, 142.98, 204.25, 291.79, 416.84, 595.49, 850.70, 1215.28,
      1736.12, 2480.17, 3543.10, 5061.57, 7230.82,
    ],
  },
  DAREDEVIL: {
    name: 'DAREDEVIL',
    label: 'Speedway Rush (50% Safe/Lane)',
    totalLanes: 20,
    safeProbability: 0.5,
    multipliers: [
      1.94, 3.88, 7.76, 15.52, 31.04, 62.08, 124.16, 248.32, 496.64, 993.28,
      1986.56, 3973.12, 7946.24, 15892.48, 31784.96, 63569.92, 127139.84, 254279.68, 508559.36, 1017118.72,
    ],
  },
};

interface ChickenRoadState {
  game: IChickenRoadGameDTO | null;
  difficulty: ChickenRoadDifficulty;
  betAmount: number;
  isLoading: boolean;
  isStepping: boolean;
  isCashingOut: boolean;
  history: ChickenRoadHistoryDTO[];
  soundEnabled: boolean;
  error: string | null;

  setDifficulty: (difficulty: ChickenRoadDifficulty) => void;
  setBetAmount: (amount: number) => void;
  toggleSound: () => void;
  setError: (error: string | null) => void;

  fetchActiveGame: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  startGame: () => Promise<void>;
  stepForward: () => Promise<'SAFE' | 'CRASHED' | 'FULL_CROSS_WIN' | null>;
  cashout: () => Promise<void>;
}

export const useChickenRoadStore = create<ChickenRoadState>((set, get) => ({
  game: null,
  difficulty: 'EASY',
  betAmount: 10,
  isLoading: false,
  isStepping: false,
  isCashingOut: false,
  history: [],
  soundEnabled: true,
  error: null,

  setDifficulty: (difficulty) => {
    if (get().game && get().game?.status === 'IN_PROGRESS') return;
    set({ difficulty });
  },

  setBetAmount: (amount) => {
    if (get().game && get().game?.status === 'IN_PROGRESS') return;
    set({ betAmount: Math.max(0.5, Math.min(10000, amount)) });
  },

  toggleSound: () => {
    set((state) => ({ soundEnabled: !state.soundEnabled }));
  },

  setError: (error) => {
    set({ error });
  },

  fetchActiveGame: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const res = await api.get<any>('/chickenroad/active');
      const data = res?.data || res;
      if (data?.game) {
        set({
          game: data.game,
          difficulty: data.game.difficulty,
          betAmount: data.game.betAmount,
        });
      }
    } catch {
      // Ignore
    }
  },

  fetchHistory: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const res = await api.get<any>('/chickenroad/my-history?limit=25');
      const data = res?.data || res;
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      set({ history: list });
    } catch {
      // Ignore
    }
  },

  startGame: async () => {
    const { difficulty, betAmount, isLoading } = get();
    if (isLoading) return;

    const token = useAuthStore.getState().token;
    if (!token) {
      set({ error: 'Please log in to play Chicken Road.' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const res = await api.post<any>('/chickenroad/start', {
        difficulty,
        betAmount,
      });

      const data = res?.data || res;
      if (data?.newBalance !== undefined) {
        useWalletStore.getState().updateBalanceLocally(data.newBalance);
        useWalletStore.getState().fetchBalance();
      }

      if (data?.game) {
        set({ game: data.game, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.response?.data?.message || err?.message || 'Failed to start Chicken Road run.',
      });
    }
  },

  stepForward: async () => {
    const { game, isStepping } = get();
    if (!game || game.status !== 'IN_PROGRESS' || isStepping) return null;

    set({ isStepping: true, error: null });

    try {
      const res = await api.post<any>('/chickenroad/step', {
        gameId: game.id,
      });

      const data = res?.data || res;
      if (data?.newBalance !== undefined) {
        useWalletStore.getState().updateBalanceLocally(data.newBalance);
        useWalletStore.getState().fetchBalance();
      }

      if (data?.game) {
        set({ game: data.game, isStepping: false });
        if (data.game.status !== 'IN_PROGRESS') {
          get().fetchHistory();
        }
        return data.outcome || null;
      } else {
        set({ isStepping: false });
        return null;
      }
    } catch (err: any) {
      set({
        isStepping: false,
        error: err?.response?.data?.message || err?.message || 'Failed to step across lane.',
      });
      return null;
    }
  },

  cashout: async () => {
    const { game, isCashingOut } = get();
    if (!game || game.status !== 'IN_PROGRESS' || isCashingOut) return;

    set({ isCashingOut: true, error: null });

    try {
      const res = await api.post<any>('/chickenroad/cashout', {
        gameId: game.id,
      });

      const data = res?.data || res;
      if (data?.newBalance !== undefined) {
        useWalletStore.getState().updateBalanceLocally(data.newBalance);
        useWalletStore.getState().fetchBalance();
      }

      if (data?.game) {
        set({ game: data.game, isCashingOut: false });
        get().fetchHistory();
      } else {
        set({ isCashingOut: false });
      }
    } catch (err: any) {
      set({
        isCashingOut: false,
        error: err?.response?.data?.message || err?.message || 'Failed to cash out.',
      });
    }
  },
}));
