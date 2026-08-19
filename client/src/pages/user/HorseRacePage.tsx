import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { useHorseRaceStore } from '../../stores/horseRaceStore';
import { HorseBetType } from '../../shared';
import {
  Trophy,
  Volume2,
  VolumeX,
  ShieldCheck,
  Sparkles,
  History,
  Flame,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  TrendingUp,
  Award,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Web Audio Synthesizer for Horse Racing                                     */
/* -------------------------------------------------------------------------- */
class HorseRaceAudioEngine {
  private ctx: AudioContext | null = null;
  private gallopTimer: any = null;
  private hasInteracted = false;

  public init() {
    if (typeof window === 'undefined') return;
    this.hasInteracted = true;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // "Call to the Post" Bugle Fanfare
  public playBugleFanfare() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const notes = [
        { f: 392.0, t: 0.0, d: 0.12 }, // G4
        { f: 523.25, t: 0.14, d: 0.12 }, // C5
        { f: 659.25, t: 0.28, d: 0.12 }, // E5
        { f: 783.99, t: 0.42, d: 0.25 }, // G5
        { f: 659.25, t: 0.72, d: 0.12 }, // E5
        { f: 783.99, t: 0.86, d: 0.35 }, // G5
      ];

      notes.forEach((n) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.f, this.ctx!.currentTime + n.t);

        // Brass filter
        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, this.ctx!.currentTime + n.t);

        gain.gain.setValueAtTime(0.08, this.ctx!.currentTime + n.t);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + n.t + n.d);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(this.ctx!.currentTime + n.t);
        osc.stop(this.ctx!.currentTime + n.t + n.d);
      });
    } catch {
      // Ignore
    }
  }

  public startGallop() {
    if (!this.hasInteracted) return;
    this.init();
    if (!this.ctx || this.gallopTimer) return;

    this.gallopTimer = setInterval(() => {
      try {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(90, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
      } catch {
        // Ignore
      }
    }, 160);
  }

  public stopGallop() {
    if (this.gallopTimer) {
      clearInterval(this.gallopTimer);
      this.gallopTimer = null;
    }
  }

  public playVictoryFanfare() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const chords = [523.25, 659.25, 783.99, 1046.5];
      chords.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.1);

        gain.gain.setValueAtTime(0.1, this.ctx!.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.1 + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(this.ctx!.currentTime + idx * 0.1);
        osc.stop(this.ctx!.currentTime + idx * 0.1 + 0.5);
      });
    } catch {
      // Ignore
    }
  }
}

const raceAudio = new HorseRaceAudioEngine();

/* -------------------------------------------------------------------------- */
/* Horse Racing Component                                                     */
/* -------------------------------------------------------------------------- */
export const HorseRacePage: React.FC = () => {
  const { token, isAuthenticated } = useAuthStore();
  const { balance } = useWalletStore();
  const {
    currentRound,
    roster,
    raceStatus,
    positions,
    countdownSeconds,
    commentary,
    winner,
    podium,
    myBets,
    myHistory,
    stats,
    selectedBetType,
    selectedHorse,
    selectedSecondHorse,
    betAmount,
    isPlacingBet,
    soundEnabled,
    error,
    setSelectedBetType,
    setSelectedHorse,
    setSelectedSecondHorse,
    setBetAmount,
    toggleSound,
    setError,
    placeBet,
    fetchMyHistory,
    fetchStats,
    initSocketListeners,
  } = useHorseRaceStore();

  const [isFairModalOpen, setIsFairModalOpen] = useState(false);

  // Register pointerdown listener
  useEffect(() => {
    const handleGesture = () => raceAudio.init();
    window.addEventListener('pointerdown', handleGesture, { once: true });
    return () => window.removeEventListener('pointerdown', handleGesture);
  }, []);

  // Socket & history initialization
  useEffect(() => {
    if (token) {
      fetchMyHistory();
    }
    fetchStats();
    const cleanup = initSocketListeners();
    return () => {
      cleanup();
      raceAudio.stopGallop();
    };
  }, [token]);

  // Audio synchronization with race state
  useEffect(() => {
    if (!soundEnabled) {
      raceAudio.stopGallop();
      return;
    }

    if (raceStatus === 'RACING') {
      raceAudio.playBugleFanfare();
      raceAudio.startGallop();
    } else if (raceStatus === 'FINISHED') {
      raceAudio.stopGallop();
      raceAudio.playVictoryFanfare();
    } else {
      raceAudio.stopGallop();
    }
  }, [raceStatus, soundEnabled]);

  const activeHorse = roster.find((h) => h.number === selectedHorse) || roster[0];
  const activeSecondHorse = selectedSecondHorse
    ? roster.find((h) => h.number === selectedSecondHorse)
    : null;

  // Calculate current odds for selected bet
  let currentOdds = activeHorse.winOdds;
  if (selectedBetType === 'PLACE') {
    currentOdds = activeHorse.placeOdds;
  } else if (selectedBetType === 'EXACTA' && activeSecondHorse) {
    currentOdds = Math.floor(activeHorse.winOdds * activeSecondHorse.winOdds * 0.75 * 100) / 100;
  }

  const potentialPayout = Math.floor(betAmount * currentOdds * 100) / 100;

  return (
    <div className="min-h-screen bg-arena-bg text-arena-text px-4 sm:px-6 lg:px-8 py-8 font-sans selection:bg-amber-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 rounded-3xl border border-arena-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-rose-500 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl">
                🐎
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-display tracking-wide text-arena-text">
                  DAGI <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">DERBY</span>
                </h1>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-black tracking-wider uppercase font-mono">
                  LIVE MULTIPLAYER
                </span>
              </div>
              <span className="text-xs text-arena-muted font-bold">
                Real-time virtual horse racing with dynamic photo finishes & live track commentary!
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Provably Fair */}
            <button
              type="button"
              onClick={() => setIsFairModalOpen(true)}
              className="p-2.5 glass-panel rounded-2xl border border-arena-border hover:border-emerald-500/50 hover:bg-emerald-500/10 text-arena-muted hover:text-emerald-400 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Fair Hash</span>
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className={`p-2.5 glass-panel rounded-2xl border border-arena-border hover:bg-arena-surface text-arena-muted hover:text-arena-text transition-all cursor-pointer ${
                !soundEnabled && 'opacity-50'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-rose-500/15 border border-rose-500/40 rounded-2xl flex items-center justify-between text-rose-400 text-sm font-bold shadow-lg"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="p-1 hover:bg-rose-500/20 rounded-lg text-rose-400"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LIVE RACE ARENA & TRACK */}
        <div className="glass-panel-elevated rounded-3xl p-5 sm:p-7 border border-arena-border shadow-2xl space-y-4 relative overflow-hidden">
          {/* Race Track Header (Round Number, Status & Live Commentary) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-arena-border">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-mono font-black text-xs">
                RACE #{currentRound?.roundNumber || '5001'}
              </span>
              <div className="flex items-center gap-2">
                {raceStatus === 'BETTING' && (
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-black uppercase font-display flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    GATES OPEN ({countdownSeconds}s)
                  </span>
                )}
                {raceStatus === 'RACING' && (
                  <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-black uppercase font-display flex items-center gap-1.5 animate-bounce">
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                    RACING NOW!
                  </span>
                )}
                {raceStatus === 'FINISHED' && (
                  <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-black uppercase font-display flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    PHOTO FINISH
                  </span>
                )}
              </div>
            </div>

            {/* Live Track Commentary */}
            <div className="w-full sm:w-auto px-4 py-1.5 bg-arena-surface rounded-xl border border-arena-border text-xs font-mono font-bold text-amber-300 truncate shadow-inner">
              🎙️ {commentary}
            </div>
          </div>

          {/* 6-LANE TURF RACE TRACK */}
          <div className="relative rounded-2xl bg-gradient-to-b from-emerald-950 via-emerald-900 to-green-950 p-4 border-2 border-emerald-800/80 shadow-2xl space-y-3.5 overflow-hidden">
            {/* Distance Markers Rails (200m, 400m, 600m, 800m, 1000m, FINISH) */}
            <div className="absolute inset-0 flex justify-between pointer-events-none px-6 opacity-20">
              {['START', '300m', '600m', '900m', 'FINISH 🏁'].map((mark, i) => (
                <div key={i} className="h-full border-r border-dashed border-white/60 relative flex flex-col justify-between py-1">
                  <span className="text-[9px] font-mono font-bold text-white uppercase -ml-4">{mark}</span>
                </div>
              ))}
            </div>

            {/* Finish Line Ribbon */}
            <div className="absolute right-8 top-0 bottom-0 w-3 bg-gradient-to-b from-white via-red-500 to-white opacity-80 z-10 border-l border-r border-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.6)]" />

            {/* 6 Galloping Lanes */}
            {roster.map((horse) => {
              const pos = positions[horse.number] || 0;
              const isWinner = winner === horse.number;
              const isSelected = selectedHorse === horse.number;

              return (
                <div
                  key={horse.number}
                  className={`relative flex items-center h-11 sm:h-12 bg-emerald-950/60 rounded-xl px-3 border transition-colors ${
                    isSelected ? 'border-amber-400/80 bg-emerald-900/60' : 'border-emerald-700/40'
                  }`}
                >
                  {/* Gate Number & Silk Badge */}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs text-white shadow-md z-10 flex-shrink-0"
                    style={{ backgroundColor: horse.color }}
                  >
                    #{horse.number}
                  </div>

                  <span className="ml-2 text-xs font-bold text-emerald-200 hidden md:inline truncate w-28">
                    {horse.name}
                  </span>

                  {/* Galloping Horse Sprite & Silk */}
                  <div className="flex-1 relative h-full flex items-center ml-2">
                    <motion.div
                      className="absolute flex items-center gap-1 -translate-y-1/2 top-1/2 z-20 cursor-pointer"
                      style={{ left: `${Math.min(94, Math.max(0, pos))}%` }}
                      animate={
                        raceStatus === 'RACING'
                          ? { y: ['-50%', '-56%', '-50%'] }
                          : isWinner
                          ? { scale: [1, 1.15, 1] }
                          : {}
                      }
                      transition={{ repeat: Infinity, duration: 0.25 }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-lg border-2 border-white"
                        style={{ backgroundColor: horse.color }}
                      >
                        {horse.avatar}
                      </div>

                      {/* Winner Crown */}
                      {isWinner && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-xs font-black bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full font-mono shadow-md"
                        >
                          1st 👑
                        </motion.span>
                      )}
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Podium Announcement Banner */}
          <AnimatePresence>
            {raceStatus === 'FINISHED' && podium.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20 border-2 border-amber-400/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />
                  <div>
                    <h3 className="text-base font-black uppercase tracking-wider font-display text-amber-300">
                      RACE PODIUM RESULTS
                    </h3>
                    <span className="text-xs text-arena-muted font-mono">
                      1st: {roster.find((h) => h.number === podium[0])?.name} | 2nd: {roster.find((h) => h.number === podium[1])?.name} | 3rd: {roster.find((h) => h.number === podium[2])?.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-amber-400 text-slate-950 rounded-xl font-mono font-black text-xs">
                    🥇 #{podium[0]} ({roster.find((h) => h.number === podium[0])?.winOdds}x)
                  </div>
                  <div className="px-3 py-1.5 bg-slate-300 text-slate-950 rounded-xl font-mono font-black text-xs">
                    🥈 #{podium[1]}
                  </div>
                  <div className="px-3 py-1.5 bg-amber-700 text-white rounded-xl font-mono font-black text-xs">
                    🥉 #{podium[2]}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BETTING SLIP & ODDS BOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ODDS BOARD (8 Cols on Desktop) */}
          <div className="lg:col-span-8 glass-panel-elevated rounded-3xl p-5 border border-arena-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-arena-border pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-black uppercase font-display tracking-wider text-arena-text">
                  RACE ENTRANTS & FIXED ODDS
                </h2>
              </div>

              {/* Bet Type Tabs (WIN, PLACE, EXACTA) */}
              <div className="flex items-center bg-arena-surface p-1 rounded-2xl border border-arena-border">
                {(['WIN', 'PLACE', 'EXACTA'] as HorseBetType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedBetType(type)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black font-display uppercase tracking-wider transition-all cursor-pointer ${
                      selectedBetType === type
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-arena-muted hover:text-arena-text'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* 6 Horse Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {roster.map((horse) => {
                const isSelected = selectedHorse === horse.number;
                const isSecondSelected = selectedSecondHorse === horse.number;

                return (
                  <button
                    key={horse.number}
                    type="button"
                    onClick={() => {
                      if (selectedBetType === 'EXACTA' && selectedHorse !== horse.number) {
                        setSelectedSecondHorse(horse.number);
                      } else {
                        setSelectedHorse(horse.number);
                      }
                    }}
                    className={`p-4 rounded-2xl text-left border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/15 ring-2 ring-amber-400/50'
                        : isSecondSelected
                        ? 'bg-indigo-500/15 border-indigo-400 shadow-lg shadow-indigo-500/15'
                        : 'bg-arena-surface hover:bg-arena-highlight border-arena-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs text-white shadow-md"
                          style={{ backgroundColor: horse.color }}
                        >
                          #{horse.number}
                        </div>
                        <div>
                          <span className="text-sm font-black font-display text-arena-text block">
                            {horse.name}
                          </span>
                          <span className="text-[10px] font-mono text-arena-muted">
                            Form: {horse.form}
                          </span>
                        </div>
                      </div>

                      {/* Odds Badge */}
                      <span className="text-base font-black font-mono text-amber-400">
                        {selectedBetType === 'WIN'
                          ? `${horse.winOdds.toFixed(2)}×`
                          : `${horse.placeOdds.toFixed(2)}×`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-arena-border/50 text-[11px] font-bold text-arena-muted">
                      <span>Win: {horse.winOdds}×</span>
                      <span>Place: {horse.placeOdds}×</span>
                      {isSelected && (
                        <span className="text-amber-400 font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Selected (1st)
                        </span>
                      )}
                      {isSecondSelected && (
                        <span className="text-indigo-400 font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 2nd Place
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BETTING SLIP (4 Cols on Desktop) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="glass-panel-elevated rounded-3xl p-5 border border-arena-border shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-arena-border pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-arena-muted font-display">
                  BETTING TICKET
                </span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-mono font-black">
                  {selectedBetType}
                </span>
              </div>

              {/* Selected Horse Summary */}
              <div className="p-3.5 bg-arena-surface rounded-2xl border border-arena-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-xs text-white"
                      style={{ backgroundColor: activeHorse.color }}
                    >
                      #{activeHorse.number}
                    </div>
                    <span className="text-xs font-black text-arena-text">
                      {activeHorse.name} {selectedBetType === 'EXACTA' && '(1st)'}
                    </span>
                  </div>
                  <span className="text-sm font-black font-mono text-amber-400">
                    {currentOdds.toFixed(2)}×
                  </span>
                </div>

                {/* Second Horse Selector for Exacta */}
                {selectedBetType === 'EXACTA' && (
                  <div className="pt-2 border-t border-arena-border flex items-center justify-between">
                    <span className="text-xs text-arena-muted font-bold">2nd Place:</span>
                    <select
                      value={selectedSecondHorse || ''}
                      onChange={(e) => setSelectedSecondHorse(Number(e.target.value))}
                      className="bg-arena-highlight border border-arena-border text-arena-text text-xs font-bold rounded-xl px-2.5 py-1 font-mono outline-none"
                    >
                      {roster
                        .filter((h) => h.number !== selectedHorse)
                        .map((h) => (
                          <option key={h.number} value={h.number}>
                            #{h.number} {h.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Stake Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-arena-muted font-display">
                    Stake Amount (ETB)
                  </label>
                  <span className="text-xs font-mono text-arena-muted">
                    Balance: <strong className="text-arena-text font-black">{balance?.availableBalance || 0} ETB</strong>
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    className="w-full bg-arena-surface border border-arena-border rounded-2xl py-3.5 pl-4 pr-16 font-black font-mono text-lg text-arena-text outline-none focus:border-amber-400 transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-arena-muted font-mono">
                    ETB
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 25, 50, 100].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setBetAmount(betAmount + chip)}
                      className="py-1.5 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-xl text-xs font-bold text-arena-muted transition-colors cursor-pointer"
                    >
                      +{chip}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBetAmount(Math.max(0.5, Math.floor(betAmount / 2)))}
                    className="py-1.5 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-xl text-xs font-bold text-arena-muted transition-colors cursor-pointer"
                  >
                    1/2
                  </button>
                  <button
                    type="button"
                    onClick={() => setBetAmount(betAmount * 2)}
                    className="py-1.5 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-xl text-xs font-bold text-arena-muted transition-colors cursor-pointer"
                  >
                    2×
                  </button>
                  <button
                    type="button"
                    disabled={!balance}
                    onClick={() => setBetAmount(balance?.availableBalance || 10)}
                    className="py-1.5 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-xl text-xs font-bold text-arena-muted transition-colors cursor-pointer"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Potential Return Display */}
              <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                <span className="text-xs font-bold text-emerald-400">Potential Return:</span>
                <span className="text-base font-black font-mono text-emerald-300">
                  {potentialPayout.toFixed(2)} ETB
                </span>
              </div>

              {/* Place Bet Button */}
              <button
                type="button"
                disabled={isPlacingBet}
                onClick={placeBet}
                className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-400 active:scale-[0.98] text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-display disabled:opacity-50"
              >
                <Zap className="w-5 h-5 fill-slate-950" />
                <span>PLACE BET ({betAmount} ETB)</span>
              </button>
            </div>

            {/* Active Tickets for Current Race */}
            {myBets.length > 0 && (
              <div className="glass-panel rounded-3xl p-4 border border-arena-border space-y-3">
                <span className="text-xs font-black uppercase text-arena-muted font-display block">
                  Active Race Tickets ({myBets.length})
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {myBets.map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 bg-arena-surface rounded-xl border border-arena-border flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded font-black">
                          #{b.horseNumber}
                        </span>
                        <span className="font-bold">{b.betType}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-arena-text font-black">{b.betAmount} ETB</span>
                        <span className="text-[10px] text-emerald-400 block font-bold">
                          Win: {(b.betAmount * b.odds).toFixed(2)} ETB
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RACE HISTORY & STATS SECTION */}
        <div className="glass-panel rounded-3xl p-6 border border-arena-border space-y-4">
          <div className="flex items-center justify-between border-b border-arena-border pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-black uppercase font-display tracking-wider text-arena-text">
                My Derby Bet History
              </h2>
            </div>
            <span className="text-xs font-mono text-arena-muted">
              {myHistory.length} bets recorded
            </span>
          </div>

          {myHistory.length === 0 ? (
            <div className="text-center py-8 text-arena-muted text-sm font-bold">
              No horse racing bets placed yet. Choose your runner and place a bet above!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-arena-border text-arena-muted font-mono uppercase">
                    <th className="pb-3 font-bold">Race</th>
                    <th className="pb-3 font-bold">Bet Type</th>
                    <th className="pb-3 font-bold">Horse</th>
                    <th className="pb-3 font-bold">Stake</th>
                    <th className="pb-3 font-bold">Odds</th>
                    <th className="pb-3 font-bold">Status</th>
                    <th className="pb-3 font-bold text-right">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-arena-border/40 font-mono">
                  {myHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-arena-surface/50 transition-colors">
                      <td className="py-3 text-arena-muted">#{h.roundNumber}</td>
                      <td className="py-3 font-bold">{h.betType}</td>
                      <td className="py-3 font-bold text-amber-400">#{h.horseNumber}</td>
                      <td className="py-3">{h.betAmount.toFixed(2)} ETB</td>
                      <td className="py-3">{h.odds.toFixed(2)}×</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            h.status === 'WON'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : h.status === 'LOST'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-arena-surface text-arena-muted border border-arena-border'
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className={`py-3 text-right font-black ${h.payoutAmount > 0 ? 'text-emerald-400' : 'text-arena-muted'}`}>
                        {h.payoutAmount > 0 ? `+${h.payoutAmount.toFixed(2)} ETB` : '0.00 ETB'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Provably Fair Verifier Modal */}
      <AnimatePresence>
        {isFairModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg glass-panel-elevated rounded-3xl p-6 border border-arena-border space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-arena-border pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-black font-display text-arena-text">
                    Provably Fair Seed Verification
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFairModalOpen(false)}
                  className="p-1 hover:bg-arena-surface rounded-xl text-arena-muted hover:text-arena-text"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-arena-muted leading-relaxed">
                  Every race winner is predetermined before the starting gates open using cryptographic SHA-256 seed hashing.
                </p>

                {currentRound ? (
                  <div className="space-y-2 font-mono bg-arena-surface p-4 rounded-2xl border border-arena-border">
                    <div>
                      <span className="text-[10px] font-bold text-arena-muted uppercase block">Race Round:</span>
                      <span className="text-amber-400 font-bold">#{currentRound.roundNumber}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-arena-muted uppercase block">Committed SHA-256 Hash:</span>
                      <span className="text-emerald-400 break-all">{currentRound.hash}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-arena-muted uppercase block">Server Seed (Unhashed):</span>
                      <span className="text-amber-300 break-all">
                        {currentRound.serverSeed || '*** HIDDEN UNTIL RACE COMPLETES ***'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-arena-surface rounded-2xl text-center text-arena-muted font-bold">
                    Connecting to live race gateway...
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsFairModalOpen(false)}
                className="w-full py-3 bg-arena-surface hover:bg-arena-highlight border border-arena-border text-arena-text font-black text-xs uppercase rounded-2xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
