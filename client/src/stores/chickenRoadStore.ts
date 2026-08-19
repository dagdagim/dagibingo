import { create } from 'zustand';
import { api } from '../services/api';
import { useAuthStore } from './authStore';
import { useWalletStore } from './walletStore';
import {
  ChickenRoadDifficulty,
  IChickenRoadGameDTO,
  IChickenRoadHistoryDTO,
  IChickenRoadDifficultyConfig,
} from '../shared';

export const CHICKEN_ROAD_DIFFICULTY_DATA: Record<ChickenRoadDifficulty, IChickenRoadDifficultyConfig> = {
  EASY: {
    name: 'EASY',
    label: 'Easy (3 Safe / 1 Car)',
    tilesPerRow: 4,
    safePerRow: 3,
    carsPerRow: 1,
    multipliers: [1.29, 1.72, 2.29, 3.06, 4.08, 5.44, 7.25, 9.67, 12.89, 17.18],
  },
  MEDIUM: {
    name: 'MEDIUM',
    label: 'Medium (2 Safe / 1 Car)',
    tilesPerRow: 3,
    safePerRow: 2,
    carsPerRow: 1,
    multipliers: [1.45, 2.18, 3.27, 4.91, 7.36, 11.04, 16.56, 24.84, 37.26, 55.89],
  },
  HARD: {
    name: 'HARD',
    label: 'Hard (1 Safe / 1 Car)',
    tilesPerRow: 2,
    safePerRow: 1,
    carsPerRow: 1,
    multipliers: [1.94, 3.88, 7.76, 15.52, 31.04, 62.08, 124.16, 248.32, 496.64, 993.28],
  },
  EXTREME: {
    name: 'EXTREME',
    label: 'Extreme (1 Safe / 2 Cars)',
    tilesPerRow: 3,
    safePerRow: 1,
    carsPerRow: 2,
    multipliers: [2.91, 8.73, 26.19, 78.57, 235.71, 707.13, 2121.39, 6364.17, 19092.51, 57277.53],
  },
  NIGHTMARE: {
    name: 'NIGHTMARE',
    label: 'Nightmare (1 Safe / 3 Cars)',
    tilesPerRow: 4,
    safePerRow: 1,
    carsPerRow: 3,
    multipliers: [3.88, 15.52, 62.08, 248.32, 993.28, 3973.12, 15892.48, 63569.92, 254279.68, 1017118.72],
  },
};

interface ChickenRoadState {
  game: IChickenRoadGameDTO | null;
  difficulty: ChickenRoadDifficulty;
  betAmount: number;
  isLoading: boolean;
  isStepping: boolean;
  isCashingOut: boolean;
  history: IChickenRoadHistoryDTO[];
  soundEnabled: boolean;
  error: string | null;

  setDifficulty: (difficulty: ChickenRoadDifficulty) => void;
  setBetAmount: (amount: number) => void;
  toggleSound: () => void;
  setError: (error: string | null) => void;

  fetchActiveGame: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  startGame: () => Promise<void>;
  stepTile: (tileIndex: number) => Promise<void>;
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
        error: err?.response?.data?.message || err?.message || 'Failed to start Chicken Road game.',
      });
    }
  },

  stepTile: async (tileIndex: number) => {
    const { game, isStepping } = get();
    if (!game || game.status !== 'IN_PROGRESS' || isStepping) return;

    set({ isStepping: true, error: null });

    try {
      const res = await api.post<any>('/chickenroad/step', {
        gameId: game.id,
        tileIndex,
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
      } else {
        set({ isStepping: false });
      }
    } catch (err: any) {
      set({
        isStepping: false,
        error: err?.response?.data?.message || err?.message || 'Failed to cross lane.',
      });
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
