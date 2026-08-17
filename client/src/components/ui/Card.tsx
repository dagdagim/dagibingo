import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  interactive?: boolean;
  glow?: 'primary' | 'accent' | 'gold' | 'pink' | 'cyan' | 'none';
}

export const Card: React.FC<CardProps> = ({
  children,
  elevated = false,
  interactive = false,
  glow = 'none',
  className = '',
  ...props
}) => {
  const glowStyles = {
    none: '',
    primary: 'hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10',
    accent: 'hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10',
    gold: 'hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10',
    pink: 'hover:border-pink-500/40 hover:shadow-lg hover:shadow-pink-500/10',
    cyan: 'hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10',
  };

  const baseStyles = elevated
    ? 'glass-panel-elevated rounded-2xl p-6 relative overflow-hidden transition-all duration-200'
    : 'glass-panel rounded-2xl p-6 relative overflow-hidden transition-all duration-200';

  const interactiveStyles = interactive
    ? 'cursor-pointer hover:-translate-y-0.5 hover:border-indigo-500/40 active:scale-[0.99]'
    : '';

  return (
    <div
      className={`${baseStyles} ${interactiveStyles} ${glowStyles[glow]} ${className}`}
      {...props}
    >
      {/* Subtle top gloss line */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
      {children}
    </div>
  );
};
