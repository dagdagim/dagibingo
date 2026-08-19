import { create } from 'zustand';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { useAuthStore } from './authStore';
import { useWalletStore } from './walletStore';
import {
  AviatorRound,
  AviatorBet,
  AviatorRoundStatus,
  AviatorStatsDTO,
} from '../shared';

export interface PanelBetState {
  betAmount: number;
  autoCashout: boolean;
  autoCashoutMultiplier: number;
  activeBet: AviatorBet | null;
  isProcessing: boolean;
  queuedForNextRound: boolean;
}

interface AviatorState {
  currentRound: AviatorRound | null;
  flightStatus: AviatorRoundStatus;
  currentMultiplier: number;
  countdownSeconds: number;
  lastCrashMultiplier: number | null;
  recentMultipliers: number[];
  panels: [PanelBetState, PanelBetState];
  liveBets: AviatorBet[];
  myHistory: AviatorBet[];
  stats: AviatorStatsDTO | null;
  soundEnabled: boolean;
  error: string | null;

  // Actions
  setPanelAmount: (panelIndex: 0 | 1, amount: number) => void;
  setPanelAutoCashout: (panelIndex: 0 | 1, enabled: boolean) => void;
  setPanelAutoMultiplier: (panelIndex: 0 | 1, multiplier: number) => void;
  toggleSound: () => void;
  setError: (error: string | null) => void;

  placeBet: (panelIndex: 0 | 1) => Promise<void>;
  cancelBet: (panelIndex: 0 | 1) => Promise<void>;
  cashout: (panelIndex: 0 | 1) => Promise<void>;

  fetchMyHistory: () => Promise<void>;
  fetchStats: () => Promise<void>;
  initSocketListeners: () => () => void;
}

export const useAviatorStore = create<AviatorState>((set, get) => ({
  currentRound: null,
  flightStatus: 'BETTING',
  currentMultiplier: 1.0,
  countdownSeconds: 8,
  lastCrashMultiplier: null,
  recentMultipliers: [],
  panels: [
    {
      betAmount: 10,
      autoCashout: false,
      autoCashoutMultiplier: 2.0,
      activeBet: null,
      isProcessing: false,
      queuedForNextRound: false,
    },
    {
      betAmount: 25,
      autoCashout: false,
      autoCashoutMultiplier: 1.5,
      activeBet: null,
      isProcessing: false,
      queuedForNextRound: false,
    },
  ],
  liveBets: [],
  myHistory: [],
  stats: null,
  soundEnabled: true,
  error: null,

  setPanelAmount: (panelIndex, amount) => {
    set((state) => {
      const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
      newPanels[panelIndex] = {
        ...newPanels[panelIndex],
        betAmount: Math.max(0.5, Math.min(10000, amount)),
      };
      return { panels: newPanels };
    });
  },

  setPanelAutoCashout: (panelIndex, enabled) => {
    set((state) => {
      const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
      newPanels[panelIndex] = {
        ...newPanels[panelIndex],
        autoCashout: enabled,
      };
      return { panels: newPanels };
    });
  },

  setPanelAutoMultiplier: (panelIndex, multiplier) => {
    set((state) => {
      const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
      newPanels[panelIndex] = {
        ...newPanels[panelIndex],
        autoCashoutMultiplier: Math.max(1.05, Math.min(1000, multiplier)),
      };
      return { panels: newPanels };
    });
  },

  toggleSound: () => {
    set((state) => ({ soundEnabled: !state.soundEnabled }));
  },

  setError: (error) => {
    set({ error });
  },

  placeBet: async (panelIndex) => {
    const { panels } = get();
    const panel = panels[panelIndex];

    if (panel.isProcessing || panel.activeBet) {
      return;
    }

    const token = useAuthStore.getState().token;
    if (!token) {
      set({ error: 'Please log in to place real bets.' });
      return;
    }

    // Set processing
    set((state) => {
      const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
      newPanels[panelIndex] = {
        ...newPanels[panelIndex],
        isProcessing: true,
        queuedForNextRound: false,
      };
      return { panels: newPanels, error: null };
    });

    try {
      const res = await api.post<any>('/aviator/bet', {
        panelIndex,
        betAmount: panel.betAmount,
        autoCashoutMultiplier: panel.autoCashout ? panel.autoCashoutMultiplier : undefined,
      });

      const data = res?.data || res;
      if (data?.newBalance !== undefined) {
        useWalletStore.getState().updateBalanceLocally(data.newBalance);
        useWalletStore.getState().fetchBalance();
      }

      set((state) => {
        const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
        newPanels[panelIndex] = {
          ...newPanels[panelIndex],
          activeBet: data.bet,
          queuedForNextRound: false,
          isProcessing: false,
        };
        return { panels: newPanels, error: null };
      });
    } catch (err: any) {
      set((state) => {
        const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
        newPanels[panelIndex] = { ...newPanels[panelIndex], isProcessing: false };
        return { panels: newPanels, error: err?.response?.data?.message || err?.message || 'Failed to place bet' };
      });
    }
  },

  cancelBet: async (panelIndex) => {
    const { panels } = get();
    const panel = panels[panelIndex];

    if (!panel.activeBet) return;

    set((state) => {
      const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
      newPanels[panelIndex] = { ...newPanels[panelIndex], isProcessing: true };
      return { panels: newPanels };
    });

    try {
      const res = await api.post<any>('/aviator/cancel-bet', { panelIndex });
      const data = res?.data || res;

      if (data?.newBalance !== undefined) {
        useWalletStore.getState().updateBalanceLocally(data.newBalance);
        useWalletStore.getState().fetchBalance();
      }

      set((state) => {
        const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
        newPanels[panelIndex] = {
          ...newPanels[panelIndex],
          activeBet: null,
          isProcessing: false,
        };
        return { panels: newPanels };
      });
    } catch (err: any) {
      set((state) => {
        const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
        newPanels[panelIndex] = { ...newPanels[panelIndex], isProcessing: false };
        return { panels: newPanels, error: err?.response?.data?.message || err?.message || 'Failed to cancel bet' };
      });
    }
  },

  cashout: async (panelIndex) => {
    const { panels, flightStatus } = get();
    const panel = panels[panelIndex];
    if (!panel.activeBet || panel.activeBet.status !== 'ACTIVE' || flightStatus !== 'FLYING') {
      return;
    }

    set((state) => {
      const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
      newPanels[panelIndex] = { ...newPanels[panelIndex], isProcessing: true };
      return { panels: newPanels };
    });

    try {
      const res = await api.post<any>('/aviator/cashout', { panelIndex });
      const data = res?.data || res;

      if (data?.newBalance !== undefined) {
        useWalletStore.getState().updateBalanceLocally(data.newBalance);
        useWalletStore.getState().fetchBalance();
      }

      set((state) => {
        const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
        newPanels[panelIndex] = {
          ...newPanels[panelIndex],
          activeBet: state.panels[panelIndex].activeBet
            ? {
                ...state.panels[panelIndex].activeBet!,
                status: 'CASHED_OUT',
                cashedOutMultiplier: data.multiplier,
                payoutAmount: data.payoutAmount,
              }
            : null,
          isProcessing: false,
        };
        return { panels: newPanels };
      });

      get().fetchMyHistory();
    } catch (err: any) {
      set((state) => {
        const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
        newPanels[panelIndex] = { ...newPanels[panelIndex], isProcessing: false };
        return { panels: newPanels, error: err?.response?.data?.message || err?.message || 'Cashout failed' };
      });
    }
  },

  fetchMyHistory: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    try {
      const res = await api.get<any>('/aviator/my-history?limit=25');
      const data = res?.data || res;
      const historyList = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      set({ myHistory: historyList });
    } catch (err) {
      // Handled
    }
  },

  fetchStats: async () => {
    try {
      const res = await api.get<any>('/aviator/stats');
      const data = res?.data?.data || res?.data || res;
      if (data) {
        set({
          stats: data,
          recentMultipliers: data.recentMultipliers || [],
        });
      }
    } catch (err) {
      // Handled
    }
  },

  initSocketListeners: () => {
    const socket = socketService.getSocket();
    if (!socket) return () => {};

    // Join room
    (socket as any).emit('aviator:join', (response: any) => {
      if (response?.round) {
        set({
          currentRound: response.round,
          flightStatus: response.round.status,
          currentMultiplier: response.currentMultiplier || 1.0,
          countdownSeconds: response.round.countdownSeconds || 8,
          recentMultipliers: response.recentMultipliers || [],
          liveBets: response.activeBets || [],
        });

        // Reconcile user active bets
        if (Array.isArray(response.myBets)) {
          set((state) => {
            const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
            response.myBets.forEach((b: AviatorBet) => {
              if (b.panelIndex === 0 || b.panelIndex === 1) {
                newPanels[b.panelIndex].activeBet = b;
              }
            });
            return { panels: newPanels };
          });
        }
      }
    });

    // 1. Countdown Handler
    const handleCountdown = (data: { roundNumber: number; countdownSeconds: number; status: AviatorRoundStatus }) => {
      set((state) => {
        // Clear finished bets on new round countdown
        const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
        if (data.countdownSeconds >= 7) {
          newPanels.forEach((p, idx) => {
            if (p.activeBet && (p.activeBet.status === 'CASHED_OUT' || p.activeBet.status === 'CRASHED' || p.activeBet.status === 'CANCELLED')) {
              newPanels[idx] = { ...p, activeBet: null };
            }
          });
        }

        return {
          flightStatus: 'BETTING',
          countdownSeconds: data.countdownSeconds,
          currentMultiplier: 1.0,
          panels: newPanels,
          currentRound: state.currentRound
            ? { ...state.currentRound, roundNumber: data.roundNumber, status: 'BETTING', countdownSeconds: data.countdownSeconds }
            : null,
        };
      });
    };

    // 2. Flight Started
    const handleFlightStarted = (data: { roundNumber: number; status: AviatorRoundStatus }) => {
      set((state) => {
        const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
        newPanels.forEach((p, idx) => {
          if (p.activeBet && p.activeBet.status === 'ACTIVE') {
            newPanels[idx] = {
              ...p,
              activeBet: {
                ...p.activeBet,
                roundNumber: data.roundNumber,
              },
            };
          }
        });

        return {
          flightStatus: 'FLYING',
          currentMultiplier: 1.0,
          panels: newPanels,
          currentRound: state.currentRound
            ? { ...state.currentRound, roundNumber: data.roundNumber, status: 'FLYING' }
            : null,
        };
      });
    };

    // 3. Flight Tick
    const handleTick = (data: { roundNumber: number; multiplier: number; elapsedMs: number; status: AviatorRoundStatus }) => {
      set({
        flightStatus: 'FLYING',
        currentMultiplier: data.multiplier,
      });
    };

    // 4. Crashed
    const handleCrashed = (data: { roundNumber: number; crashMultiplier: number; status: AviatorRoundStatus }) => {
      set((state) => {
        // Mark active bets as crashed
        const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
        newPanels.forEach((p, idx) => {
          if (p.activeBet && p.activeBet.status === 'ACTIVE') {
            newPanels[idx] = {
              ...p,
              activeBet: {
                ...p.activeBet,
                status: 'CRASHED',
              },
            };
          }
        });

        return {
          flightStatus: 'CRASHED',
          lastCrashMultiplier: data.crashMultiplier,
          currentMultiplier: data.crashMultiplier,
          recentMultipliers: [data.crashMultiplier, ...state.recentMultipliers.slice(0, 24)],
          panels: newPanels,
        };
      });

      useWalletStore.getState().fetchBalance();
      get().fetchMyHistory();
    };

    // 5. Live Bet Placed
    const handleBetPlaced = (bet: AviatorBet) => {
      set((state) => ({
        liveBets: [bet, ...state.liveBets.slice(0, 49)],
      }));
    };

    // 6. Live Bet Cashed Out
    const handleBetCashedOut = (bet: AviatorBet) => {
      set((state) => ({
        liveBets: state.liveBets.map((b) => (b.id === bet.id ? bet : b)),
      }));
    };

    // 7. Personal Cashout notification
    const handleUserCashout = (data: { newBalance?: number; payoutAmount: number; multiplier: number; panelIndex: 0 | 1 }) => {
      if (typeof data.newBalance === 'number') {
        useWalletStore.getState().updateBalanceLocally(data.newBalance);
      }
      useWalletStore.getState().fetchBalance();
      get().fetchMyHistory();
    };

    socket.on('aviator:countdown' as any, handleCountdown);
    socket.on('aviator:flight_started' as any, handleFlightStarted);
    socket.on('aviator:tick' as any, handleTick);
    socket.on('aviator:crashed' as any, handleCrashed);
    socket.on('aviator:bet_placed' as any, handleBetPlaced);
    socket.on('aviator:bet_cashed_out' as any, handleBetCashedOut);
    socket.on('aviator:user_cashout' as any, handleUserCashout);

    return () => {
      (socket as any).emit('aviator:leave');
      socket.off('aviator:countdown' as any, handleCountdown);
      socket.off('aviator:flight_started' as any, handleFlightStarted);
      socket.off('aviator:tick' as any, handleTick);
      socket.off('aviator:crashed' as any, handleCrashed);
      socket.off('aviator:bet_placed' as any, handleBetPlaced);
      socket.off('aviator:bet_cashed_out' as any, handleBetCashedOut);
      socket.off('aviator:user_cashout' as any, handleUserCashout);
    };
  },
}));
