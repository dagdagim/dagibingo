import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={twMerge(
        clsx('animate-pulse rounded-xl bg-arena-elevated/70 border border-arena-border/50', className)
      )}
    />
  );
};
