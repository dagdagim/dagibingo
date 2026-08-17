import { create } from 'zustand';
import { UserProfile, LoginInput, RegisterInput, AuthResponse } from '@bingo/shared';
import { api } from '../services/api';
import { socketService } from '../services/socket';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('bingo_access_token'),
  isAuthenticated: !!localStorage.getItem('bingo_access_token'),
  isLoading: false,
  error: null,

  login: async (input: LoginInput) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post<AuthResponse>('/auth/login', input);
      localStorage.setItem('bingo_access_token', data.tokens.accessToken);
      localStorage.setItem('bingo_refresh_token', data.tokens.refreshToken);
      set({
        user: data.user,
        token: data.tokens.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
      // Reconnect socket with new token
      socketService.disconnect();
      socketService.connect();
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error).message || 'Failed to sign in',
      });
      throw error;
    }
  },

  register: async (input: RegisterInput) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post<AuthResponse>('/auth/register', input);
      localStorage.setItem('bingo_access_token', data.tokens.accessToken);
      localStorage.setItem('bingo_refresh_token', data.tokens.refreshToken);
      set({
        user: data.user,
        token: data.tokens.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
      socketService.disconnect();
      socketService.connect();
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error).message || 'Registration failed',
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('bingo_access_token');
      localStorage.removeItem('bingo_refresh_token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
      socketService.disconnect();
    }
  },

  fetchCurrentUser: async () => {
    const token = localStorage.getItem('bingo_access_token');
    if (!token) {
      set({ user: null, isAuthenticated: false });
      return;
    }

    try {
      set({ isLoading: true });
      const user = await api.get<UserProfile>('/users/me');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('bingo_access_token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) => set({ user }),
}));
