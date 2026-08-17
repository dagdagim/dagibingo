import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Sparkles, ArrowRight, Home } from 'lucide-react';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';

import { WinnerState } from '../../stores/gameStore';

interface WinnerModalProps {
  winner: WinnerState | null;
  gameTitle?: string;
  gameCode?: string;
  onClose: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  winner,
  gameTitle,
  gameCode,
  onClose,
}) => {
  useEffect(() => {
    if (winner) {
      // Fire vibrant multi-angle confetti explosion
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#06B6D4'],
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#06B6D4'],
        });

        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [winner]);

  if (!winner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-pop-in">
      <div className="relative w-full max-w-lg glass-panel-elevated border-2 border-amber-400/80 rounded-3xl p-8 text-center shadow-gold-glow overflow-hidden">
        {/* Background radial gold aura */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/30 rounded-full blur-3xl pointer-events-none" />

        {/* Top Trophy Emblem */}
        <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-0.5 shadow-gold-glow mb-6 animate-float">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
            <Trophy className="w-12 h-12 text-amber-400 fill-amber-400/20" />
          </div>
        </div>

        {/* Title */}
        <span className="text-xs font-black uppercase tracking-widest text-amber-400 block mb-1">
          BINGO ARENA CHAMPION!
        </span>
        <h2 className="text-3xl md:text-4xl font-black font-display text-white tracking-tight">
          {winner.winnerName} WON!
        </h2>
        <p className="text-xs text-arena-muted mt-1">
          Completed {winner.pattern} in {gameTitle || 'Bingo Room'} {gameCode ? `(#${gameCode})` : ''}
        </p>

        {/* Prize Pool Box */}
        <div className="my-6 p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-400/40 shadow-inner">
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
            Prize Payout (Virtual Demo Credits)
          </span>
          <div className="text-4xl md:text-5xl font-black font-mono gradient-text-gold mt-1">
            +{winner.prize.toLocaleString()} ETB
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link to="/lobby" className="flex-1">
            <Button variant="gold" size="lg" fullWidth leftIcon={<Home className="w-5 h-5" />}>
              Play Next Game
            </Button>
          </Link>
          <Button variant="outline" size="lg" onClick={onClose}>
            View Scorecard
          </Button>
        </div>
      </div>
    </div>
  );
};
