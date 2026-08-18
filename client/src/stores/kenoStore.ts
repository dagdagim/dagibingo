import { create } from 'zustand';
import { KenoRound, KenoTicket, KenoStats, KENO_PAYTABLE, KENO_MAX_SPOTS } from '../shared';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { useWalletStore } from './walletStore';
import { useAuthStore } from './authStore';
import { voiceController } from '../utils/voiceController';

interface KenoState {
  currentRound: KenoRound | null;
  selectedNumbers: number[];
  betAmount: number;
  myTickets: KenoTicket[];
  lastResult: { ticket: KenoTicket; newBalance?: number } | null;
  stats: KenoStats | null;
  gameMode: 'LIVE' | 'INSTANT';
  isLoading: boolean;
  isDrawing: boolean;
  error: string | null;
  drawnBalls: number[];

  // Actions
  setGameMode: (mode: 'LIVE' | 'INSTANT') => void;
  toggleNumber: (num: number) => void;
  setBetAmount: (amount: number) => void;
  quickPick: (count: number) => void;
  clearNumbers: () => void;
  fetchLiveRound: () => void;
  fetchMyTickets: () => void;
  fetchStats: () => void;
  placeLiveBet: () => Promise<void>;
  playInstant: () => Promise<void>;
  initSocketListeners: () => () => void;
}

export const useKenoStore = create<KenoState>((set, get) => ({
  currentRound: null,
  selectedNumbers: [7, 14, 21, 42, 77],
  betAmount: 10,
  myTickets: [],
  lastResult: null,
  stats: null,
  gameMode: 'LIVE',
  isLoading: false,
  isDrawing: false,
  error: null,
  drawnBalls: [],

  setGameMode: (mode) => set({ gameMode: mode }),

  toggleNumber: (num) => {
    const { selectedNumbers, isDrawing } = get();
    if (isDrawing) return;

    if (selectedNumbers.includes(num)) {
      set({ selectedNumbers: selectedNumbers.filter((n) => n !== num), error: null });
    } else {
      if (selectedNumbers.length >= KENO_MAX_SPOTS) {
        set({ error: `You can choose up to ${KENO_MAX_SPOTS} spots.` });
        return;
      }
      set({ selectedNumbers: [...selectedNumbers, num].sort((a, b) => a - b), error: null });
    }
  },

  setBetAmount: (amount) => set({ betAmount: Math.max(1, amount), error: null }),

  quickPick: (count) => {
    const { isDrawing } = get();
    if (isDrawing) return;

    const clampedCount = Math.min(KENO_MAX_SPOTS, Math.max(1, count));
    const pool = Array.from({ length: 80 }, (_, i) => i + 1);
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picks = pool.slice(0, clampedCount).sort((a, b) => a - b);
    set({ selectedNumbers: picks, error: null });
  },

  clearNumbers: () => {
    if (!get().isDrawing) {
      set({ selectedNumbers: [], error: null });
    }
  },

  fetchLiveRound: async () => {
    try {
      const res = await api.get<{ round: KenoRound }>('/keno/live-round');
      if (res?.round) {
        set({
          currentRound: res.round,
          drawnBalls: res.round.drawnNumbers || [],
        });
      }
    } catch {
      // Offline fallback
    }
  },

  fetchMyTickets: async () => {
    if (!localStorage.getItem('bingo_access_token')) {
      set({ myTickets: [] });
      return;
    }
    try {
      const res = await api.get<KenoTicket[]>('/keno/my-tickets');
      if (Array.isArray(res)) {
        set({ myTickets: res });
      }
    } catch {
      // Ignore
    }
  },

  fetchStats: async () => {
    try {
      const res = await api.get<KenoStats>('/keno/stats');
      if (res) {
        set({ stats: res });
      }
    } catch {
      // Ignore
    }
  },

  placeLiveBet: async () => {
    const { selectedNumbers, betAmount, currentRound } = get();
    if (!useAuthStore.getState().isAuthenticated) {
      set({ error: 'Please sign in to your account to place live multiplayer bets and win ETB.' });
      return;
    }
    if (selectedNumbers.length === 0) {
      set({ error: 'Please choose at least 1 spot before placing your bet.' });
      return;
    }
    if (currentRound && currentRound.status !== 'BETTING') {
      set({ error: 'Betting is closed for this round. Please wait for the next round.' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const res = await api.post<KenoTicket>('/keno/bet', {
        selectedNumbers,
        betAmount,
      });

      // Update wallet locally
      useWalletStore.getState().fetchBalance();
      get().fetchMyTickets();
      set({
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message });
    }
  },

  playInstant: async () => {
    const { selectedNumbers, betAmount, isDrawing } = get();
    if (isDrawing) return;

    if (selectedNumbers.length === 0) {
      set({ error: 'Please select at least 1 number to play Instant Keno.' });
      return;
    }

    set({ isLoading: true, isDrawing: true, drawnBalls: [], error: null, lastResult: null });

    try {
      const res = await api.post<{ ticket: KenoTicket; newBalance: number }>('/keno/quick-play', {
        selectedNumbers,
        betAmount,
      });

      useWalletStore.getState().fetchBalance();

      const finalDrawn = res.ticket.drawnNumbers;
      // Animate 20 ball reveals sequentially with clear voice announcements
      for (let i = 0; i < finalDrawn.length; i++) {
        const ball = finalDrawn[i];
        set((state) => ({
          drawnBalls: [...state.drawnBalls, ball],
        }));
        voiceController.speakCustom(`Number ${ball}`);
        await new Promise((resolve) => setTimeout(resolve, 1400));
      }

      if (res.ticket.status === 'WON') {
        voiceController.speakCustom(`Congratulations! You hit ${res.ticket.hitsCount} numbers and won ${res.ticket.payoutAmount} ETB!`);
      }

      set({
        lastResult: res,
        isDrawing: false,
        isLoading: false,
      });

      get().fetchMyTickets();
      get().fetchStats();
    } catch (err) {
      set({ isLoading: false, isDrawing: false, error: (err as Error).message });
    }
  },

  initSocketListeners: () => {
    const socket = socketService.getSocket();
    if (!socket) return () => {};

    (socket as any).emit('keno:join', (response: any) => {
      if (response?.round) {
        set({
          currentRound: response.round,
          drawnBalls: response.round.drawnNumbers || [],
        });
      }
    });

    const handleCountdown = (data: { roundNumber: number; countdownSeconds: number; status: string }) => {
      set((state) => {
        if (!state.currentRound) return state;
        return {
          currentRound: {
            ...state.currentRound,
            roundNumber: data.roundNumber,
            countdownSeconds: data.countdownSeconds,
            status: data.status as any,
          },
        };
      });
    };

    const handleDrawStarted = (data: { roundNumber: number; status: string }) => {
      set((state) => ({
        drawnBalls: [],
        currentRound: state.currentRound
          ? { ...state.currentRound, roundNumber: data.roundNumber, status: 'DRAWING' }
          : null,
      }));
      voiceController.speakCustom('Keno draw starting now!');
    };

    const handleBallDrawn = (data: {
      roundNumber: number;
      ballNumber: number;
      ballIndex: number;
      drawnNumbers: number[];
    }) => {
      set((state) => ({
        drawnBalls: data.drawnNumbers,
        currentRound: state.currentRound
          ? {
              ...state.currentRound,
              roundNumber: data.roundNumber,
              status: 'DRAWING',
              drawnNumbers: data.drawnNumbers,
              currentBallIndex: data.ballIndex,
            }
          : null,
      }));

      // Speak ball number
      voiceController.speakCustom(`Number ${data.ballNumber}`);
    };

    const handleRoundSettled = (data: {
      roundNumber: number;
      drawnNumbers: number[];
      winners: any[];
      nextRoundInSeconds: number;
    }) => {
      set((state) => ({
        drawnBalls: data.drawnNumbers,
        currentRound: state.currentRound
          ? {
              ...state.currentRound,
              status: 'COMPLETED',
              drawnNumbers: data.drawnNumbers,
              countdownSeconds: data.nextRoundInSeconds,
            }
          : null,
      }));

      useWalletStore.getState().fetchBalance();
      get().fetchMyTickets();
      get().fetchStats();
    };

    const handleRoundState = (data: { round: KenoRound }) => {
      if (data.round) {
        set({
          currentRound: data.round,
          drawnBalls: data.round.drawnNumbers || [],
        });
      }
    };

    socket.on('keno:countdown' as any, handleCountdown);
    socket.on('keno:draw_started' as any, handleDrawStarted);
    socket.on('keno:ball_drawn' as any, handleBallDrawn);
    socket.on('keno:round_settled' as any, handleRoundSettled);
    socket.on('keno:round_state' as any, handleRoundState);

    return () => {
      (socket as any).emit('keno:leave');
      socket.off('keno:countdown' as any, handleCountdown);
      socket.off('keno:draw_started' as any, handleDrawStarted);
      socket.off('keno:ball_drawn' as any, handleBallDrawn);
      socket.off('keno:round_settled' as any, handleRoundSettled);
      socket.off('keno:round_state' as any, handleRoundState);
    };
  },
}));
