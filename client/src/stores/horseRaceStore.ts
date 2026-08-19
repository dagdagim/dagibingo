import { create } from 'zustand';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { useAuthStore } from './authStore';
import { useWalletStore } from './walletStore';
import {
  HorseRaceStatus,
  HorseBetType,
  IHorse,
  IHorseRaceRoundDTO,
  IHorseRaceBetDTO,
  HorseRaceStatsDTO,
} from '../shared';

const DEFAULT_ROSTER: IHorse[] = [
  { number: 1, name: '⚡ Thunder Bolt', color: '#ef4444', winOdds: 2.5, placeOdds: 1.35, form: '1-1-2', avatar: '🐎' },
  { number: 2, name: '🔥 Solar Flare', color: '#f97316', winOdds: 3.8, placeOdds: 1.75, form: '2-1-3', avatar: '🐎' },
  { number: 3, name: '👑 Royal Crown', color: '#eab308', winOdds: 5.5, placeOdds: 2.3, form: '1-4-1', avatar: '🐎' },
  { number: 4, name: '🌪️ Desert Storm', color: '#10b981', winOdds: 8.0, placeOdds: 3.2, form: '3-2-2', avatar: '🐎' },
  { number: 5, name: '💎 Diamond Dash', color: '#06b6d4', winOdds: 14.0, placeOdds: 5.5, form: '4-3-1', avatar: '🐎' },
  { number: 6, name: '🚀 Red Comet', color: '#8b5cf6', winOdds: 26.0, placeOdds: 9.0, form: '5-2-4', avatar: '🐎' },
];

interface HorseRaceState {
  currentRound: IHorseRaceRoundDTO | null;
  roster: IHorse[];
  raceStatus: HorseRaceStatus;
  positions: Record<number, number>;
  countdownSeconds: number;
  commentary: string;
  winner: number | null;
  podium: number[];
  myBets: IHorseRaceBetDTO[];
  myHistory: IHorseRaceBetDTO[];
  stats: HorseRaceStatsDTO | null;

  selectedBetType: HorseBetType;
  selectedHorse: number;
  selectedSecondHorse: number | null;
  betAmount: number;
  isPlacingBet: boolean;
  soundEnabled: boolean;
  error: string | null;

  // Actions
  setSelectedBetType: (type: HorseBetType) => void;
  setSelectedHorse: (horseNumber: number) => void;
  setSelectedSecondHorse: (horseNumber: number | null) => void;
  setBetAmount: (amount: number) => void;
  toggleSound: () => void;
  setError: (error: string | null) => void;

  placeBet: () => Promise<void>;
  fetchMyHistory: () => Promise<void>;
  fetchStats: () => Promise<void>;
  initSocketListeners: () => () => void;
}

export const useHorseRaceStore = create<HorseRaceState>((set, get) => ({
  currentRound: null,
  roster: DEFAULT_ROSTER,
  raceStatus: 'BETTING',
  positions: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  countdownSeconds: 15,
  commentary: 'Horses are lining up at the starting gates! Place your bets.',
  winner: null,
  podium: [],
  myBets: [],
  myHistory: [],
  stats: null,

  selectedBetType: 'WIN',
  selectedHorse: 1,
  selectedSecondHorse: null,
  betAmount: 10,
  isPlacingBet: false,
  soundEnabled: true,
  error: null,

  setSelectedBetType: (type) => {
    set((state) => ({
      selectedBetType: type,
      selectedSecondHorse: type === 'EXACTA' ? (state.selectedHorse === 1 ? 2 : 1) : null,
    }));
  },

  setSelectedHorse: (num) => {
    set((state) => ({
      selectedHorse: num,
      selectedSecondHorse:
        state.selectedBetType === 'EXACTA' && state.selectedSecondHorse === num
          ? num === 1
            ? 2
            : 1
          : state.selectedSecondHorse,
    }));
  },

  setSelectedSecondHorse: (num) => {
    set({ selectedSecondHorse: num });
  },

  setBetAmount: (amount) => {
    set({ betAmount: Math.max(0.5, Math.min(10000, amount)) });
  },

  toggleSound: () => {
    set((state) => ({ soundEnabled: !state.soundEnabled }));
  },

  setError: (error) => {
    set({ error });
  },

  placeBet: async () => {
    const { selectedBetType, selectedHorse, selectedSecondHorse, betAmount, isPlacingBet } = get();
    if (isPlacingBet) return;

    const token = useAuthStore.getState().token;
    if (!token) {
      set({ error: 'Please log in to place horse bets.' });
      return;
    }

    if (selectedBetType === 'EXACTA' && (!selectedSecondHorse || selectedSecondHorse === selectedHorse)) {
      set({ error: 'Please select two different horses for Exacta.' });
      return;
    }

    set({ isPlacingBet: true, error: null });

    try {
      const res = await api.post<any>('/horserace/bet', {
        betType: selectedBetType,
        horseNumber: selectedHorse,
        secondHorseNumber: selectedBetType === 'EXACTA' ? selectedSecondHorse : undefined,
        betAmount,
      });

      const data = res?.data || res;
      if (data?.newBalance !== undefined) {
        useWalletStore.getState().updateBalanceLocally(data.newBalance);
        useWalletStore.getState().fetchBalance();
      }

      if (data?.bet) {
        set((state) => ({
          myBets: [data.bet, ...state.myBets],
          isPlacingBet: false,
        }));
      } else {
        set({ isPlacingBet: false });
      }
    } catch (err: any) {
      set({
        isPlacingBet: false,
        error: err?.response?.data?.message || err?.message || 'Failed to place bet.',
      });
    }
  },

  fetchMyHistory: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const res = await api.get<any>('/horserace/my-history?limit=25');
      const data = res?.data || res;
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      set({ myHistory: list });
    } catch {
      // Ignore
    }
  },

  fetchStats: async () => {
    try {
      const res = await api.get<any>('/horserace/stats');
      const data = res?.data?.data || res?.data || res;
      if (data) {
        set({ stats: data });
      }
    } catch {
      // Ignore
    }
  },

  initSocketListeners: () => {
    const socket = socketService.getSocket();
    if (!socket) return () => {};

    // Join room
    (socket as any).emit('horserace:join', (response: any) => {
      if (response?.round) {
        set({
          currentRound: response.round,
          roster: response.roster || DEFAULT_ROSTER,
          raceStatus: response.round.status,
          positions: response.round.positions || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          countdownSeconds: response.round.countdownSeconds || 15,
          commentary: response.round.commentary || 'Horses are lining up at the starting gates!',
          winner: response.round.winner,
          podium: response.round.podium || [],
          myBets: response.myBets || [],
        });
      }
    });

    // 1. Countdown Handler
    const handleCountdown = (data: { roundNumber: number; countdownSeconds: number; status: HorseRaceStatus; commentary: string }) => {
      set((state) => {
        // Reset positions & bets on brand new round countdown
        let updatedBets = state.myBets;
        if (data.countdownSeconds >= 14) {
          updatedBets = state.myBets.filter((b) => b.roundNumber === data.roundNumber);
        }

        return {
          raceStatus: 'BETTING',
          countdownSeconds: data.countdownSeconds,
          commentary: data.commentary,
          positions: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          winner: null,
          podium: [],
          myBets: updatedBets,
          currentRound: state.currentRound
            ? { ...state.currentRound, roundNumber: data.roundNumber, status: 'BETTING', countdownSeconds: data.countdownSeconds }
            : null,
        };
      });
    };

    // 2. Race Started Handler
    const handleRaceStarted = (data: { roundNumber: number; status: HorseRaceStatus; commentary: string }) => {
      set((state) => ({
        raceStatus: 'RACING',
        commentary: data.commentary,
        positions: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        currentRound: state.currentRound
          ? { ...state.currentRound, roundNumber: data.roundNumber, status: 'RACING' }
          : null,
      }));
    };

    // 3. Race Live Ticks
    const handleTick = (data: { roundNumber: number; positions: Record<number, number>; commentary: string }) => {
      set({
        raceStatus: 'RACING',
        positions: data.positions,
        commentary: data.commentary,
      });
    };

    // 4. Race Finished Handler
    const handleFinished = (data: { roundNumber: number; winner: number; podium: number[]; seed: string; hash: string; commentary: string }) => {
      set((state) => ({
        raceStatus: 'FINISHED',
        winner: data.winner,
        podium: data.podium,
        commentary: data.commentary,
        currentRound: state.currentRound
          ? {
              ...state.currentRound,
              roundNumber: data.roundNumber,
              status: 'FINISHED',
              winner: data.winner,
              podium: data.podium,
              serverSeed: data.seed,
            }
          : null,
      }));

      useWalletStore.getState().fetchBalance();
      get().fetchMyHistory();
      get().fetchStats();
    };

    // 5. Personal Payout Notification
    const handleUserPayout = (data: { betId: string; roundNumber: number; payoutAmount: number; newBalance: number }) => {
      if (typeof data.newBalance === 'number') {
        useWalletStore.getState().updateBalanceLocally(data.newBalance);
      }
      useWalletStore.getState().fetchBalance();
      get().fetchMyHistory();
    };

    socket.on('horserace:countdown' as any, handleCountdown);
    socket.on('horserace:race_started' as any, handleRaceStarted);
    socket.on('horserace:tick' as any, handleTick);
    socket.on('horserace:finished' as any, handleFinished);
    socket.on('horserace:user_payout' as any, handleUserPayout);

    return () => {
      (socket as any).emit('horserace:leave');
      socket.off('horserace:countdown' as any, handleCountdown);
      socket.off('horserace:race_started' as any, handleRaceStarted);
      socket.off('horserace:tick' as any, handleTick);
      socket.off('horserace:finished' as any, handleFinished);
      socket.off('horserace:user_payout' as any, handleUserPayout);
    };
  },
}));
