import React from 'react';
import { TicketGrid, BINGO_LETTERS, FREE_SPACE_VALUE } from '@bingo/shared';
import { Star, Sparkles, Check } from 'lucide-react';

interface BingoCardProps {
  grid: TicketGrid;
  ticketNumber?: number;
  markedPositions: [number, number][];
  onToggleMark?: (row: number, col: number) => void;
  isWinningCard?: boolean;
  winningPositions?: [number, number][];
  isInteractive?: boolean;
}

export const BingoCard: React.FC<BingoCardProps> = ({
  grid,
  ticketNumber = 1,
  markedPositions,
  onToggleMark,
  isWinningCard = false,
  winningPositions = [],
  isInteractive = true,
}) => {
  const isMarked = (r: number, c: number) => {
    return markedPositions.some(([row, col]) => row === r && col === c);
  };

  const isWinningCell = (r: number, c: number) => {
    return winningPositions.some(([row, col]) => row === r && col === c);
  };

  const columnThemes = [
    { letter: 'B', color: 'from-cyan-400 to-cyan-600', text: 'text-cyan-300', border: 'border-cyan-400/40' },
    { letter: 'I', color: 'from-pink-400 to-pink-600', text: 'text-pink-300', border: 'border-pink-400/40' },
    { letter: 'N', color: 'from-amber-400 to-amber-600', text: 'text-amber-300', border: 'border-amber-400/40' },
    { letter: 'G', color: 'from-emerald-400 to-emerald-600', text: 'text-emerald-300', border: 'border-emerald-400/40' },
    { letter: 'O', color: 'from-orange-400 to-orange-600', text: 'text-orange-300', border: 'border-orange-400/40' },
  ];

  return (
    <div
      className={`max-w-[400px] w-full mx-auto glass-panel-elevated p-3.5 sm:p-4 rounded-2xl relative transition-all duration-300 shadow-card-elevated ${
        isWinningCard
          ? 'border-amber-400 shadow-gold-glow bg-gradient-to-b from-amber-500/10 to-arena-elevated'
          : 'border-arena-border hover:border-indigo-500/30'
      }`}
    >
      {/* Top Header Card Info */}
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[11px] font-black font-display uppercase tracking-widest text-arena-text">
            Card #{ticketNumber}
          </span>
        </div>
        {isWinningCard && (
          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
            <Sparkles className="w-2.5 h-2.5 fill-current" />
            WINNER!
          </span>
        )}
      </div>

      {/* Column Headers B - I - N - G - O */}
      <div className="grid grid-cols-5 gap-1.5 mb-1.5">
        {columnThemes.map((col) => (
          <div
            key={col.letter}
            className={`py-1.5 rounded-lg bg-gradient-to-b ${col.color} text-slate-950 font-black font-display text-center text-xs sm:text-sm shadow-sm border ${col.border} tracking-wider flex items-center justify-center`}
          >
            {col.letter}
          </div>
        ))}
      </div>

      {/* 5x5 Number Grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {grid.map((row, rIdx) =>
          row.map((val, cIdx) => {
            const isFree = val === FREE_SPACE_VALUE || (rIdx === 2 && cIdx === 2);
            const marked = isMarked(rIdx, cIdx) || isFree;
            const winning = isWinningCell(rIdx, cIdx);

            return (
              <button
                key={`${rIdx}-${cIdx}`}
                type="button"
                disabled={!isInteractive}
                onClick={() => onToggleMark && onToggleMark(rIdx, cIdx)}
                className={`aspect-square rounded-xl font-bold font-mono flex flex-col items-center justify-center relative transition-all duration-150 select-none overflow-hidden ${
                  winning
                    ? 'winning-cell bg-amber-500/30 text-amber-900 dark:text-amber-200 border-2 border-amber-400'
                    : isFree
                    ? 'daub-stamp free-space text-slate-950 border-2 border-yellow-300'
                    : marked
                    ? 'daub-stamp text-white border-2 border-indigo-300/70 shadow-sm'
                    : 'bg-arena-surface hover:bg-arena-elevated text-arena-text border border-arena-border hover:border-indigo-400/50 hover:scale-105 active:scale-95 shadow-xs'
                }`}
              >
                {isFree ? (
                  <div className="flex flex-col items-center justify-center">
                    <Star className="w-3.5 h-3.5 text-slate-950 fill-current animate-spin-slow" />
                    <span className="text-[8px] font-black uppercase tracking-tight text-slate-950 leading-none mt-0.5">
                      FREE
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="text-sm sm:text-base font-bold tracking-tight">
                      {val}
                    </span>
                    {marked && !winning && (
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-xs" />
                    )}
                  </>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Bottom Card Summary */}
      <div className="mt-2.5 pt-2 border-t border-arena-border flex items-center justify-between text-[10px] text-arena-subtle font-semibold px-0.5">
        <span>Daubed: {markedPositions.length} / 25</span>
        <span className="font-mono text-indigo-500 font-bold">75-BALL CERTIFIED</span>
      </div>
    </div>
  );
};
