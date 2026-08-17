import { create } from 'zustand';
import { WalletBalance, WalletTransactionDTO, DepositInput, WithdrawalInput } from '@bingo/shared';
import { api } from '../services/api';

interface WalletState {
  balance: WalletBalance | null;
  transactions: WalletTransactionDTO[];
  totalTransactions: number;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  fetchBalance: () => Promise<void>;
  fetchTransactions: (page?: number, limit?: number) => Promise<void>;
  deposit: (input: DepositInput) => Promise<void>;
  withdraw: (input: WithdrawalInput) => Promise<void>;
  updateBalanceLocally: (newBalance: number) => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balance: null,
  transactions: [],
  totalTransactions: 0,
  isLoading: false,
  isProcessing: false,
  error: null,

  fetchBalance: async () => {
    try {
      set({ isLoading: true, error: null });
      const balance = await api.get<WalletBalance>('/wallet/balance');
      set({ balance, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: (error as Error).message });
    }
  },

  fetchTransactions: async (page = 1, limit = 50) => {
    try {
      set({ isLoading: true, error: null });
      const data = await api.get<{ transactions: WalletTransactionDTO[]; total: number }>(
        `/wallet/transactions?page=${page}&limit=${limit}`
      );
      set({
        transactions: data.transactions,
        totalTransactions: data.total,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false, error: (error as Error).message });
    }
  },

  deposit: async (input: DepositInput) => {
    try {
      set({ isProcessing: true, error: null });
      const result = await api.post<{ balance: WalletBalance; transaction: WalletTransactionDTO }>(
        '/wallet/demo-deposit',
        input
      );
      set((state) => ({
        balance: result.balance,
        transactions: [result.transaction, ...state.transactions],
        isProcessing: false,
      }));
    } catch (error) {
      set({ isProcessing: false, error: (error as Error).message });
      throw error;
    }
  },

  withdraw: async (input: WithdrawalInput) => {
    try {
      set({ isProcessing: true, error: null });
      const result = await api.post<{ balance: WalletBalance; transaction: WalletTransactionDTO }>(
        '/wallet/demo-withdrawal',
        input
      );
      set((state) => ({
        balance: result.balance,
        transactions: [result.transaction, ...state.transactions],
        isProcessing: false,
      }));
    } catch (error) {
      set({ isProcessing: false, error: (error as Error).message });
      throw error;
    }
  },

  updateBalanceLocally: (newBalance: number) => {
    set((state) => ({
      balance: state.balance
        ? { ...state.balance, availableBalance: newBalance, totalBalance: newBalance + state.balance.lockedBalance }
        : null,
    }));
  },
}));
