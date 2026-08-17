import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'accent' | 'gold' | 'pink' | 'cyan' | 'warning' | 'danger' | 'neutral' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm gap-2',
  };

  const variantStyles = {
    primary: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 shadow-sm',
    accent: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 shadow-sm',
    gold: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-sm',
    pink: 'bg-pink-500/15 text-pink-600 dark:text-pink-300 border border-pink-500/30 shadow-sm',
    cyan: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-sm',
    warning: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30',
    danger: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 shadow-sm',
    neutral: 'bg-slate-200 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/60',
    outline: 'bg-transparent text-arena-muted border border-arena-border',
  };

  const dotColors = {
    primary: 'bg-indigo-400 animate-pulse',
    accent: 'bg-emerald-400 animate-pulse',
    gold: 'bg-amber-400 animate-pulse',
    pink: 'bg-pink-400 animate-pulse',
    cyan: 'bg-cyan-400 animate-pulse',
    warning: 'bg-yellow-400 animate-pulse',
    danger: 'bg-rose-400 animate-pulse',
    neutral: 'bg-slate-400',
    outline: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center font-bold font-display uppercase tracking-wider rounded-lg backdrop-blur-md ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
