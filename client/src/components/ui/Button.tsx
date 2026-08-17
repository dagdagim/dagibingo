import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'gold' | 'danger' | 'outline' | 'ghost' | 'glass';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-bold font-display tracking-wide rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-arena-bg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer select-none';

  const sizeStyles = {
    xs: 'px-2.5 py-1 text-xs gap-1.5',
    sm: 'px-3.5 py-1.5 text-xs gap-2',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5 shadow-lg',
    xl: 'px-8 py-4 text-lg gap-3 shadow-xl',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white shadow-md hover:shadow-indigo-500/25 hover:brightness-105 hover:scale-[1.01] border border-indigo-400/30',
    accent:
      'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black shadow-md hover:shadow-emerald-500/25 hover:brightness-105 hover:scale-[1.01] border border-emerald-400/30',
    gold:
      'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-slate-950 font-black shadow-md hover:shadow-amber-500/25 hover:brightness-105 hover:scale-[1.01] border border-yellow-300/40',
    danger:
      'bg-gradient-to-r from-rose-500 to-red-600 text-white hover:brightness-105 border border-rose-400/30 shadow-md shadow-rose-500/20 hover:scale-[1.01]',
    outline:
      'bg-arena-surface/80 hover:bg-arena-elevated text-arena-text border border-arena-border hover:border-indigo-400/50 hover:text-indigo-400 backdrop-blur-md shadow-xs transition-colors',
    ghost:
      'bg-transparent hover:bg-arena-elevated text-arena-muted hover:text-arena-text border border-transparent transition-colors',
    glass:
      'glass-panel hover:bg-arena-elevated text-arena-text border border-arena-border hover:border-indigo-400/40 backdrop-blur-xl shadow-xs transition-colors',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
