import React from 'react';
import { GamePattern } from '@bingo/shared';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Trophy, Sparkles, CheckCircle2, Zap, Target, Star, HelpCircle } from 'lucide-react';

interface PatternRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pattern: GamePattern;
  speed?: string;
  entryFee?: number;
  prizePool?: number;
}

interface PatternDetail {
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  howToWin: string[];
  highlightCells: [number, number][]; // [row, col] coordinates to highlight in 5x5 diagram
}

const PATTERN_CONFIG: Record<GamePattern, PatternDetail> = {
  CLASSIC: {
    title: 'Classic Line Bingo',
    subtitle: '1-Line Standard Rule',
    badge: 'Classic',
    description: 'The traditional beloved Bingo rule. Complete any single line across the card to achieve BINGO.',
    howToWin: [
      'Any 1 Horizontal Row (5 numbers in a row)',
      'Any 1 Vertical Column (5 numbers in a column)',
      'Any 1 Diagonal Line (5 numbers from corner to corner through the FREE space)',
    ],
    // Highlighting diagonal + center row as visual example
    highlightCells: [
      [0, 0], [1, 1], [2, 2], [3, 3], [4, 4],
      [2, 0], [2, 1], [2, 3], [2, 4],
    ],
  },
  FOUR_CORNERS: {
    title: 'Four Corners Blitz',
    subtitle: '4-Corners Special Pattern',
    badge: 'Specialty',
    description: 'Focus solely on the perimeter! Only the four extreme outer corners of your card count toward victory.',
    howToWin: [
      'Top-Left Corner (Row 1, Col 1)',
      'Top-Right Corner (Row 1, Col 5)',
      'Bottom-Left Corner (Row 5, Col 1)',
      'Bottom-Right Corner (Row 5, Col 5)',
    ],
    highlightCells: [
      [0, 0], [0, 4], [2, 2], [4, 0], [4, 4],
    ],
  },
  X_PATTERN: {
    title: 'X-Factor Challenge',
    subtitle: 'Double Diagonal Intersect',
    badge: 'Tournament',
    description: 'Form a massive "X" across the entire board by completing both intersecting diagonals simultaneously.',
    howToWin: [
      'Main Diagonal: Top-Left to Bottom-Right',
      'Anti Diagonal: Top-Right to Bottom-Left',
      'Both diagonals must be fully completed to claim BINGO',
    ],
    highlightCells: [
      [0, 0], [0, 4],
      [1, 1], [1, 3],
      [2, 2],
      [3, 1], [3, 3],
      [4, 0], [4, 4],
    ],
  },
  FULL_HOUSE: {
    title: 'Mega Full House (Blackout)',
    subtitle: 'Coverall 25-Space Jackpot',
    badge: 'Grand Jackpot',
    description: 'The ultimate Bingo challenge! You must cover every single number on your 5x5 card for the grand prize pool.',
    howToWin: [
      'All 24 numbered spaces must be called and marked',
      'The center FREE space counts automatically',
      'Highest prize pool and highest excitement!',
    ],
    highlightCells: [
      [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
      [1, 0], [1, 1], [1, 2], [1, 3], [1, 4],
      [2, 0], [2, 1], [2, 2], [2, 3], [2, 4],
      [3, 0], [3, 1], [3, 2], [3, 3], [3, 4],
      [4, 0], [4, 1], [4, 2], [4, 3], [4, 4],
    ],
  },
  SPEED_BINGO: {
    title: 'Turbo Speed Bingo',
    subtitle: 'Fast 3s Single Line Sprint',
    badge: 'Rapid Fire',
    description: 'Balls are drawn rapidly every 3 seconds! Complete any single row, column, or diagonal as quickly as possible.',
    howToWin: [
      'Rapid 3-second call intervals',
      'Complete any single line (Row, Column, or Diagonal)',
      'Stay alert and keep Auto-Daub enabled for maximum reaction speed!',
    ],
    highlightCells: [
      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
      [2, 0], [2, 1], [2, 3], [2, 4],
    ],
  },
};

export const PatternRulesModal: React.FC<PatternRulesModalProps> = ({
  isOpen,
  onClose,
  pattern,
  speed,
  entryFee,
  prizePool,
}) => {
  const config = PATTERN_CONFIG[pattern] || PATTERN_CONFIG.CLASSIC;

  const isHighlighted = (r: number, c: number) => {
    return config.highlightCells.some(([row, col]) => row === r && col === c);
  };

  const columnLetters = ['B', 'I', 'N', 'G', 'O'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Room Winning Rules & Pattern" maxWidth="lg">
      <div className="space-y-6 pt-2">
        {/* Header Title Chip */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-pink-500/15 border border-indigo-400/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-arena-glow flex-shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h3 className="text-lg font-black font-display text-arena-text">{config.title}</h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-400/30">
                  {config.badge}
                </span>
              </div>
              <p className="text-xs text-arena-muted mt-0.5">{config.subtitle}</p>
            </div>
          </div>

          {prizePool && prizePool > 0 && (
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-right flex-shrink-0">
              <span className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest block">
                Prize Pool
              </span>
              <span className="font-mono font-black text-base gradient-text-gold leading-none">
                {prizePool.toLocaleString()} ETB
              </span>
            </div>
          )}
        </div>

        {/* 2-Column: 5x5 Mini Visual Pattern Board + Rules List */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Visual 5x5 Pattern Diagram */}
          <div className="md:col-span-5 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-arena-muted mb-2 block">
              TARGET WINNING PATTERN
            </span>

            <div className="w-56 p-3 rounded-2xl bg-arena-surface border border-arena-border shadow-card-elevated">
              {/* Columns Header B-I-N-G-O */}
              <div className="grid grid-cols-5 gap-1 mb-1 text-center">
                {columnLetters.map((l) => (
                  <span key={l} className="text-[10px] font-black font-display text-arena-muted">
                    {l}
                  </span>
                ))}
              </div>

              {/* 5x5 Grid Cells */}
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: 5 }).map((_, r) =>
                  Array.from({ length: 5 }).map((_, c) => {
                    const isCenter = r === 2 && c === 2;
                    const highlighted = isHighlighted(r, c);

                    return (
                      <div
                        key={`${r}-${c}`}
                        className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                          isCenter
                            ? 'bg-yellow-400/30 text-yellow-800 dark:text-yellow-200 border border-yellow-400/60 shadow-xs'
                            : highlighted
                            ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black shadow-xs scale-105 animate-pulse-subtle'
                            : 'bg-arena-elevated/40 text-arena-subtle border border-arena-border/50'
                        }`}
                      >
                        {isCenter ? (
                          <Star className="w-3 h-3 text-amber-500 fill-current" />
                        ) : highlighted ? (
                          <CheckCircle2 className="w-3 h-3 text-slate-950" />
                        ) : (
                          '•'
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-2 text-center">
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight">
                  ✨ Gold cells = Win Condition
                </span>
              </div>
            </div>
          </div>

          {/* Description & Winning Rules List */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-arena-muted mb-1 font-display">
                Objective
              </h4>
              <p className="text-xs text-arena-text leading-relaxed">
                {config.description}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-display flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                How to Win:
              </h4>
              <div className="space-y-1.5">
                {config.howToWin.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-arena-text">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="p-3 rounded-xl bg-arena-surface border border-arena-border text-[11px] text-arena-muted space-y-1">
              <span className="font-bold text-arena-text block">💡 Pro Strategy:</span>
              <span>Enable <strong>⚡ Auto-Daub</strong> so matching numbers are stamped instantly when called by the announcer. As soon as your pattern completes, press <strong>BINGO! CLAIM WIN</strong> immediately to lock in your victory.</span>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div className="pt-2 flex justify-end">
          <Button variant="primary" size="md" onClick={onClose} fullWidth className="sm:w-auto">
            Got It, Let's Play!
          </Button>
        </div>
      </div>
    </Modal>
  );
};
