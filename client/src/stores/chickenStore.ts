import { create } from 'zustand';
import { api } from '../services/api';
import { useAuthStore } from './authStore';
import { useWalletStore } from './walletStore';
import {
  ChickenDifficulty,
  IChickenGameDTO,
  ChickenHistoryDTO,
  IChickenDifficultyConfig,
} from '../shared';

export const CHICKEN_DIFFICULTY_DATA: Record<ChickenDifficulty, IChickenDifficultyConfig> = {
  EASY: {
    name: 'EASY',
    label: 'Country Trail (24 Lanes • Low Risk)',
    totalLanes: 24,
    safeChance: 0.958,
    multipliers: [
      1.01, 1.05, 1.1, 1.15, 1.2, 1.25, 1.31, 1.37, 1.43, 1.5, 1.57, 1.65, 1.74, 1.83, 1.94, 2.05,
      2.18, 2.32, 2.49, 2.68, 2.92, 3.22, 3.65, 4.45,
    ],
  },
  MEDIUM: {
    name: 'MEDIUM',
    label: 'Highway Sprint (18 Lanes • Medium Risk)',
    totalLanes: 18,
    safeChance: 0.833,
    multipliers: [
      1.16, 1.39, 1.67, 2.01, 2.41, 2.89, 3.47, 4.16, 5.0, 6.0, 7.2, 8.64, 10.37, 12.44, 14.93,
      17.92, 21.5, 25.8,
    ],
  },
  HARD: {
    name: 'HARD',
    label: 'Expressway Madness (12 Lanes • High Risk)',
    totalLanes: 12,
    safeChance: 0.667,
    multipliers: [1.45, 2.18, 3.27, 4.91, 7.36, 11.04, 16.56, 24.84, 37.26, 55.89, 83.84, 125.75],
  },
  DAREDEVIL: {
    name: 'DAREDEVIL',
    label: 'Barbecue Inferno (10 Lanes • Extreme Risk)',
    totalLanes: 10,
    safeChance: 0.5,
    multipliers: [1.94, 3.88, 7.76, 15.52, 31.04, 62.08, 124.16, 248.32, 496.64, 993.28],
  },
};

interface ChickenState {
  game: IChickenGameDTO | null;
  difficulty: ChickenDifficulty;
  betAmount: number;
  isLoading: boolean;
  isStepping: boolean;
  isCashingOut: boolean;
  lastOutcome: 'SAFE' | 'HAZARD' | 'GOLDEN_EGG_WIN' | null;
  history: ChickenHistoryDTO[];
  soundEnabled: boolean;
  error: string | null;

  setDifficulty: (difficulty: ChickenDifficulty) => void;
  setBetAmount: (amount: number) => void;
  toggleSound: () => void;
  setError: (error: string | null) => void;

  fetchActiveGame: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  startGame: () => Promise<void>;
  stepForward: () => Promise<string | null>;
  cashout: () => Promise<void>;
}

export const useChickenStore = create<ChickenState>((set, get) => ({
  game: null,
  difficulty: 'MEDIUM',
  betAmount: 10,
  isLoading: false,
  isStepping: false,
  isCashingOut: false,
  lastOutcome: null,
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
      const res = await api.get<any>('/chicken/active');
      const data = res?.data || res;
      if (data?.game) {
        set({ game: data.game, difficulty: data.game.difficulty, betAmount: data.game.betAmount });
      }
    } catch {
      // Ignore
    }
  },

  fetchHistory: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const res = await api.get<any>('/chicken/my-history?limit=25');
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
      set({ error: 'Please log in to play Chicken Run.' });
      return;
    }

    set({ isLoading: true, error: null, lastOutcome: null });

    try {
      const res = await api.post<any>('/chicken/start', {
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
        error: err?.response?.data?.message || err?.message || 'Failed to start Chicken Run.',
      });
    }
  },

  stepForward: async () => {
    const { game, isStepping } = get();
    if (!game || game.status !== 'IN_PROGRESS' || isStepping) return null;

    set({ isStepping: true, error: null });

    try {
      const res = await api.post<any>('/chicken/step', {
        gameId: game.id,
      });

      const data = res?.data || res;
      if (data?.newBalance !== undefined) {
        useWalletStore.getState().updateBalanceLocally(data.newBalance);
        useWalletStore.getState().fetchBalance();
      }

      if (data?.game) {
        set({
          game: data.game,
          isStepping: false,
          lastOutcome: data.outcome || null,
        });

        if (data.game.status !== 'IN_PROGRESS') {
          get().fetchHistory();
        }

        return data.outcome;
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
      const res = await api.post<any>('/chicken/cashout', {
        gameId: game.id,
      });

      const data = res?.data || res;
      if (data?.newBalance !== undefined) {
        useWalletStore.getState().updateBalanceLocally(data.newBalance);
        useWalletStore.getState().fetchBalance();
      }

      if (data?.game) {
        set({
          game: data.game,
          isCashingOut: false,
          lastOutcome: 'GOLDEN_EGG_WIN',
        });
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
