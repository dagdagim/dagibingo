import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { useGreyhoundStore } from '../../stores/greyhoundStore';
import { GreyhoundBetType } from '../../shared';
import {
  Trophy,
  Volume2,
  VolumeX,
  ShieldCheck,
  History,
  Flame,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  Award,
} from 'lucide-react';
import { GreyhoundTrackCanvas } from '../../components/greyhound/GreyhoundTrackCanvas';

/* -------------------------------------------------------------------------- */
/* Photorealistic Web Audio Synthesizer for Greyhound Racing                  */
/* -------------------------------------------------------------------------- */
class GreyhoundAudioEngine {
  private ctx: AudioContext | null = null;
  private patterTimer: any = null;
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

  // Mechanical Hare Lure Electric Whine & Pneumatic Trap Clang
  public playHareBuzzer() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      // 1. Electric Motor Whine
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(280, this.ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1100, this.ctx.currentTime + 0.65);

      gain1.gain.setValueAtTime(0.09, this.ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.65);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start();
      osc1.stop(this.ctx.currentTime + 0.65);

      // 2. Heavy Metal Pneumatic Trap Door Snap
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(520, this.ctx.currentTime + 0.6);
      osc2.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.85);

      gain2.gain.setValueAtTime(0.14, this.ctx.currentTime + 0.6);
      gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.95);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(this.ctx.currentTime + 0.6);
      osc2.stop(this.ctx.currentTime + 0.95);
    } catch {
      // Ignore
    }
  }

  // Rapid Multi-Hound Sand Footstep Thuds
  public startPatter() {
    if (!this.hasInteracted) return;
    this.init();
    if (!this.ctx || this.patterTimer) return;

    this.patterTimer = setInterval(() => {
      try {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Low sand thump
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(32, this.ctx.currentTime + 0.035);

        gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.035);
      } catch {
        // Ignore
      }
    }, 95);
  }

  public stopPatter() {
    if (this.patterTimer) {
      clearInterval(this.patterTimer);
      this.patterTimer = null;
    }
  }

  // Grand Victory Trumpet Fanfare
  public playVictoryFanfare() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const chords = [587.33, 739.99, 880.0, 1174.66, 1479.98]; // D Major Arpeggio
      chords.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.12, this.ctx!.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.08 + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(this.ctx!.currentTime + idx * 0.08);
        osc.stop(this.ctx!.currentTime + idx * 0.08 + 0.5);
      });
    } catch {
      // Ignore
    }
  }
}

const greyhoundAudio = new GreyhoundAudioEngine();

/* -------------------------------------------------------------------------- */
/* Greyhound Racing Component                                                 */
/* -------------------------------------------------------------------------- */
export const GreyhoundPage: React.FC = () => {
  const { token } = useAuthStore();
  const { balance } = useWalletStore();
  const {
    currentRound,
    roster,
    raceStatus,
    positions,
    harePosition,
    countdownSeconds,
    commentary,
    winner,
    podium,
    myBets,
    myHistory,
    selectedBetType,
    selectedTrap,
    selectedSecondTrap,
    betAmount,
    isPlacingBet,
    soundEnabled,
    error,
    setSelectedBetType,
    setSelectedTrap,
    setSelectedSecondTrap,
    setBetAmount,
    toggleSound,
    setError,
    placeBet,
    fetchMyHistory,
    fetchStats,
    initSocketListeners,
  } = useGreyhoundStore();

  const [isFairModalOpen, setIsFairModalOpen] = useState(false);

  useEffect(() => {
    const handleGesture = () => greyhoundAudio.init();
    window.addEventListener('pointerdown', handleGesture, { once: true });
    return () => window.removeEventListener('pointerdown', handleGesture);
  }, []);

  useEffect(() => {
    if (token) {
      fetchMyHistory();
    }
    fetchStats();
    const cleanup = initSocketListeners();
    return () => {
      cleanup();
      greyhoundAudio.stopPatter();
    };
  }, [token]);

  useEffect(() => {
    if (!soundEnabled) {
      greyhoundAudio.stopPatter();
      return;
    }

    if (raceStatus === 'RACING') {
      greyhoundAudio.playHareBuzzer();
      greyhoundAudio.startPatter();
    } else if (raceStatus === 'FINISHED') {
      greyhoundAudio.stopPatter();
      greyhoundAudio.playVictoryFanfare();
    } else {
      greyhoundAudio.stopPatter();
    }
  }, [raceStatus, soundEnabled]);

  const activeDog = roster.find((d) => d.trapNumber === selectedTrap) || roster[0];
  const activeSecondDog = selectedSecondTrap
    ? roster.find((d) => d.trapNumber === selectedSecondTrap)
    : null;

  let currentOdds = activeDog.winOdds;
  if (selectedBetType === 'PLACE') {
    currentOdds = activeDog.placeOdds;
  } else if (selectedBetType === 'EXACTA' && activeSecondDog) {
    currentOdds = Math.floor(activeDog.winOdds * activeSecondDog.winOdds * 0.75 * 100) / 100;
  }

  const potentialPayout = Math.floor(betAmount * currentOdds * 100) / 100;

  return (
    <div className="min-h-screen bg-arena-bg text-arena-text px-4 sm:px-6 lg:px-8 py-8 font-sans selection:bg-amber-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 rounded-3xl border border-arena-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl">
                🐕
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-display tracking-wide text-arena-text">
                  DAGI <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">HOUNDS</span>
                </h1>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-black tracking-wider uppercase font-mono">
                  GREYHOUND DERBY
                </span>
              </div>
              <span className="text-xs text-arena-muted font-bold">
                High-speed floodlit virtual greyhound racing with mechanical lure & photo finishes!
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setIsFairModalOpen(true)}
              className="p-2.5 glass-panel rounded-2xl border border-arena-border hover:border-emerald-500/50 hover:bg-emerald-500/10 text-arena-muted hover:text-emerald-400 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Fair Hash</span>
            </button>

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
          {/* Race Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-arena-border">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-mono font-black text-xs">
                GREYHOUND RACE #{currentRound?.roundNumber || '7001'}
              </span>
              <div className="flex items-center gap-2">
                {raceStatus === 'BETTING' && (
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-black uppercase font-display flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    TRAPS OPEN IN {countdownSeconds}s
                  </span>
                )}
                {raceStatus === 'RACING' && (
                  <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-black uppercase font-display flex items-center gap-1.5 animate-bounce">
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                    HARE RUNNING!
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

            <div className="w-full sm:w-auto px-4 py-1.5 bg-arena-surface rounded-xl border border-arena-border text-xs font-mono font-bold text-amber-300 truncate shadow-inner">
              🎙️ {commentary}
            </div>
          </div>

          {/* 60FPS SAND TRACK CANVAS */}
          <GreyhoundTrackCanvas
            roster={roster}
            positions={positions}
            harePosition={harePosition}
            raceStatus={raceStatus}
            winner={winner}
            podium={podium}
            selectedTrap={selectedTrap}
          />

          {/* LIVE DISTANCE LEADERBOARD HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
            {roster
              .map((d) => ({
                ...d,
                pos: positions[d.trapNumber] || 0,
              }))
              .sort((a, b) => b.pos - a.pos)
              .map((dog, rankIdx) => {
                const isLeader = rankIdx === 0;
                const isSelected = selectedTrap === dog.trapNumber;

                return (
                  <div
                    key={dog.trapNumber}
                    className={`p-2.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                        : isLeader && raceStatus === 'RACING'
                        ? 'bg-rose-500/15 border-rose-400'
                        : 'bg-arena-surface border-arena-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-black text-[10px] text-white ${
                            rankIdx === 0
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : rankIdx === 1
                              ? 'bg-slate-400 text-slate-950'
                              : rankIdx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {rankIdx + 1}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: dog.vestColor }}
                        />
                        <span className="text-[11px] font-black text-arena-text truncate max-w-[70px]">
                          #{dog.trapNumber} {dog.name.split(' ')[1] || ''}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-black text-amber-400">
                        {Math.floor(dog.pos)}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-100"
                        style={{
                          width: `${Math.min(100, Math.max(0, dog.pos))}%`,
                          backgroundColor: dog.vestColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Podium Result Banner */}
          <AnimatePresence>
            {raceStatus === 'FINISHED' && podium.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-gradient-to-r from-amber-500/20 via-orange-400/20 to-amber-500/20 border-2 border-amber-400/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />
                  <div>
                    <h3 className="text-base font-black uppercase tracking-wider font-display text-amber-300">
                      GREYHOUND PODIUM RESULTS
                    </h3>
                    <span className="text-xs text-arena-muted font-mono">
                      1st: {roster.find((d) => d.trapNumber === podium[0])?.name} | 2nd: {roster.find((d) => d.trapNumber === podium[1])?.name} | 3rd: {roster.find((d) => d.trapNumber === podium[2])?.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-amber-400 text-slate-950 rounded-xl font-mono font-black text-xs">
                    🥇 Trap #{podium[0]} ({roster.find((d) => d.trapNumber === podium[0])?.winOdds}x)
                  </div>
                  <div className="px-3 py-1.5 bg-slate-300 text-slate-950 rounded-xl font-mono font-black text-xs">
                    🥈 Trap #{podium[1]}
                  </div>
                  <div className="px-3 py-1.5 bg-amber-700 text-white rounded-xl font-mono font-black text-xs">
                    🥉 Trap #{podium[2]}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BETTING SLIP & ODDS BOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ODDS BOARD */}
          <div className="lg:col-span-8 glass-panel-elevated rounded-3xl p-5 border border-arena-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-arena-border pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-black uppercase font-display tracking-wider text-arena-text">
                  OFFICIAL TRAP DRAW & ODDS
                </h2>
              </div>

              <div className="flex items-center bg-arena-surface p-1 rounded-2xl border border-arena-border">
                {(['WIN', 'PLACE', 'EXACTA'] as GreyhoundBetType[]).map((type) => (
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

            {/* 6 Trap Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {roster.map((dog) => {
                const isSelected = selectedTrap === dog.trapNumber;
                const isSecondSelected = selectedSecondTrap === dog.trapNumber;

                return (
                  <button
                    key={dog.trapNumber}
                    type="button"
                    onClick={() => {
                      if (selectedBetType === 'EXACTA' && selectedTrap !== dog.trapNumber) {
                        setSelectedSecondTrap(dog.trapNumber);
                      } else {
                        setSelectedTrap(dog.trapNumber);
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
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs shadow-md"
                          style={{
                            backgroundColor: dog.vestColor,
                            color: dog.vestTextColor,
                          }}
                        >
                          #{dog.trapNumber}
                        </div>
                        <div>
                          <span className="text-sm font-black font-display text-arena-text block">
                            {dog.name}
                          </span>
                          <span className="text-[10px] font-mono text-arena-muted">
                            Form: {dog.form}
                          </span>
                        </div>
                      </div>

                      <span className="text-base font-black font-mono text-amber-400">
                        {selectedBetType === 'WIN'
                          ? `${dog.winOdds.toFixed(2)}×`
                          : `${dog.placeOdds.toFixed(2)}×`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-arena-border/50 text-[11px] font-bold text-arena-muted">
                      <span>Win: {dog.winOdds}×</span>
                      <span>Place: {dog.placeOdds}×</span>
                      {isSelected && (
                        <span className="text-amber-400 font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 1st Trap
                        </span>
                      )}
                      {isSecondSelected && (
                        <span className="text-indigo-400 font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 2nd Trap
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BETTING SLIP */}
          <div className="lg:col-span-4 space-y-4">
            <div className="glass-panel-elevated rounded-3xl p-5 border border-arena-border shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-arena-border pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-arena-muted font-display">
                  GREYHOUND TICKET
                </span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-mono font-black">
                  {selectedBetType}
                </span>
              </div>

              {/* Selected Trap Summary */}
              <div className="p-3.5 bg-arena-surface rounded-2xl border border-arena-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-xs"
                      style={{
                        backgroundColor: activeDog.vestColor,
                        color: activeDog.vestTextColor,
                      }}
                    >
                      #{activeDog.trapNumber}
                    </div>
                    <span className="text-xs font-black text-arena-text">
                      {activeDog.name} {selectedBetType === 'EXACTA' && '(1st)'}
                    </span>
                  </div>
                  <span className="text-sm font-black font-mono text-amber-400">
                    {currentOdds.toFixed(2)}×
                  </span>
                </div>

                {selectedBetType === 'EXACTA' && (
                  <div className="pt-2 border-t border-arena-border flex items-center justify-between">
                    <span className="text-xs text-arena-muted font-bold">2nd Trap:</span>
                    <select
                      value={selectedSecondTrap || ''}
                      onChange={(e) => setSelectedSecondTrap(Number(e.target.value))}
                      className="bg-arena-highlight border border-arena-border text-arena-text text-xs font-bold rounded-xl px-2.5 py-1 font-mono outline-none"
                    >
                      {roster
                        .filter((d) => d.trapNumber !== selectedTrap)
                        .map((d) => (
                          <option key={d.trapNumber} value={d.trapNumber}>
                            Trap #{d.trapNumber} {d.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Stake Input */}
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

              {/* Potential Return */}
              <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                <span className="text-xs font-bold text-emerald-400">Potential Payout:</span>
                <span className="text-base font-black font-mono text-emerald-300">
                  {potentialPayout.toFixed(2)} ETB
                </span>
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={isPlacingBet}
                onClick={placeBet}
                className="w-full py-4 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 active:scale-[0.98] text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-display disabled:opacity-50"
              >
                <Zap className="w-5 h-5 fill-slate-950" />
                <span>BET TRAP #{selectedTrap} ({betAmount} ETB)</span>
              </button>
            </div>

            {/* Active Tickets */}
            {myBets.length > 0 && (
              <div className="glass-panel rounded-3xl p-4 border border-arena-border space-y-3">
                <span className="text-xs font-black uppercase text-arena-muted font-display block">
                  Active Greyhound Tickets ({myBets.length})
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {myBets.map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 bg-arena-surface rounded-xl border border-arena-border flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded font-black">
                          Trap #{b.trapNumber}
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

        {/* BET HISTORY */}
        <div className="glass-panel rounded-3xl p-6 border border-arena-border space-y-4">
          <div className="flex items-center justify-between border-b border-arena-border pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-black uppercase font-display tracking-wider text-arena-text">
                My Greyhound Race History
              </h2>
            </div>
            <span className="text-xs font-mono text-arena-muted">
              {myHistory.length} bets recorded
            </span>
          </div>

          {myHistory.length === 0 ? (
            <div className="text-center py-8 text-arena-muted text-sm font-bold">
              No greyhound bets placed yet. Pick your runner above and cheer on the hounds!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-arena-border text-arena-muted font-mono uppercase">
                    <th className="pb-3 font-bold">Race</th>
                    <th className="pb-3 font-bold">Bet Type</th>
                    <th className="pb-3 font-bold">Trap</th>
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
                      <td className="py-3 font-bold text-amber-400">Trap #{h.trapNumber}</td>
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
                  Every greyhound race winner is predetermined prior to trap release using cryptographic SHA-256 seed hashing.
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
                        {currentRound.serverSeed || '*** HIDDEN UNTIL TRAPS FINISH ***'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-arena-surface rounded-2xl text-center text-arena-muted font-bold">
                    Connecting to live greyhound gateway...
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
