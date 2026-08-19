import { create } from 'zustand';
import { api } from '../services/api';
import { useAuthStore } from './authStore';
import { useWalletStore } from './walletStore';
import {
  TowersDifficulty,
  ITowersGameDTO,
  ITowersHistoryDTO,
  ITowersDifficultyConfig,
} from '../shared';

export const TOWERS_DIFFICULTY_DATA: Record<TowersDifficulty, ITowersDifficultyConfig> = {
  EASY: {
    name: 'EASY',
    label: 'Easy (3 Gems / 1 Skull)',
    tilesPerRow: 4,
    gemsPerRow: 3,
    skullsPerRow: 1,
    multipliers: [1.29, 1.72, 2.29, 3.06, 4.08, 5.44, 7.25, 9.67, 12.89],
  },
  MEDIUM: {
    name: 'MEDIUM',
    label: 'Medium (2 Gems / 1 Skull)',
    tilesPerRow: 3,
    gemsPerRow: 2,
    skullsPerRow: 1,
    multipliers: [1.45, 2.18, 3.27, 4.91, 7.36, 11.04, 16.56, 24.84, 37.26],
  },
  HARD: {
    name: 'HARD',
    label: 'Hard (1 Gem / 1 Skull)',
    tilesPerRow: 2,
    gemsPerRow: 1,
    skullsPerRow: 1,
    multipliers: [1.94, 3.88, 7.76, 15.52, 31.04, 62.08, 124.16, 248.32, 496.64],
  },
  EXTREME: {
    name: 'EXTREME',
    label: 'Extreme (1 Gem / 2 Skulls)',
    tilesPerRow: 3,
    gemsPerRow: 1,
    skullsPerRow: 2,
    multipliers: [2.91, 8.73, 26.19, 78.57, 235.71, 707.13, 2121.39, 6364.17, 19092.51],
  },
  NIGHTMARE: {
    name: 'NIGHTMARE',
    label: 'Nightmare (1 Gem / 3 Skulls)',
    tilesPerRow: 4,
    gemsPerRow: 1,
    skullsPerRow: 3,
    multipliers: [3.88, 15.52, 62.08, 248.32, 993.28, 3973.12, 15892.48, 63569.92, 254279.68],
  },
};

interface TowersState {
  game: ITowersGameDTO | null;
  difficulty: TowersDifficulty;
  betAmount: number;
  isLoading: boolean;
  isStepping: boolean;
  isCashingOut: boolean;
  history: ITowersHistoryDTO[];
  soundEnabled: boolean;
  error: string | null;

  setDifficulty: (difficulty: TowersDifficulty) => void;
  setBetAmount: (amount: number) => void;
  toggleSound: () => void;
  setError: (error: string | null) => void;

  fetchActiveGame: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  startGame: () => Promise<void>;
  stepTile: (tileIndex: number) => Promise<void>;
  cashout: () => Promise<void>;
}

export const useTowersStore = create<TowersState>((set, get) => ({
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
      const res = await api.get<any>('/towers/active');
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
      const res = await api.get<any>('/towers/my-history?limit=25');
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
      set({ error: 'Please log in to play Towers.' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const res = await api.post<any>('/towers/start', {
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
        error: err?.response?.data?.message || err?.message || 'Failed to start Towers game.',
      });
    }
  },

  stepTile: async (tileIndex: number) => {
    const { game, isStepping } = get();
    if (!game || game.status !== 'IN_PROGRESS' || isStepping) return;

    set({ isStepping: true, error: null });

    try {
      const res = await api.post<any>('/towers/step', {
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
        error: err?.response?.data?.message || err?.message || 'Failed to climb floor.',
      });
    }
  },

  cashout: async () => {
    const { game, isCashingOut } = get();
    if (!game || game.status !== 'IN_PROGRESS' || isCashingOut) return;

    set({ isCashingOut: true, error: null });

    try {
      const res = await api.post<any>('/towers/cashout', {
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
