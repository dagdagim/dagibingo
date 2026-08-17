import React, { useState } from 'react';
import { CalledBall, BINGO_COLUMNS, BingoColumnLetter } from '@bingo/shared';
import { BingoBall } from './BingoBall';
import { Button } from '../ui/Button';
import { ChevronDown, ChevronUp, History, Sparkles, LayoutGrid } from 'lucide-react';

interface CalledNumberHistoryProps {
  calledBalls: CalledBall[];
  totalCalled: number;
}

export const CalledNumberHistory: React.FC<CalledNumberHistoryProps> = ({
  calledBalls,
  totalCalled,
}) => {
  const [showFullBoard, setShowFullBoard] = useState(false);

  const recentBalls = [...calledBalls].reverse().slice(0, 6);
  const currentBall = recentBalls[0] || null;
  const previousBalls = recentBalls.slice(1);

  const isNumberCalled = (num: number) => {
    return calledBalls.some((b) => b.number === num);
  };

  const columns: BingoColumnLetter[] = ['B', 'I', 'N', 'G', 'O'];

  const columnThemes: Record<BingoColumnLetter, { header: string; activeBadge: string; text: string }> = {
    B: { header: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/30', activeBadge: 'bg-cyan-500 text-slate-950 shadow-cyan-glow font-black', text: 'text-cyan-500' },
    I: { header: 'bg-pink-500/20 text-pink-600 dark:text-pink-300 border-pink-500/30', activeBadge: 'bg-pink-500 text-slate-950 shadow-pink-glow font-black', text: 'text-pink-500' },
    N: { header: 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30', activeBadge: 'bg-amber-500 text-slate-950 shadow-gold-glow font-black', text: 'text-amber-500' },
    G: { header: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30', activeBadge: 'bg-emerald-500 text-slate-950 shadow-accent-glow font-black', text: 'text-emerald-500' },
    O: { header: 'bg-orange-500/20 text-orange-600 dark:text-orange-300 border-orange-500/30', activeBadge: 'bg-orange-500 text-slate-950 shadow-orange-500/40 font-black', text: 'text-orange-500' },
  };

  return (
    <div className="glass-panel-elevated rounded-2xl p-3 sm:p-4 space-y-3">
      {/* Header with Title and Toggle */}
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-arena-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black font-display text-arena-text flex items-center gap-2">
              Called Feed
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[11px] font-mono font-bold">
                {totalCalled} / 75
              </span>
            </h3>
          </div>
        </div>

        {/* 75-Ball Master Board Toggle Button */}
        <button
          type="button"
          onClick={() => setShowFullBoard(!showFullBoard)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            showFullBoard
              ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-400/40 shadow-xs'
              : 'bg-arena-surface text-arena-muted hover:text-arena-text border-arena-border hover:border-indigo-400/30'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>{showFullBoard ? 'Hide 75 Board' : 'Show 75 Board'}</span>
          {showFullBoard ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Recent Balls Horizontal Chain */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
        {currentBall ? (
          <div className="flex items-center gap-2.5 bg-arena-surface px-2.5 py-1.5 rounded-xl border border-arena-border shadow-xs flex-shrink-0">
            <BingoBall ball={currentBall} size="md" isNew />
            <div className="pr-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 block">
                • LATEST
              </span>
              <span className="text-xs font-black font-display text-arena-text">
                {currentBall.letter}-{currentBall.number}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-2 text-xs text-arena-subtle italic">Awaiting ball draw...</div>
        )}

        {/* Previous Balls */}
        {previousBalls.length > 0 && (
          <div className="flex items-center gap-2 flex-1">
            {previousBalls.map((ball) => (
              <BingoBall key={ball.timestamp} ball={ball} size="sm" />
            ))}
          </div>
        )}
      </div>

      {/* Compact 75-Ball Master Grid Board */}
      {showFullBoard && (
        <div className="pt-2.5 border-t border-arena-border space-y-1.5 animate-pop-in">
          <div className="flex items-center justify-between text-[10px] font-bold text-arena-muted pb-1">
            <span>75-BALL AUDIT BOARD</span>
            <span>{Math.round((totalCalled / 75) * 100)}% COMPLETED</span>
          </div>

          <div className="space-y-1 overflow-x-auto pb-1">
            {columns.map((col) => {
              const range = BINGO_COLUMNS[col];
              const theme = columnThemes[col];
              const numbers = Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i);

              return (
                <div key={col} className="flex items-center gap-1 min-w-[340px]">
                  {/* Column Letter Pill */}
                  <div
                    className={`w-6 h-6 rounded-md font-black font-display text-[11px] flex items-center justify-center flex-shrink-0 border ${theme.header}`}
                  >
                    {col}
                  </div>

                  {/* 15 Numbers in a compact tight row */}
                  <div className="grid grid-cols-15 gap-0.5 sm:gap-1 flex-1">
                    {numbers.map((num) => {
                      const called = isNumberCalled(num);
                      return (
                        <div
                          key={num}
                          className={`h-6 rounded-md font-mono text-[10px] sm:text-[11px] font-bold flex items-center justify-center transition-all ${
                            called
                              ? `${theme.activeBadge} scale-105`
                              : 'bg-arena-surface/80 text-arena-subtle border border-arena-border/60 hover:border-arena-border'
                          }`}
                          title={`${col}-${num} ${called ? '(Called)' : '(Not called)'}`}
                        >
                          {num}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

