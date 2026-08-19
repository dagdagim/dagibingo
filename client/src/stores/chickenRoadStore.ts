import { create } from 'zustand';
import { api } from '../services/api';
import { useAuthStore } from './authStore';
import { useWalletStore } from './walletStore';
import {
  ChickenSkinType,
  IChickenSkinConfig,
  IChickenRoadGameDTO,
  ChickenRoadHistoryDTO,
  ChickenLiveRunDTO,
} from '../shared';

export const CHICKEN_SKINS: IChickenSkinConfig[] = [
  {
    id: 'CLASSIC',
    name: 'Classic Rooster',
    emoji: '🐔',
    description: 'The legendary plucky bird with classic white feathers and a proud red comb.',
    color: '#ffffff',
    unlockedAtMultiplier: 1.0,
  },
  {
    id: 'BABY',
    name: 'Baby Chick',
    emoji: '🐥',
    description: 'A tiny, fluffy golden chick with boundless courage and energetic hops.',
    color: '#fef08a',
    unlockedAtMultiplier: 2.0,
  },
  {
    id: 'ROYAL',
    name: 'Royal King Chicken',
    emoji: '👑',
    description: 'Adorned with a sparkling golden crown and a regal royal velvet cape.',
    color: '#a855f7',
    unlockedAtMultiplier: 3.2,
  },
  {
    id: 'NINJA',
    name: 'Ninja Shadow',
    emoji: '🥷',
    description: 'Silent night crosser wearing a stealth black shinobi mask and red headband.',
    color: '#334155',
    unlockedAtMultiplier: 5.0,
  },
  {
    id: 'COWBOY',
    name: 'Cowboy Rooster',
    emoji: '🤠',
    description: 'Wild west ranger wearing a Stetson leather hat and red bandana.',
    color: '#d97706',
    unlockedAtMultiplier: 10.0,
  },
  {
    id: 'SPACE',
    name: 'Cosmo Clucker',
    emoji: '🧑‍🚀',
    description: 'Astronaut chicken with a zero-gravity bubble helmet and blue visor.',
    color: '#38bdf8',
    unlockedAtMultiplier: 25.0,
  },
  {
    id: 'GOLDEN',
    name: 'Golden Phoenix',
    emoji: '🏆',
    description: 'Gilded metallic gold with a shimmering celestial sparkle trail.',
    color: '#fbbf24',
    unlockedAtMultiplier: 100.0,
  },
];

export const ROAD_MULTIPLIERS = [
  1.0,   // Start (0)
  1.15,  // Road 1
  1.40,  // Road 2
  1.80,  // Road 3
  2.40,  // Road 4
  3.20,  // Road 5 (Checkpoint 🏁)
  4.50,  // Road 6
  6.80,  // Road 7
  10.00, // Road 8
  15.00, // Road 9
  25.00, // Road 10 (Gold Checkpoint 🏆)
  35.00, // Road 11
  50.00, // Road 12
  75.00, // Road 13
  110.0, // Road 14
  165.0, // Road 15
  250.0, // Road 16
  380.0, // Road 17
  580.0, // Road 18
  900.0, // Road 19
  1400.0, // Road 20
  2200.0, // Road 21
  3500.0, // Road 22
  5500.0, // Road 23
  8000.0, // Road 24
  12500.0, // Road 25 (Ultimate Finish 👑)
];

interface ChickenRoadState {
  game: IChickenRoadGameDTO | null;
  skin: ChickenSkinType;
  betAmount: number;
  autoStopMultiplier: number | null;
  isLoading: boolean;
  isStepping: boolean;
  isCashingOut: boolean;
  history: ChickenRoadHistoryDTO[];
  liveRuns: ChickenLiveRunDTO[];
  soundEnabled: boolean;
  isSkinModalOpen: boolean;
  error: string | null;

  setSkin: (skin: ChickenSkinType) => void;
  setBetAmount: (amount: number) => void;
  setAutoStopMultiplier: (mult: number | null) => void;
  setIsSkinModalOpen: (open: boolean) => void;
  toggleSound: () => void;
  setError: (error: string | null) => void;

  fetchActiveGame: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  fetchLiveRuns: () => Promise<void>;
  startGame: () => Promise<void>;
  stepForward: () => Promise<'SAFE' | 'CRASHED' | 'AUTO_COLLECT_WIN' | 'FINISH_LINE_VICTORY' | null>;
  cashout: () => Promise<void>;
}

export const useChickenRoadStore = create<ChickenRoadState>((set, get) => ({
  game: null,
  skin: 'CLASSIC',
  betAmount: 10,
  autoStopMultiplier: 3.2,
  isLoading: false,
  isStepping: false,
  isCashingOut: false,
  history: [],
  liveRuns: [],
  soundEnabled: true,
  isSkinModalOpen: false,
  error: null,

  setSkin: (skin) => {
    set({ skin });
  },

  setBetAmount: (amount) => {
    if (get().game && get().game?.status === 'IN_PROGRESS') return;
    set({ betAmount: Math.max(0.5, Math.min(10000, amount)) });
  },

  setAutoStopMultiplier: (mult) => {
    if (get().game && get().game?.status === 'IN_PROGRESS') return;
    set({ autoStopMultiplier: mult && mult > 1 ? Math.floor(mult * 100) / 100 : null });
  },

  setIsSkinModalOpen: (open) => {
    set({ isSkinModalOpen: open });
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
          skin: data.game.skin || 'CLASSIC',
          betAmount: data.game.betAmount,
          autoStopMultiplier: data.game.autoStopMultiplier || null,
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

  fetchLiveRuns: async () => {
    try {
      const res = await api.get<any>('/chickenroad/live-runs');
      const data = res?.data?.data || res?.data || res;
      if (Array.isArray(data)) {
        set({ liveRuns: data });
      }
    } catch {
      // Ignore
    }
  },

  startGame: async () => {
    const { skin, betAmount, autoStopMultiplier, isLoading } = get();
    if (isLoading) return;

    const token = useAuthStore.getState().token;
    if (!token) {
      set({ error: 'Please log in to start a Chicken Road run.' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const res = await api.post<any>('/chickenroad/start', {
        skin,
        betAmount,
        autoStopMultiplier: autoStopMultiplier || undefined,
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
          get().fetchLiveRuns();
        }
        return data.outcome || null;
      } else {
        set({ isStepping: false });
        return null;
      }
    } catch (err: any) {
      set({
        isStepping: false,
        error: err?.response?.data?.message || err?.message || 'Failed to cross road.',
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
        get().fetchLiveRuns();
      } else {
        set({ isCashingOut: false });
      }
    } catch (err: any) {
      set({
        isCashingOut: false,
        error: err?.response?.data?.message || err?.message || 'Failed to collect winnings.',
      });
    }
  },
}));
