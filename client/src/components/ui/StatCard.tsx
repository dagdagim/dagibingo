import React from 'react';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon,
  trend,
  accentColor = '#6366F1',
}) => {
  return (
    <Card elevated className="p-5 relative overflow-hidden group hover:border-white/20 transition-all duration-300">
      {/* Background radial glow */}
      <div
        className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-15 transition-opacity group-hover:opacity-30 pointer-events-none"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-start justify-between">
        <span className="text-xs font-bold text-arena-muted uppercase tracking-wider font-display">
          {label}
        </span>
        {icon && (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110"
            style={{
              backgroundColor: `${accentColor}18`,
              borderColor: `${accentColor}35`,
              color: accentColor,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl lg:text-3xl font-black font-display text-white tracking-tight">
          {value}
        </div>

        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <span
              className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded-md ${
                trend.isPositive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {trend.isPositive ? '+' : ''}
              {trend.value}
            </span>
          )}
          {subValue && (
            <span className="text-xs text-arena-subtle font-medium truncate">
              {subValue}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
