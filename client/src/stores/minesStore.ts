import { create } from 'zustand';
import { api } from '../services/api';
import { useAuthStore } from './authStore';
import { useWalletStore } from './walletStore';
import { IMinesGameDTO, MinesHistoryItem, MinesStatsDTO, MinesStatus } from '../shared';

interface MinesState {
  activeGame: IMinesGameDTO | null;
  betAmount: number;
  mineCount: number;
  revealedTiles: number[];
  currentMultiplier: number;
  nextMultiplier: number;
  payoutAmount: number;
  status: MinesStatus | 'IDLE';
  grid: boolean[] | null;
  lastExplodedTile: number | null;
  lastRevealedGem: number | null;

  isStarting: boolean;
  isRevealing: boolean;
  isCashingOut: boolean;
  soundEnabled: boolean;
  error: string | null;

  history: MinesHistoryItem[];
  stats: MinesStatsDTO | null;

  // Actions
  setBetAmount: (amount: number) => void;
  setMineCount: (count: number) => void;
  toggleSound: () => void;
  setError: (error: string | null) => void;

  startGame: () => Promise<void>;
  revealTile: (tileIndex: number) => Promise<boolean | undefined>;
  autoPickRandomTile: () => Promise<void>;
  cashout: () => Promise<void>;
  fetchActiveGame: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  fetchStats: () => Promise<void>;
  resetGame: () => void;
}

export const useMinesStore = create<MinesState>((set, get) => ({
  activeGame: null,
  betAmount: 10,
  mineCount: 3,
  revealedTiles: [],
  currentMultiplier: 1.0,
  nextMultiplier: 1.1,
  payoutAmount: 0,
  status: 'IDLE',
  grid: null,
  lastExplodedTile: null,
  lastRevealedGem: null,

  isStarting: false,
  isRevealing: false,
  isCashingOut: false,
  soundEnabled: true,
  error: null,

  history: [],
  stats: null,

  setBetAmount: (amount: number) => {
    set({ betAmount: Math.max(0.5, Math.min(10000, amount)) });
  },

  setMineCount: (count: number) => {
    set({ mineCount: Math.max(1, Math.min(24, count)) });
  },

  toggleSound: () => {
    set((state) => ({ soundEnabled: !state.soundEnabled }));
  },

  setError: (error: string | null) => {
    set({ error });
  },

  resetGame: () => {
    set({
      activeGame: null,
      revealedTiles: [],
      currentMultiplier: 1.0,
      nextMultiplier: 1.1,
      payoutAmount: 0,
      status: 'IDLE',
      grid: null,
      lastExplodedTile: null,
      lastRevealedGem: null,
      error: null,
    });
  },

  fetchActiveGame: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const res = await api.get<any>('/mines/active');
      const data = res?.data || res;
      if (data?.game) {
        const game: IMinesGameDTO = data.game;
        set({
          activeGame: game,
          betAmount: game.betAmount,
          mineCount: game.mineCount,
          revealedTiles: game.revealedTiles,
          currentMultiplier: game.currentMultiplier,
          nextMultiplier: game.nextMultiplier,
          payoutAmount: game.payoutAmount,
          status: game.status,
          grid: game.grid || null,
        });
      }
    } catch {
      // Ignore
    }
  },

  startGame: async () => {
    const { betAmount, mineCount, isStarting } = get();
    if (isStarting) return;

    const token = useAuthStore.getState().token;
    if (!token) {
      set({ error: 'Please log in to play Mines.' });
      return;
    }

    set({
      isStarting: true,
      error: null,
      grid: null,
      lastExplodedTile: null,
      lastRevealedGem: null,
    });

    try {
      const res = await api.post<any>('/mines/start', {
        betAmount,
        mineCount,
      });

      const data = res?.data || res;
      const game: IMinesGameDTO = data.game;

      if (data?.newBalance !== undefined) {
        useWalletStore.getState().updateBalanceLocally(data.newBalance);
        useWalletStore.getState().fetchBalance();
      }

      set({
        activeGame: game,
        revealedTiles: game.revealedTiles,
        currentMultiplier: game.currentMultiplier,
        nextMultiplier: game.nextMultiplier,
        payoutAmount: game.payoutAmount,
        status: game.status,
        grid: null,
        isStarting: false,
      });
    } catch (err: any) {
      set({
        isStarting: false,
        error: err?.response?.data?.message || err?.message || 'Failed to start game.',
      });
    }
  },

  revealTile: async (tileIndex: number) => {
    const { activeGame, isRevealing, revealedTiles } = get();
    if (!activeGame || activeGame.status !== 'IN_PROGRESS' || isRevealing) return;
    if (revealedTiles.includes(tileIndex)) return;

    set({ isRevealing: true, error: null });

    try {
      const res = await api.post<any>('/mines/reveal', {
        gameId: activeGame.id,
        tileIndex,
      });

      const data = res?.data || res;
      const game: IMinesGameDTO = data.game;
      const isMine: boolean = data.isMine;

      if (data?.newBalance !== undefined) {
        useWalletStore.getState().updateBalanceLocally(data.newBalance);
        useWalletStore.getState().fetchBalance();
      }

      set({
        activeGame: game,
        revealedTiles: game.revealedTiles,
        currentMultiplier: game.currentMultiplier,
        nextMultiplier: game.nextMultiplier,
        payoutAmount: game.payoutAmount,
        status: game.status,
        grid: game.grid || null,
        lastExplodedTile: isMine ? tileIndex : null,
        lastRevealedGem: !isMine ? tileIndex : null,
        isRevealing: false,
      });

      if (game.status !== 'IN_PROGRESS') {
        get().fetchHistory();
        get().fetchStats();
      }

      return isMine;
    } catch (err: any) {
      set({
        isRevealing: false,
        error: err?.response?.data?.message || err?.message || 'Failed to reveal tile.',
      });
    }
  },

  autoPickRandomTile: async () => {
    const { activeGame, revealedTiles } = get();
    if (!activeGame || activeGame.status !== 'IN_PROGRESS') return;

    const unrevealed: number[] = [];
    for (let i = 0; i < 25; i++) {
      if (!revealedTiles.includes(i)) {
        unrevealed.push(i);
      }
    }

    if (unrevealed.length === 0) return;

    const randomIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    await get().revealTile(randomIndex);
  },

  cashout: async () => {
    const { activeGame, isCashingOut } = get();
    if (!activeGame || activeGame.status !== 'IN_PROGRESS' || isCashingOut) return;
    if (activeGame.revealedTiles.length === 0) {
      set({ error: 'Reveal at least one diamond before cashing out!' });
      return;
    }

    set({ isCashingOut: true, error: null });

    try {
      const res = await api.post<any>('/mines/cashout', {
        gameId: activeGame.id,
      });

      const data = res?.data || res;
      const game: IMinesGameDTO = data.game;

      if (data?.newBalance !== undefined) {
        useWalletStore.getState().updateBalanceLocally(data.newBalance);
        useWalletStore.getState().fetchBalance();
      }

      set({
        activeGame: game,
        revealedTiles: game.revealedTiles,
        currentMultiplier: game.currentMultiplier,
        payoutAmount: game.payoutAmount,
        status: 'CASHED_OUT',
        grid: game.grid || null,
        isCashingOut: false,
      });

      get().fetchHistory();
      get().fetchStats();
    } catch (err: any) {
      set({
        isCashingOut: false,
        error: err?.response?.data?.message || err?.message || 'Failed to cash out.',
      });
    }
  },

  fetchHistory: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const res = await api.get<any>('/mines/history?limit=25');
      const data = res?.data || res;
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      set({ history: list });
    } catch {
      // Ignore
    }
  },

  fetchStats: async () => {
    try {
      const res = await api.get<any>('/mines/stats');
      const data = res?.data?.data || res?.data || res;
      if (data) {
        set({ stats: data });
      }
    } catch {
      // Ignore
    }
  },
}));
