import { create } from 'zustand';

export type ThemeMode = 'bright' | 'dark';

interface ThemeState {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  initTheme: () => void;
}

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'bright';
  const saved = localStorage.getItem('bingo_theme');
  if (saved === 'dark' || saved === 'bright') {
    return saved;
  }
  return 'bright'; // Default to bright warm mode
};

const applyThemeToDOM = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('bright', 'cream');
  } else {
    root.classList.remove('dark');
    root.classList.add('bright');
  }
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),

  toggleTheme: () => {
    const nextTheme: ThemeMode = get().theme === 'bright' ? 'dark' : 'bright';
    localStorage.setItem('bingo_theme', nextTheme);
    applyThemeToDOM(nextTheme);
    set({ theme: nextTheme });
  },

  setTheme: (theme: ThemeMode) => {
    localStorage.setItem('bingo_theme', theme);
    applyThemeToDOM(theme);
    set({ theme });
  },

  initTheme: () => {
    const currentTheme = get().theme;
    applyThemeToDOM(currentTheme);
  },
}));
