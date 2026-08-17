/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        arena: {
          bg: 'var(--arena-bg)',
          surface: 'var(--arena-surface)',
          elevated: 'var(--arena-elevated)',
          highlight: 'var(--arena-highlight)',
          border: 'var(--arena-border)',
          'border-bright': 'var(--arena-border-bright)',
          'border-focus': '#6366F1',
          
          primary: {
            DEFAULT: '#6366F1',
            hover: '#4F46E5',
            light: '#818CF8',
            glow: 'rgba(99, 102, 241, 0.35)',
          },
          accent: {
            DEFAULT: '#10B981',
            hover: '#059669',
            light: '#34D399',
            glow: 'rgba(16, 185, 129, 0.35)',
          },
          gold: {
            DEFAULT: '#F59E0B',
            light: '#FBBF24',
            dark: '#D97706',
            glow: 'rgba(245, 158, 11, 0.4)',
          },
          pink: {
            DEFAULT: '#EC4899',
            light: '#F472B6',
            glow: 'rgba(236, 72, 153, 0.35)',
          },
          cyan: {
            DEFAULT: '#06B6D4',
            light: '#22D3EE',
            glow: 'rgba(6, 182, 212, 0.35)',
          },
          danger: {
            DEFAULT: '#EF4444',
            hover: '#DC2626',
            light: '#F87171',
          },
          warning: {
            DEFAULT: '#F59E0B',
            light: '#FCD34D',
          },
          text: 'var(--arena-text)',
          muted: 'var(--arena-muted)',
          subtle: 'var(--arena-subtle)',

          // Bingo Columns Vibrant Palette
          column: {
            b: '#00D2FF',
            i: '#FF2A85',
            n: '#FFB800',
            g: '#00E575',
            o: '#FF5722',
          }
        },
      },
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'arena-glow': '0 0 25px rgba(99, 102, 241, 0.35)',
        'accent-glow': '0 0 25px rgba(16, 185, 129, 0.35)',
        'gold-glow': '0 0 30px rgba(245, 158, 11, 0.4)',
        'pink-glow': '0 0 25px rgba(236, 72, 153, 0.35)',
        'cyan-glow': '0 0 25px rgba(6, 182, 212, 0.35)',
        'card-elevated': 'var(--arena-shadow-card)',
        'ball-3d': 'inset -4px -6px 12px rgba(0,0,0,0.4), inset 4px 6px 10px rgba(255,255,255,0.9), 0 10px 20px rgba(99,102,241,0.25)',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        'pop-in': 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        popIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
