import React from 'react';
import { CalledBall, BingoColumnLetter } from '@bingo/shared';

interface BingoBallProps {
  ball: CalledBall | { number: number; letter: BingoColumnLetter };
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'giant';
  showLetter?: boolean;
  isNew?: boolean;
  className?: string;
}

export const BingoBall: React.FC<BingoBallProps> = ({
  ball,
  size = 'md',
  showLetter = true,
  isNew = false,
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
    giant: 'w-36 h-36 md:w-44 md:h-44 text-5xl md:text-6xl',
  };

  const letterBadgeSize = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm font-extrabold',
    giant: 'text-lg md:text-xl font-black tracking-widest',
  };

  // Vivid column themes with realistic radial gradients
  const columnTheme: Record<string, { bg: string; glow: string; ring: string; badge: string }> = {
    B: {
      bg: 'radial-gradient(circle at 35% 28%, #67E8F9 0%, #06B6D4 45%, #0E7490 85%, #164E63 100%)',
      glow: 'rgba(6, 182, 212, 0.5)',
      ring: 'border-cyan-300/40',
      badge: 'bg-cyan-950 text-cyan-300 border-cyan-400/40',
    },
    I: {
      bg: 'radial-gradient(circle at 35% 28%, #F472B6 0%, #EC4899 45%, #BE185D 85%, #831843 100%)',
      glow: 'rgba(236, 72, 153, 0.5)',
      ring: 'border-pink-300/40',
      badge: 'bg-pink-950 text-pink-300 border-pink-400/40',
    },
    N: {
      bg: 'radial-gradient(circle at 35% 28%, #FDE047 0%, #F59E0B 45%, #D97706 85%, #78350F 100%)',
      glow: 'rgba(245, 158, 11, 0.55)',
      ring: 'border-amber-300/40',
      badge: 'bg-amber-950 text-amber-300 border-amber-400/40',
    },
    G: {
      bg: 'radial-gradient(circle at 35% 28%, #6EE7B7 0%, #10B981 45%, #047857 85%, #064E3B 100%)',
      glow: 'rgba(16, 185, 129, 0.5)',
      ring: 'border-emerald-300/40',
      badge: 'bg-emerald-950 text-emerald-300 border-emerald-400/40',
    },
    O: {
      bg: 'radial-gradient(circle at 35% 28%, #FB923C 0%, #F97316 45%, #C2410C 85%, #7C2D12 100%)',
      glow: 'rgba(249, 115, 22, 0.5)',
      ring: 'border-orange-300/40',
      badge: 'bg-orange-950 text-orange-300 border-orange-400/40',
    },
    K: {
      bg: 'radial-gradient(circle at 35% 28%, #C084FC 0%, #9333EA 45%, #6B21A8 85%, #3B0764 100%)',
      glow: 'rgba(147, 51, 234, 0.55)',
      ring: 'border-purple-300/40',
      badge: 'bg-purple-950 text-purple-300 border-purple-400/40',
    },
  };

  const letterKey =
    (ball as any).letter ||
    (ball.number <= 15
      ? 'B'
      : ball.number <= 30
      ? 'I'
      : ball.number <= 45
      ? 'N'
      : ball.number <= 60
      ? 'G'
      : ball.number <= 75
      ? 'O'
      : 'K');

  const theme = columnTheme[letterKey] || columnTheme.B;

  return (
    <div
      className={`bingo-sphere flex flex-col items-center justify-center select-none font-display font-black text-white relative transition-transform ${
        sizeMap[size]
      } ${isNew ? 'animate-pop-in' : ''} ${className}`}
      style={
        {
          background: theme.bg,
          '--ball-glow': theme.glow,
        } as React.CSSProperties
      }
    >
      {/* 3D Specular Highlight Oval */}
      <div className="absolute top-[8%] left-[16%] w-[36%] h-[24%] rounded-full bg-gradient-to-b from-white/75 to-transparent pointer-events-none" />

      {/* Inner White Ball Center Stamp */}
      <div
        className={`rounded-full bg-slate-950/40 backdrop-blur-xs flex flex-col items-center justify-center border border-white/20 shadow-inner ${
          size === 'giant'
            ? 'w-[74%] h-[74%]'
            : size === 'xl'
            ? 'w-[72%] h-[72%]'
            : 'w-[80%] h-[80%]'
        }`}
      >
        {showLetter && (
          <span
            className={`font-black uppercase tracking-widest text-white drop-shadow-md leading-none ${letterBadgeSize[size]}`}
          >
            {ball.letter}
          </span>
        )}
        <span className="font-mono font-extrabold text-white leading-none drop-shadow-md">
          {ball.number}
        </span>
      </div>
    </div>
  );
};
