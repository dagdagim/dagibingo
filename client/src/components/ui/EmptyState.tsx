import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-2xl bg-arena-surface border border-arena-border">
      {icon && <div className="p-4 rounded-2xl bg-arena-elevated border border-arena-border text-arena-primary mb-4">{icon}</div>}
      <h3 className="text-lg font-bold font-display text-white">{title}</h3>
      <p className="text-sm text-arena-muted max-w-sm mt-1 mb-6">{description}</p>
      {actionText && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
