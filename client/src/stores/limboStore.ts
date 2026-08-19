import { create } from 'zustand';
import { api } from '../services/api';
import { useAuthStore } from './authStore';
import { useWalletStore } from './walletStore';
import { ILimboBetDTO, LimboStatsDTO } from '../shared';

interface LimboState {
  betAmount: number;
  targetMultiplier: number;
  lastRoll: number | null;
  lastBet: ILimboBetDTO | null;
  isRolling: boolean;
  history: ILimboBetDTO[];
  stats: LimboStatsDTO | null;
  soundEnabled: boolean;
  error: string | null;

  // Auto-betting engine state
  isAutoBetting: boolean;
  autoBetCount: number;
  autoBetOnWinMultiplier: number;
  autoBetOnLossMultiplier: number;
  autoStopOnProfit: number | null;
  autoStopOnLoss: number | null;

  setBetAmount: (amount: number) => void;
  setTargetMultiplier: (multiplier: number) => void;
  toggleSound: () => void;
  setError: (error: string | null) => void;

  setAutoBetCount: (count: number) => void;
  setAutoBetOnWinMultiplier: (mult: number) => void;
  setAutoBetOnLossMultiplier: (mult: number) => void;
  setAutoStopOnProfit: (profit: number | null) => void;
  setAutoStopOnLoss: (loss: number | null) => void;
  stopAutoBet: () => void;

  placeBet: () => Promise<ILimboBetDTO | null>;
  startAutoBet: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  fetchStats: () => Promise<void>;
}

export const useLimboStore = create<LimboState>((set, get) => ({
  betAmount: 10,
  targetMultiplier: 2.0,
  lastRoll: null,
  lastBet: null,
  isRolling: false,
  history: [],
  stats: null,
  soundEnabled: true,
  error: null,

  isAutoBetting: false,
  autoBetCount: 10,
  autoBetOnWinMultiplier: 1.0,
  autoBetOnLossMultiplier: 2.0,
  autoStopOnProfit: null,
  autoStopOnLoss: null,

  setBetAmount: (amount) => {
    set({ betAmount: Math.max(0.5, Math.min(10000, amount)) });
  },

  setTargetMultiplier: (multiplier) => {
    set({ targetMultiplier: Math.max(1.01, Math.min(1000000, Math.floor(multiplier * 100) / 100)) });
  },

  toggleSound: () => {
    set((state) => ({ soundEnabled: !state.soundEnabled }));
  },

  setError: (error) => {
    set({ error });
  },

  setAutoBetCount: (count) => set({ autoBetCount: Math.max(1, count) }),
  setAutoBetOnWinMultiplier: (mult) => set({ autoBetOnWinMultiplier: mult }),
  setAutoBetOnLossMultiplier: (mult) => set({ autoBetOnLossMultiplier: mult }),
  setAutoStopOnProfit: (profit) => set({ autoStopOnProfit: profit }),
  setAutoStopOnLoss: (loss) => set({ autoStopOnLoss: loss }),
  stopAutoBet: () => set({ isAutoBetting: false }),

  placeBet: async () => {
    const { betAmount, targetMultiplier, isRolling } = get();
    if (isRolling) return null;

    const token = useAuthStore.getState().token;
    if (!token) {
      set({ error: 'Please log in to play Limbo.' });
      return null;
    }

    set({ isRolling: true, error: null });

    try {
      const res = await api.post<any>('/limbo/bet', {
        betAmount,
        targetMultiplier,
      });

      const data = res?.data || res;
      if (data?.newBalance !== undefined) {
        useWalletStore.getState().updateBalanceLocally(data.newBalance);
        useWalletStore.getState().fetchBalance();
      }

      if (data?.bet) {
        set((state) => ({
          lastRoll: data.bet.resultMultiplier,
          lastBet: data.bet,
          history: [data.bet, ...state.history].slice(0, 30),
          isRolling: false,
        }));
        return data.bet;
      } else {
        set({ isRolling: false });
        return null;
      }
    } catch (err: any) {
      set({
        isRolling: false,
        error: err?.response?.data?.message || err?.message || 'Failed to place Limbo bet.',
      });
      return null;
    }
  },

  startAutoBet: async () => {
    const { isAutoBetting, autoBetCount, autoBetOnWinMultiplier, autoBetOnLossMultiplier, autoStopOnProfit, autoStopOnLoss } = get();
    if (isAutoBetting) return;

    set({ isAutoBetting: true, error: null });
    const initialBalance = useWalletStore.getState().balance?.availableBalance || 0;
    let baseBet = get().betAmount;

    for (let i = 0; i < autoBetCount; i++) {
      if (!get().isAutoBetting) break;

      const betResult = await get().placeBet();
      if (!betResult) {
        set({ isAutoBetting: false });
        break;
      }

      const currentBalance = useWalletStore.getState().balance?.availableBalance || 0;
      const profit = currentBalance - initialBalance;

      if (autoStopOnProfit && profit >= autoStopOnProfit) {
        set({ isAutoBetting: false });
        break;
      }

      if (autoStopOnLoss && profit <= -Math.abs(autoStopOnLoss)) {
        set({ isAutoBetting: false });
        break;
      }

      // Next bet scaling
      if (betResult.status === 'WON') {
        if (autoBetOnWinMultiplier !== 1.0) {
          get().setBetAmount(baseBet * autoBetOnWinMultiplier);
        }
      } else {
        if (autoBetOnLossMultiplier !== 1.0) {
          get().setBetAmount(get().betAmount * autoBetOnLossMultiplier);
        }
      }

      await new Promise((r) => setTimeout(r, 450));
    }

    set({ isAutoBetting: false });
  },

  fetchHistory: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const res = await api.get<any>('/limbo/my-history?limit=30');
      const data = res?.data || res;
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      set({ history: list });
    } catch {
      // Ignore
    }
  },

  fetchStats: async () => {
    try {
      const res = await api.get<any>('/limbo/stats');
      const data = res?.data?.data || res?.data || res;
      if (data) {
        set({ stats: data });
      }
    } catch {
      // Ignore
    }
  },
}));
