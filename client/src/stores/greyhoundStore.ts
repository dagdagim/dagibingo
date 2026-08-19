import { create } from 'zustand';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { useAuthStore } from './authStore';
import { useWalletStore } from './walletStore';
import {
  GreyhoundRaceStatus,
  GreyhoundBetType,
  IGreyhound,
  IGreyhoundRoundDTO,
  IGreyhoundBetDTO,
  GreyhoundStatsDTO,
} from '../shared';

const DEFAULT_GREYHOUND_ROSTER: IGreyhound[] = [
  { trapNumber: 1, name: '⚡ Blitzing Bullet', color: '#1e293b', vestColor: '#ef4444', vestTextColor: '#ffffff', winOdds: 2.4, placeOdds: 1.35, form: '1-1-1', avatar: '🐕' },
  { trapNumber: 2, name: '🔥 Apex Phantom', color: '#d97706', vestColor: '#3b82f6', vestTextColor: '#ffffff', winOdds: 3.8, placeOdds: 1.75, form: '2-1-2', avatar: '🐕' },
  { trapNumber: 3, name: '👑 Silver Sonic', color: '#94a3b8', vestColor: '#f8fafc', vestTextColor: '#0f172a', winOdds: 5.5, placeOdds: 2.3, form: '1-3-1', avatar: '🐕' },
  { trapNumber: 4, name: '🌪️ Night Stalker', color: '#0f172a', vestColor: '#18181b', vestTextColor: '#ffffff', winOdds: 8.0, placeOdds: 3.2, form: '3-2-2', avatar: '🐕' },
  { trapNumber: 5, name: '💎 Golden Flash', color: '#78350f', vestColor: '#f97316', vestTextColor: '#ffffff', winOdds: 14.0, placeOdds: 5.5, form: '4-1-3', avatar: '🐕' },
  { trapNumber: 6, name: '🚀 Turbo Tornado', color: '#334155', vestColor: '#10b981', vestTextColor: '#ffffff', winOdds: 26.0, placeOdds: 9.0, form: '5-2-4', avatar: '🐕' },
];

interface GreyhoundState {
  currentRound: IGreyhoundRoundDTO | null;
  roster: IGreyhound[];
  raceStatus: GreyhoundRaceStatus;
  positions: Record<number, number>;
  harePosition: number;
  countdownSeconds: number;
  commentary: string;
  winner: number | null;
  podium: number[];
  myBets: IGreyhoundBetDTO[];
  myHistory: IGreyhoundBetDTO[];
  stats: GreyhoundStatsDTO | null;

  selectedBetType: GreyhoundBetType;
  selectedTrap: number;
  selectedSecondTrap: number | null;
  betAmount: number;
  isPlacingBet: boolean;
  soundEnabled: boolean;
  error: string | null;

  setSelectedBetType: (type: GreyhoundBetType) => void;
  setSelectedTrap: (trapNumber: number) => void;
  setSelectedSecondTrap: (trapNumber: number | null) => void;
  setBetAmount: (amount: number) => void;
  toggleSound: () => void;
  setError: (error: string | null) => void;

  placeBet: () => Promise<void>;
  fetchMyHistory: () => Promise<void>;
  fetchStats: () => Promise<void>;
  initSocketListeners: () => () => void;
}

export const useGreyhoundStore = create<GreyhoundState>((set, get) => ({
  currentRound: null,
  roster: DEFAULT_GREYHOUND_ROSTER,
  raceStatus: 'BETTING',
  positions: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  harePosition: 0,
  countdownSeconds: 15,
  commentary: 'Hounds are loaded in traps! Mechanical lure on standby. Place your bets.',
  winner: null,
  podium: [],
  myBets: [],
  myHistory: [],
  stats: null,

  selectedBetType: 'WIN',
  selectedTrap: 1,
  selectedSecondTrap: null,
  betAmount: 10,
  isPlacingBet: false,
  soundEnabled: true,
  error: null,

  setSelectedBetType: (type) => {
    set((state) => ({
      selectedBetType: type,
      selectedSecondTrap: type === 'EXACTA' ? (state.selectedTrap === 1 ? 2 : 1) : null,
    }));
  },

  setSelectedTrap: (num) => {
    set((state) => ({
      selectedTrap: num,
      selectedSecondTrap:
        state.selectedBetType === 'EXACTA' && state.selectedSecondTrap === num
          ? num === 1
            ? 2
            : 1
          : state.selectedSecondTrap,
    }));
  },

  setSelectedSecondTrap: (num) => {
    set({ selectedSecondTrap: num });
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
    const { selectedBetType, selectedTrap, selectedSecondTrap, betAmount, isPlacingBet } = get();
    if (isPlacingBet) return;

    const token = useAuthStore.getState().token;
    if (!token) {
      set({ error: 'Please log in to place greyhound bets.' });
      return;
    }

    if (selectedBetType === 'EXACTA' && (!selectedSecondTrap || selectedSecondTrap === selectedTrap)) {
      set({ error: 'Please select two different traps for Exacta.' });
      return;
    }

    set({ isPlacingBet: true, error: null });

    try {
      const res = await api.post<any>('/greyhound/bet', {
        betType: selectedBetType,
        trapNumber: selectedTrap,
        secondTrapNumber: selectedBetType === 'EXACTA' ? selectedSecondTrap : undefined,
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
      const res = await api.get<any>('/greyhound/my-history?limit=25');
      const data = res?.data || res;
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      set({ myHistory: list });
    } catch {
      // Ignore
    }
  },

  fetchStats: async () => {
    try {
      const res = await api.get<any>('/greyhound/stats');
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

    (socket as any).emit('greyhound:join', (response: any) => {
      if (response?.round) {
        set({
          currentRound: response.round,
          roster: response.roster || DEFAULT_GREYHOUND_ROSTER,
          raceStatus: response.round.status,
          positions: response.round.positions || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          harePosition: response.round.harePosition || 0,
          countdownSeconds: response.round.countdownSeconds || 15,
          commentary: response.round.commentary || 'Hounds are loaded in traps! Mechanical lure on standby.',
          winner: response.round.winner,
          podium: response.round.podium || [],
          myBets: response.myBets || [],
        });
      }
    });

    const handleCountdown = (data: { roundNumber: number; countdownSeconds: number; status: GreyhoundRaceStatus; commentary: string }) => {
      set((state) => {
        let updatedBets = state.myBets;
        if (data.countdownSeconds >= 14) {
          updatedBets = state.myBets.filter((b) => b.roundNumber === data.roundNumber);
        }

        return {
          raceStatus: 'BETTING',
          countdownSeconds: data.countdownSeconds,
          commentary: data.commentary,
          positions: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          harePosition: 0,
          winner: null,
          podium: [],
          myBets: updatedBets,
          currentRound: state.currentRound
            ? { ...state.currentRound, roundNumber: data.roundNumber, status: 'BETTING', countdownSeconds: data.countdownSeconds }
            : null,
        };
      });
    };

    const handleRaceStarted = (data: { roundNumber: number; status: GreyhoundRaceStatus; commentary: string }) => {
      set((state) => ({
        raceStatus: 'RACING',
        commentary: data.commentary,
        positions: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        harePosition: 0,
        currentRound: state.currentRound
          ? { ...state.currentRound, roundNumber: data.roundNumber, status: 'RACING' }
          : null,
      }));
    };

    const handleTick = (data: { roundNumber: number; positions: Record<number, number>; harePosition: number; commentary: string }) => {
      set({
        raceStatus: 'RACING',
        positions: data.positions,
        harePosition: data.harePosition,
        commentary: data.commentary,
      });
    };

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

    const handleUserPayout = (data: { betId: string; roundNumber: number; payoutAmount: number; newBalance: number }) => {
      if (typeof data.newBalance === 'number') {
        useWalletStore.getState().updateBalanceLocally(data.newBalance);
      }
      useWalletStore.getState().fetchBalance();
      get().fetchMyHistory();
    };

    socket.on('greyhound:countdown' as any, handleCountdown);
    socket.on('greyhound:race_started' as any, handleRaceStarted);
    socket.on('greyhound:tick' as any, handleTick);
    socket.on('greyhound:finished' as any, handleFinished);
    socket.on('greyhound:user_payout' as any, handleUserPayout);

    return () => {
      (socket as any).emit('greyhound:leave');
      socket.off('greyhound:countdown' as any, handleCountdown);
      socket.off('greyhound:race_started' as any, handleRaceStarted);
      socket.off('greyhound:tick' as any, handleTick);
      socket.off('greyhound:finished' as any, handleFinished);
      socket.off('greyhound:user_payout' as any, handleUserPayout);
    };
  },
}));
