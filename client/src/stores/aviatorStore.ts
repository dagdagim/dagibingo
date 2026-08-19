import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { useWalletStore } from './walletStore';
import { useAuthStore } from './authStore';
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
  queuedForNextRound: boolean;
  isProcessing: boolean;
}

interface AviatorState {
  panels: [PanelBetState, PanelBetState];
  currentRound: AviatorRound | null;
  flightStatus: AviatorRoundStatus;
  currentMultiplier: number;
  countdownSeconds: number;
  lastCrashMultiplier: number | null;
  recentMultipliers: number[];
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

  placeBet: (panelIndex: 0 | 1) => Promise<void>;
  cancelBet: (panelIndex: 0 | 1) => Promise<void>;
  cashout: (panelIndex: 0 | 1) => Promise<void>;

  fetchMyHistory: () => Promise<void>;
  fetchStats: () => Promise<void>;
  initSocketListeners: () => () => void;
}

export const useAviatorStore = create<AviatorState>()(
  persist(
    (set, get) => ({
      panels: [
        {
          betAmount: 10,
          autoCashout: false,
          autoCashoutMultiplier: 2.0,
          activeBet: null,
          queuedForNextRound: false,
          isProcessing: false,
        },
        {
          betAmount: 20,
          autoCashout: false,
          autoCashoutMultiplier: 2.0,
          activeBet: null,
          queuedForNextRound: false,
          isProcessing: false,
        },
      ],
      currentRound: null,
      flightStatus: 'BETTING',
      currentMultiplier: 1.0,
      countdownSeconds: 6,
      lastCrashMultiplier: null,
      recentMultipliers: [],
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
            betAmount: Math.max(0.5, amount),
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
            autoCashoutMultiplier: Math.max(1.05, Math.floor(multiplier * 100) / 100),
          };
          return { panels: newPanels };
        });
      },

      toggleSound: () => {
        set((state) => ({ soundEnabled: !state.soundEnabled }));
      },

      placeBet: async (panelIndex) => {
        const { panels, flightStatus } = get();
        const panel = panels[panelIndex];
        const token = useAuthStore.getState().token;

        if (!token) {
          set({ error: 'Please log in to place real bets.' });
          return;
        }

        if (flightStatus !== 'BETTING') {
          // Queue for next round
          set((state) => {
            const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
            newPanels[panelIndex] = { ...newPanels[panelIndex], queuedForNextRound: true };
            return { panels: newPanels };
          });
          return;
        }

        // Set processing
        set((state) => {
          const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
          newPanels[panelIndex] = { ...newPanels[panelIndex], isProcessing: true };
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
            return { panels: newPanels };
          });
        } catch (err: any) {
          set((state) => {
            const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
            newPanels[panelIndex] = { ...newPanels[panelIndex], isProcessing: false };
            return { panels: newPanels, error: err?.message || 'Failed to place bet' };
          });
        }
      },

      cancelBet: async (panelIndex) => {
        const { flightStatus } = get();
        if (flightStatus !== 'BETTING') {
          set((state) => {
            const newPanels = [...state.panels] as [PanelBetState, PanelBetState];
            newPanels[panelIndex] = { ...newPanels[panelIndex], queuedForNextRound: false };
            return { panels: newPanels };
          });
          return;
        }

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
              queuedForNextRound: false,
            };
            return { panels: newPanels };
          });
        } catch (err: any) {
          set({ error: err?.message || 'Failed to cancel bet' });
        }
      },

      cashout: async (panelIndex) => {
        const { panels, flightStatus } = get();
        const panel = panels[panelIndex];
        if (!panel.activeBet || flightStatus !== 'FLYING') return;

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
            return { panels: newPanels, error: err?.message || 'Cashout failed' };
          });
        }
      },

      fetchMyHistory: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;
        try {
          const res = await api.get<any>('/aviator/my-history?limit=25');
          const data = res?.data || res;
          set({ myHistory: Array.isArray(data) ? data : [] });
        } catch (err) {
          // Handled
        }
      },

      fetchStats: async () => {
        try {
          const res = await api.get<any>('/aviator/stats');
          const data = res?.data || res;
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
              countdownSeconds: response.round.countdownSeconds || 6,
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
          set((state) => ({
            flightStatus: 'BETTING',
            countdownSeconds: data.countdownSeconds,
            currentMultiplier: 1.0,
            currentRound: state.currentRound
              ? { ...state.currentRound, roundNumber: data.roundNumber, status: 'BETTING', countdownSeconds: data.countdownSeconds }
              : null,
          }));

          // Trigger queued bets at start of countdown
          const { panels, placeBet } = get();
          if (data.countdownSeconds >= 4) {
            if (panels[0].queuedForNextRound && !panels[0].activeBet) placeBet(0);
            if (panels[1].queuedForNextRound && !panels[1].activeBet) placeBet(1);
          }
        };

        // 2. Flight Started
        const handleFlightStarted = (data: { roundNumber: number; status: AviatorRoundStatus }) => {
          set((state) => ({
            flightStatus: 'FLYING',
            currentMultiplier: 1.0,
            currentRound: state.currentRound
              ? { ...state.currentRound, roundNumber: data.roundNumber, status: 'FLYING' }
              : null,
          }));
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
          set((state) => ({
            flightStatus: 'CRASHED',
            lastCrashMultiplier: data.crashMultiplier,
            currentMultiplier: data.crashMultiplier,
            recentMultipliers: [data.crashMultiplier, ...state.recentMultipliers.slice(0, 24)],
            panels: [
              {
                ...state.panels[0],
                activeBet: null,
              },
              {
                ...state.panels[1],
                activeBet: null,
              },
            ],
          }));

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
    }),
    {
      name: 'dagibingo-aviator-store',
      partialize: (state) => ({
        panels: state.panels,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
);
