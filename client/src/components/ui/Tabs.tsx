import React from 'react';
import { clsx } from 'clsx';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={clsx('flex items-center gap-1.5 p-1 bg-arena-surface border border-arena-border rounded-xl overflow-x-auto', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer',
              isActive
                ? 'bg-arena-elevated text-arena-text border border-arena-border shadow-xs'
                : 'text-arena-muted hover:text-arena-text hover:bg-arena-elevated/50'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  isActive ? 'bg-indigo-500 text-white' : 'bg-arena-highlight text-arena-subtle'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
