import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { useWalletStore } from './walletStore';
import { useAuthStore } from './authStore';
import {
  PlinkoRisk,
  PlinkoRows,
  PlinkoDropResult,
  PlinkoStats,
} from '../shared';

export interface VisualBall {
  id: string;
  dropId: string;
  betAmount: number;
  rows: PlinkoRows;
  risk: PlinkoRisk;
  path: number[];
  bucketIndex: number;
  multiplier: number;
  payoutAmount: number;
  status: 'WON' | 'LOST';
  startTime: number;
  durationMs: number;
  color: string;
}

interface PlinkoState {
  betAmount: number;
  rows: PlinkoRows;
  risk: PlinkoRisk;
  soundEnabled: boolean;
  animationSpeed: 'normal' | 'fast' | 'instant';
  isDropping: boolean;
  isAutoPlaying: boolean;
  autoPlayCountRemaining: number;
  
  myHistory: PlinkoDropResult[];
  liveFeed: (PlinkoDropResult & { username?: string })[];
  stats: PlinkoStats | null;
  
  visualBalls: VisualBall[];
  lastHitMultipliers: Array<{ id: string; multiplier: number; risk: PlinkoRisk; amount: number }>;
  bucketPulseIndex: number | null;
  
  // Actions
  setBetAmount: (amount: number) => void;
  setRows: (rows: PlinkoRows) => void;
  setRisk: (risk: PlinkoRisk) => void;
  setAnimationSpeed: (speed: 'normal' | 'fast' | 'instant') => void;
  toggleSound: () => void;
  
  dropBall: () => Promise<PlinkoDropResult | null>;
  dropBatch: (count: number) => Promise<void>;
  startAutoPlay: (count?: number) => void;
  stopAutoPlay: () => void;
  
  fetchMyHistory: () => Promise<void>;
  fetchStats: () => Promise<void>;
  addVisualBall: (ball: VisualBall) => void;
  removeVisualBall: (id: string) => void;
  triggerBucketPulse: (index: number) => void;
}

const BALL_COLORS = [
  '#f59e0b', // amber
  '#ec4899', // pink
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#06b6d4', // cyan
];

export const usePlinkoStore = create<PlinkoState>()(
  persist(
    (set, get) => ({
      betAmount: 10,
      rows: 16,
      risk: 'MEDIUM',
      soundEnabled: true,
      animationSpeed: 'normal',
      isDropping: false,
      isAutoPlaying: false,
      autoPlayCountRemaining: 0,
      
      myHistory: [],
      liveFeed: [],
      stats: null,
      
      visualBalls: [],
      lastHitMultipliers: [],
      bucketPulseIndex: null,

      setBetAmount: (amount: number) => {
        set({ betAmount: Math.max(0.5, amount) });
      },

      setRows: (rows: PlinkoRows) => {
        set({ rows });
      },

      setRisk: (risk: PlinkoRisk) => {
        set({ risk });
      },

      setAnimationSpeed: (animationSpeed: 'normal' | 'fast' | 'instant') => {
        set({ animationSpeed });
      },

      toggleSound: () => {
        set((state) => ({ soundEnabled: !state.soundEnabled }));
      },

      triggerBucketPulse: (index: number) => {
        set({ bucketPulseIndex: index });
        setTimeout(() => {
          if (get().bucketPulseIndex === index) {
            set({ bucketPulseIndex: null });
          }
        }, 350);
      },

      addVisualBall: (ball: VisualBall) => {
        set((state) => ({ visualBalls: [...state.visualBalls, ball] }));
      },

      removeVisualBall: (id: string) => {
        set((state) => ({
          visualBalls: state.visualBalls.filter((b) => b.id !== id),
        }));
      },

      /**
       * Drop a single ball
       */
      dropBall: async (): Promise<PlinkoDropResult | null> => {
        const { betAmount, rows, risk, animationSpeed } = get();
        const token = useAuthStore.getState().token;

        try {
          const res = await api.post<any>('/plinko/drop', {
            betAmount,
            rows,
            risk,
          });

          const drop: PlinkoDropResult = res?.data || res;
          if (drop && drop.path) {
            // Update user wallet balance immediately
            if (typeof drop.newBalance === 'number') {
              useWalletStore.getState().updateBalanceLocally(drop.newBalance);
            }
            if (token) {
              useWalletStore.getState().fetchBalance();
            }

            // Determine duration based on speed
            const speedMultiplier = animationSpeed === 'fast' ? 0.5 : animationSpeed === 'instant' ? 0.05 : 1.0;
            const durationMs = (rows * 170 + 400) * speedMultiplier;

            const randomColor = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
            const visualBall: VisualBall = {
              id: `ball_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              dropId: drop.id,
              betAmount: drop.betAmount,
              rows: drop.rows,
              risk: drop.risk,
              path: drop.path,
              bucketIndex: drop.bucketIndex,
              multiplier: drop.multiplier,
              payoutAmount: drop.payoutAmount,
              status: drop.status,
              startTime: Date.now(),
              durationMs,
              color: randomColor,
            };

            get().addVisualBall(visualBall);

            // Record into local history
            set((state) => ({
              myHistory: [drop, ...state.myHistory.slice(0, 49)],
              lastHitMultipliers: [
                {
                  id: drop.id,
                  multiplier: drop.multiplier,
                  risk: drop.risk,
                  amount: drop.payoutAmount,
                },
                ...state.lastHitMultipliers.slice(0, 19),
              ],
            }));

            return drop;
          }
        } catch (err: any) {
          console.error('Error dropping Plinko ball:', err);
          throw err;
        }
        return null;
      },

      /**
       * Drop a batch volley of balls
       */
      dropBatch: async (count: number) => {
        const { betAmount, rows, risk, animationSpeed } = get();
        const token = useAuthStore.getState().token;

        try {
          const res = await api.post<any>('/plinko/batch-drop', {
            betAmount,
            count,
            rows,
            risk,
          });

          const data = res?.data || res;
          const drops: PlinkoDropResult[] = data?.drops || [];

          if (drops.length > 0) {
            if (typeof data?.newBalance === 'number') {
              useWalletStore.getState().updateBalanceLocally(data.newBalance);
            }
            if (token) {
              useWalletStore.getState().fetchBalance();
            }

            const speedMultiplier = animationSpeed === 'fast' ? 0.5 : animationSpeed === 'instant' ? 0.05 : 1.0;
            const baseDuration = (rows * 170 + 400) * speedMultiplier;

            // Spawn balls staggered
            drops.forEach((drop, idx) => {
              setTimeout(() => {
                const randomColor = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
                const visualBall: VisualBall = {
                  id: `ball_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
                  dropId: drop.id,
                  betAmount: drop.betAmount,
                  rows: drop.rows,
                  risk: drop.risk,
                  path: drop.path,
                  bucketIndex: drop.bucketIndex,
                  multiplier: drop.multiplier,
                  payoutAmount: drop.payoutAmount,
                  status: drop.status,
                  startTime: Date.now(),
                  durationMs: baseDuration,
                  color: randomColor,
                };
                get().addVisualBall(visualBall);
              }, idx * 120);
            });

            set((state) => ({
              myHistory: [...drops.reverse(), ...state.myHistory].slice(0, 50),
            }));
          }
        } catch (err: any) {
          console.error('Error in Plinko batch drop:', err);
          throw err;
        }
      },

      startAutoPlay: (count = 100) => {
        set({ isAutoPlaying: true, autoPlayCountRemaining: count });

        const runAutoStep = async () => {
          if (!get().isAutoPlaying || get().autoPlayCountRemaining <= 0) {
            set({ isAutoPlaying: false });
            return;
          }

          try {
            await get().dropBall();
            set((state) => ({ autoPlayCountRemaining: state.autoPlayCountRemaining - 1 }));
            if (get().autoPlayCountRemaining > 0 && get().isAutoPlaying) {
              const delay = get().animationSpeed === 'fast' ? 180 : 350;
              setTimeout(runAutoStep, delay);
            } else {
              set({ isAutoPlaying: false });
            }
          } catch (err) {
            set({ isAutoPlaying: false });
          }
        };

        runAutoStep();
      },

      stopAutoPlay: () => {
        set({ isAutoPlaying: false, autoPlayCountRemaining: 0 });
      },

      fetchMyHistory: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;
        try {
          const res = await api.get<any>('/plinko/my-history?limit=20');
          const history = Array.isArray(res) ? res : res?.data || [];
          set({ myHistory: history });
        } catch (err) {
          console.error('Error fetching plinko history:', err);
        }
      },

      fetchStats: async () => {
        try {
          const res = await api.get<any>('/plinko/stats');
          const data = res?.data || res;
          if (data) {
            set({
              stats: data,
              liveFeed: data.recentDrops || [],
            });
          }
        } catch (err) {
          console.error('Error fetching plinko stats:', err);
        }
      },
    }),
    {
      name: 'dagibingo-plinko-store',
      partialize: (state) => ({
        betAmount: state.betAmount,
        rows: state.rows,
        risk: state.risk,
        soundEnabled: state.soundEnabled,
        animationSpeed: state.animationSpeed,
      }),
    }
  )
);
