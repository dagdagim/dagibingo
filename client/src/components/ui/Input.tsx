import React, { InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-arena-muted uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-arena-muted">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full bg-arena-surface border border-arena-border text-arena-text text-sm rounded-xl px-4 py-3 placeholder:text-arena-subtle transition-all duration-200 focus:outline-none focus:border-arena-primary focus:ring-1 focus:ring-arena-primary',
                leftIcon && 'pl-10',
                rightIcon && 'pr-10',
                error && 'border-arena-danger focus:border-arena-danger focus:ring-arena-danger',
                className
              )
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-arena-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-arena-danger font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-arena-muted">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
