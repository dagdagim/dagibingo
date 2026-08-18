import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DepositModal } from '../../components/wallet/DepositModal';
import {
  KenoPlayResult,
  KenoHistoryItem,
  KenoStats,
  KENO_PAYTABLE,
} from '../../shared';
import {
  Sparkles,
  Flame,
  RotateCcw,
  Zap,
  Trophy,
  History,
  TrendingUp,
  Wallet,
  Play,
  CheckCircle2,
  AlertCircle,
  Plus,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Web Audio API Sound Synthesizer for rich arcade effects without external asset dependencies
class KenoSoundEffects {
  private ctx: AudioContext | null = null;

  private getContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playPick() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio fallback
    }
  }

  playBallDrop() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // Audio fallback
    }
  }

  playMatchHit() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {
      // Audio fallback
    }
  }

  playWinFanfare() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const chords = [523.25, 659.25, 783.99, 1046.5]; // C Major
      chords.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.4);
      });
    } catch {
      // Audio fallback
    }
  }
}

const soundFx = new KenoSoundEffects();

export const KenoPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { balance, fetchBalance } = useWalletStore();

  const [selectedSpots, setSelectedSpots] = useState<number[]>([7, 14, 21, 45, 77]);
  const [wager, setWager] = useState<number>(5);
  const [customWager, setCustomWager] = useState<string>('');
  const [speed, setSpeed] = useState<'normal' | 'fast' | 'instant'>('fast');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);

  // Live Draw Animation State
  const [drawnBalls, setDrawnBalls] = useState<number[]>([]);
  const [revealedDrawn, setRevealedDrawn] = useState<number[]>([]);
  const [lastResult, setLastResult] = useState<KenoPlayResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<KenoHistoryItem[]>([]);
  const [stats, setStats] = useState<KenoStats | null>(null);
  const [activeTab, setActiveTab] = useState<'paytable' | 'history' | 'stats'>('paytable');

  const availableBalance = balance?.availableBalance || 0;
  const currentWager = customWager ? Math.max(1, parseFloat(customWager) || 1) : wager;

  // Fetch initial balance, history & stats
  useEffect(() => {
    if (isAuthenticated) {
      fetchBalance();
      fetchHistory();
    }
    fetchStats();
  }, [isAuthenticated, fetchBalance]);

  const fetchHistory = async () => {
    try {
      const data = await api.get<KenoHistoryItem[]>('/keno/history?limit=10');
      if (Array.isArray(data)) {
        setHistory(data);
      }
    } catch {
      // Silently fail if not logged in
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.get<KenoStats>('/keno/stats');
      if (data) {
        setStats(data);
      }
    } catch {
      // Ignore
    }
  };

  // Toggle spot selection (1–80, max 10 spots)
  const toggleSpot = (num: number) => {
    if (isPlaying) return;
    soundFx.playPick();

    if (selectedSpots.includes(num)) {
      setSelectedSpots(selectedSpots.filter((s) => s !== num));
    } else {
      if (selectedSpots.length >= 10) {
        setErrorMsg('You can select a maximum of 10 spots');
        setTimeout(() => setErrorMsg(null), 2500);
        return;
      }
      setSelectedSpots([...selectedSpots, num].sort((a, b) => a - b));
    }
  };

  // Quick Pick Random Spots
  const handleQuickPick = (count: number) => {
    if (isPlaying) return;
    soundFx.playPick();
    const numbers: number[] = Array.from({ length: 80 }, (_, i) => i + 1);
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    const picks = numbers.slice(0, count).sort((a, b) => a - b);
    setSelectedSpots(picks);
  };

  const handleClear = () => {
    if (isPlaying) return;
    setSelectedSpots([]);
    setRevealedDrawn([]);
    setLastResult(null);
  };

  // Play Keno Round
  const handlePlay = async () => {
    if (selectedSpots.length === 0) {
      setErrorMsg('Please select at least 1 number (up to 10 spots)');
      return;
    }
    if (currentWager < 1) {
      setErrorMsg('Minimum wager is 1 ETB');
      return;
    }
    if (currentWager > availableBalance) {
      setErrorMsg(`Insufficient balance (${availableBalance.toLocaleString()} ETB available). Please add funds.`);
      setIsDepositModalOpen(true);
      return;
    }

    setErrorMsg(null);
    setIsPlaying(true);
    setRevealedDrawn([]);
    setLastResult(null);

    try {
      const result = await api.post<KenoPlayResult>('/keno/play', {
        spots: selectedSpots,
        wager: currentWager,
      });

      setDrawnBalls(result.drawnNumbers);

      // Execute animated ball draw sequence
      if (speed === 'instant') {
        setRevealedDrawn(result.drawnNumbers);
        handleRoundComplete(result);
      } else {
        const delay = speed === 'fast' ? 70 : 160;
        result.drawnNumbers.forEach((num, index) => {
          setTimeout(() => {
            setRevealedDrawn((prev) => [...prev, num]);
            if (selectedSpots.includes(num)) {
              soundFx.playMatchHit();
            } else {
              soundFx.playBallDrop();
            }

            // Final ball drawn
            if (index === result.drawnNumbers.length - 1) {
              setTimeout(() => {
                handleRoundComplete(result);
              }, 200);
            }
          }, (index + 1) * delay);
        });
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to place Keno bet');
      setIsPlaying(false);
    }
  };

  const handleRoundComplete = (result: KenoPlayResult) => {
    setIsPlaying(false);
    setLastResult(result);
    fetchBalance();
    fetchHistory();
    fetchStats();

    if (result.isWin) {
      soundFx.playWinFanfare();
      if (result.multiplier >= 5) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10B981', '#F59E0B', '#6366F1', '#EC4899'],
        });
      }
    }
  };

  // Paytable for currently selected spot count
  const currentPaytable = KENO_PAYTABLE[selectedSpots.length] || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Wallet Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-purple-500/15 border border-amber-500/30 shadow-lg relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-500 text-[10px] font-black tracking-widest uppercase font-mono">
              PROVABLY FAIR • 1–80 DRAW
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black tracking-widest uppercase font-mono">
              UP TO 25,000× PAYOUT
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-display text-arena-text flex items-center gap-3">
            <span>DAGI KENO 80</span>
            <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
          </h1>
          <p className="text-xs sm:text-sm text-arena-muted">
            Pick 1 to 10 numbers. 20 random balls drawn every round. Match and win instant ETB multipliers!
          </p>
        </div>

        {/* Live Feature Highlights */}
        <div className="flex items-center gap-2 relative z-10 self-start md:self-auto">
          <div className="px-4 py-3 rounded-2xl bg-arena-surface/80 border border-arena-border shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 font-black text-lg">
              ⚡
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-arena-muted tracking-wider block font-display">
                Game Multiplier
              </span>
              <span className="text-sm font-black font-display text-amber-500">
                Up to 25,000× Win
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Keno Play Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left / Center: 80-Ball Board & Tumbler (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Live Drawn Balls Tumbler Tray */}
          <Card elevated className="p-4 border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider font-display text-arena-text">
                  Live 20-Ball Tumbler Draw ({revealedDrawn.length}/20)
                </span>
              </div>
              <div className="text-[11px] font-mono text-arena-muted">
                {isPlaying ? 'Drawing balls...' : revealedDrawn.length === 20 ? 'Round Finished' : 'Ready to draw'}
              </div>
            </div>

            <div className="grid grid-cols-10 gap-1.5 min-h-[72px] p-2 rounded-2xl bg-arena-bg border border-arena-border">
              {Array.from({ length: 20 }).map((_, idx) => {
                const num = revealedDrawn[idx];
                const isMatch = num && selectedSpots.includes(num);

                if (!num) {
                  return (
                    <div
                      key={idx}
                      className="h-8 rounded-lg bg-arena-surface/40 border border-arena-border/40 flex items-center justify-center text-[10px] font-mono text-arena-muted/30"
                    >
                      {idx + 1}
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className={`h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs transition-all duration-300 transform scale-100 ${
                      isMatch
                        ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-accent-glow font-black scale-105 border border-emerald-300'
                        : 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-md'
                    }`}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 80-Number Grid */}
          <Card elevated className="p-4 sm:p-6 space-y-4">
            {/* Spot Pick Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-arena-border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-arena-muted font-display uppercase tracking-wider">
                  Spots Picked:
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono ${
                    selectedSpots.length > 0
                      ? 'bg-indigo-500/20 text-indigo-500 border border-indigo-500/30'
                      : 'bg-arena-surface text-arena-muted border border-arena-border'
                  }`}
                >
                  {selectedSpots.length} / 10
                </span>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[3, 5, 8, 10].map((count) => (
                  <button
                    key={count}
                    type="button"
                    disabled={isPlaying}
                    onClick={() => handleQuickPick(count)}
                    className="px-2.5 py-1.5 rounded-xl bg-arena-surface hover:bg-indigo-500/15 border border-arena-border hover:border-indigo-500/40 text-[11px] font-bold font-display text-arena-text transition-all cursor-pointer disabled:opacity-50"
                  >
                    Pick {count}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={isPlaying || selectedSpots.length === 0}
                  onClick={handleClear}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-[11px] font-bold font-display text-rose-500 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>

            {/* 10x8 Grid */}
            <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
              {Array.from({ length: 80 }, (_, i) => i + 1).map((num) => {
                const isSelected = selectedSpots.includes(num);
                const isDrawn = revealedDrawn.includes(num);
                const isHit = isSelected && isDrawn;

                let tileClass = 'bg-arena-surface border-arena-border text-arena-text hover:border-indigo-500/50';

                if (isHit) {
                  tileClass =
                    'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black shadow-accent-glow border-emerald-300 scale-105 z-10 animate-bounce';
                } else if (isSelected) {
                  tileClass =
                    'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black shadow-arena-glow border-indigo-400 scale-105 z-10';
                } else if (isDrawn) {
                  tileClass =
                    'bg-amber-500/20 border-amber-500/40 text-amber-500 font-bold';
                }

                return (
                  <button
                    key={num}
                    type="button"
                    disabled={isPlaying}
                    onClick={() => toggleSpot(num)}
                    className={`h-9 sm:h-11 rounded-xl border text-xs sm:text-sm font-mono font-bold transition-all duration-200 flex items-center justify-center cursor-pointer select-none ${tileClass}`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-3 border-t border-arena-border text-[11px] text-arena-muted">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded bg-gradient-to-tr from-indigo-600 to-purple-600" />
                <span>Your Pick</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded bg-amber-500/20 border border-amber-500/40" />
                <span>Drawn Number</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded bg-gradient-to-tr from-emerald-500 to-teal-400" />
                <span className="font-bold text-emerald-500">HIT / MATCH!</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Controls, Paytable, History (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Bet & Play Card */}
          <Card elevated className="p-6 space-y-5 border-indigo-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider font-display text-arena-text flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                Wager Selection
              </span>
              <span className="text-xs font-mono font-bold text-arena-muted">Min: 1 ETB</span>
            </div>

            {/* Wager Chip Presets */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 5, 10, 20, 50, 100].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={isPlaying}
                  onClick={() => {
                    setWager(amt);
                    setCustomWager('');
                  }}
                  className={`py-2.5 rounded-xl font-mono font-black text-xs border transition-all cursor-pointer ${
                    wager === amt && !customWager
                      ? 'bg-indigo-500 border-indigo-500 text-white shadow-arena-glow'
                      : 'bg-arena-surface border-arena-border text-arena-text hover:border-indigo-500/50'
                  }`}
                >
                  {amt} ETB
                </button>
              ))}
            </div>

            {/* Custom Wager Input */}
            <div className="relative">
              <input
                type="number"
                min="1"
                max={availableBalance.toString()}
                placeholder="Or Custom Wager (ETB)"
                value={customWager}
                disabled={isPlaying}
                onChange={(e) => {
                  setCustomWager(e.target.value);
                  setWager(0);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-arena-surface border border-arena-border text-arena-text placeholder:text-arena-muted/50 text-xs font-mono font-bold focus:outline-none focus:border-indigo-500"
              />
              <span className="absolute right-3 top-2.5 text-xs font-mono font-bold text-arena-muted">ETB</span>
            </div>

            {/* Draw Speed Controls */}
            <div>
              <label className="text-[11px] font-bold text-arena-muted uppercase tracking-wider block mb-1.5 font-display">
                Draw Speed
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['normal', 'fast', 'instant'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isPlaying}
                    onClick={() => setSpeed(s)}
                    className={`py-1.5 rounded-xl text-[11px] font-extrabold uppercase font-display border transition-all cursor-pointer ${
                      speed === s
                        ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-sm'
                        : 'bg-arena-surface border-arena-border text-arena-muted hover:text-arena-text'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Play Button */}
            <Button
              variant="accent"
              size="lg"
              fullWidth
              disabled={selectedSpots.length === 0}
              isLoading={isPlaying}
              onClick={handlePlay}
              leftIcon={<Play className="w-5 h-5 fill-current" />}
            >
              {selectedSpots.length === 0
                ? 'Select Spots to Play'
                : `Play Keno (${currentWager} ETB)`}
            </Button>
          </Card>

          {/* Last Result Banner */}
          {lastResult && (
            <div
              className={`p-4 rounded-2xl border transition-all animate-fade-in ${
                lastResult.isWin
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-500/40'
                  : 'bg-arena-surface border-arena-border'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-display uppercase tracking-wider text-arena-text">
                  Round Result:
                </span>
                <span
                  className={`text-xs font-black font-mono ${
                    lastResult.isWin ? 'text-emerald-500' : 'text-arena-muted'
                  }`}
                >
                  {lastResult.matchesCount} / {lastResult.spots.length} Hits
                </span>
              </div>

              {lastResult.isWin ? (
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-emerald-600 dark:text-emerald-300 font-bold flex items-center gap-1">
                    <Trophy className="w-4 h-4" />
                    <span>Won ({lastResult.multiplier}× Multiplier)!</span>
                  </div>
                  <div className="text-lg font-black font-mono text-emerald-500">
                    +{lastResult.payout.toLocaleString()} ETB
                  </div>
                </div>
              ) : (
                <div className="text-xs text-arena-muted pt-1">
                  No winning combination hit. Try your luck again!
                </div>
              )}
            </div>
          )}

          {/* Paytable & Stats Tabs Card */}
          <Card elevated className="p-4 space-y-3">
            <div className="flex items-center gap-1 border-b border-arena-border pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('paytable')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display transition-all cursor-pointer ${
                  activeTab === 'paytable'
                    ? 'bg-indigo-500/20 text-indigo-500 border border-indigo-500/30'
                    : 'text-arena-muted hover:text-arena-text'
                }`}
              >
                Paytable
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-indigo-500/20 text-indigo-500 border border-indigo-500/30'
                    : 'text-arena-muted hover:text-arena-text'
                }`}
              >
                My History
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('stats')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-display transition-all cursor-pointer ${
                  activeTab === 'stats'
                    ? 'bg-indigo-500/20 text-indigo-500 border border-indigo-500/30'
                    : 'text-arena-muted hover:text-arena-text'
                }`}
              >
                Hot / Cold
              </button>
            </div>

            {/* Dynamic Paytable View */}
            {activeTab === 'paytable' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-arena-muted uppercase tracking-wider font-display">
                  <span>Hits ({selectedSpots.length || 1} Spots)</span>
                  <span>Multiplier & Payout</span>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {Object.keys(currentPaytable).length === 0 ? (
                    <div className="text-center py-4 text-xs text-arena-muted">
                      Select spots on the board to view potential payouts.
                    </div>
                  ) : (
                    Object.entries(currentPaytable)
                      .sort(([a], [b]) => Number(b) - Number(a))
                      .map(([hits, mult]) => {
                        const isCurrentHit =
                          lastResult && lastResult.matchesCount === Number(hits);
                        const winPayout = Math.floor(currentWager * mult);

                        return (
                          <div
                            key={hits}
                            className={`p-2 rounded-xl flex items-center justify-between text-xs transition-all ${
                              isCurrentHit
                                ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-500 font-bold scale-102'
                                : 'bg-arena-surface border border-arena-border text-arena-text'
                            }`}
                          >
                            <span className="font-display font-bold">
                              {hits} {Number(hits) === 1 ? 'Hit' : 'Hits'}
                            </span>
                            <div className="text-right font-mono">
                              <span className="text-amber-500 font-black mr-2">{mult}×</span>
                              <span className="text-arena-muted text-[11px]">
                                ({winPayout.toLocaleString()} ETB)
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            )}

            {/* My History View */}
            {activeTab === 'history' && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <div className="text-center py-4 text-xs text-arena-muted">
                    No recent Keno games found.
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-xl bg-arena-surface border border-arena-border text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-arena-text font-display">
                          {item.matchesCount}/{item.spots.length} Hits (Wager: {item.wager} ETB)
                        </div>
                        <div className="text-[10px] text-arena-muted font-mono">
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        {item.isWin ? (
                          <span className="text-emerald-500 font-black">
                            +{item.payout.toLocaleString()} ETB
                          </span>
                        ) : (
                          <span className="text-arena-muted">0 ETB</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Hot / Cold Stats View */}
            {activeTab === 'stats' && (
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {stats ? (
                  <>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-500 uppercase font-display mb-1.5">
                        <Flame className="w-3.5 h-3.5" />
                        <span>Hot Numbers (Most Drawn)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {stats.hotNumbers.slice(0, 7).map((n) => (
                          <button
                            key={n.number}
                            type="button"
                            onClick={() => toggleSpot(n.number)}
                            className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-mono font-bold hover:scale-105 cursor-pointer"
                          >
                            #{n.number} ({n.count})
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-black text-indigo-400 uppercase font-display mb-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Cold Numbers</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {stats.coldNumbers.slice(0, 7).map((n) => (
                          <button
                            key={n.number}
                            type="button"
                            onClick={() => toggleSpot(n.number)}
                            className="px-2 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-mono font-bold hover:scale-105 cursor-pointer"
                          >
                            #{n.number} ({n.count})
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-xs text-arena-muted">
                    Loading stats...
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
      />
    </div>
  );
};

export default KenoPage;
