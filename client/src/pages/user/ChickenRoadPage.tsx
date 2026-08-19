import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { useChickenRoadStore, CHICKEN_ROAD_DIFFICULTY_DATA } from '../../stores/chickenRoadStore';
import { ChickenRoadCanvas } from '../../components/chickenroad/ChickenRoadCanvas';
import { ChickenRoadDifficulty } from '../../shared';
import {
  Volume2,
  VolumeX,
  ShieldCheck,
  History,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  Flame,
  ArrowUp,
  Coins,
  Footprints,
  Car,
  AlertTriangle,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Web Audio Synthesizer for Chicken Road                                     */
/* -------------------------------------------------------------------------- */
class ChickenAudioEngine {
  private ctx: AudioContext | null = null;
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

  public playHopSound(laneIndex = 0) {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const baseFreq = 400 + laneIndex * 25;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {
      // Ignore
    }
  }

  public playCrashSound() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      // 1. Tire Screech (Sawtooth)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.35);

      gain1.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start();
      osc1.stop(this.ctx.currentTime + 0.4);

      // 2. Heavy Impact Thud
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);

      gain2.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start();
      osc2.stop(this.ctx.currentTime + 0.35);
    } catch {
      // Ignore
    }
  }

  public playCashoutSound() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const notes = [587.33, 739.99, 880.0, 1174.66]; // D Major Fanfare
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.07);

        gain.gain.setValueAtTime(0.12, this.ctx!.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.07 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(this.ctx!.currentTime + idx * 0.07);
        osc.stop(this.ctx!.currentTime + idx * 0.07 + 0.4);
      });
    } catch {
      // Ignore
    }
  }
}

const chickenAudio = new ChickenAudioEngine();

export const ChickenRoadPage: React.FC = () => {
  const { token } = useAuthStore();
  const { balance } = useWalletStore();
  const {
    game,
    difficulty,
    betAmount,
    isLoading,
    isStepping,
    isCashingOut,
    history,
    soundEnabled,
    error,
    setDifficulty,
    setBetAmount,
    toggleSound,
    setError,
    fetchActiveGame,
    fetchHistory,
    startGame,
    stepForward,
    cashout,
  } = useChickenRoadStore();

  const [isFairModalOpen, setIsFairModalOpen] = useState(false);

  useEffect(() => {
    const handleGesture = () => chickenAudio.init();
    window.addEventListener('pointerdown', handleGesture, { once: true });
    return () => window.removeEventListener('pointerdown', handleGesture);
  }, []);

  useEffect(() => {
    if (token) {
      fetchActiveGame();
      fetchHistory();
    }
  }, [token]);

  const handleHopStep = async () => {
    if (!game || game.status !== 'IN_PROGRESS' || isStepping) return;
    const currentLane = game.currentLane;
    const outcome = await stepForward();

    if (soundEnabled) {
      if (outcome === 'CRASHED') {
        chickenAudio.playCrashSound();
      } else if (outcome === 'SAFE') {
        chickenAudio.playHopSound(currentLane);
      } else if (outcome === 'FULL_CROSS_WIN') {
        chickenAudio.playCashoutSound();
      }
    }
  };

  const handleCashoutClick = async () => {
    await cashout();
    if (soundEnabled) {
      chickenAudio.playCashoutSound();
    }
  };

  const config = CHICKEN_ROAD_DIFFICULTY_DATA[difficulty];
  const isInProgress = game?.status === 'IN_PROGRESS';
  const currentMultiplier = game?.currentMultiplier || 1.0;
  const currentPotentialPayout = Math.floor(betAmount * currentMultiplier * 100) / 100;
  const nextLaneMultiplier =
    isInProgress && game.currentLane < config.totalLanes
      ? config.multipliers[game.currentLane]
      : config.multipliers[0];

  return (
    <div className="min-h-screen bg-arena-bg text-arena-text px-4 sm:px-6 lg:px-8 py-8 font-sans selection:bg-amber-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 rounded-3xl border border-arena-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-600 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl">
                🐔
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-display tracking-wide text-arena-text">
                  DAGI <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500">CHICKEN ROAD</span>
                </h1>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-black tracking-wider uppercase font-mono">
                  97% RTP • PROVABLY FAIR
                </span>
              </div>
              <span className="text-xs text-arena-muted font-bold">
                Guide the chicken across high-speed traffic lanes, dodge vehicles, and cash out your multiplier!
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

        {/* Error Alert */}
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

        {/* MAIN GAME INTERFACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: CONTROLS & STAKE PANEL */}
          <div className="lg:col-span-4 space-y-4">
            <div className="glass-panel-elevated rounded-3xl p-5 border border-arena-border shadow-2xl space-y-5">
              <span className="text-xs font-black uppercase tracking-wider text-arena-muted font-display block border-b border-arena-border pb-2">
                Highway Crossing Settings
              </span>

              {/* Difficulty Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-arena-muted font-display">
                  Traffic Intensity
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {(Object.keys(CHICKEN_ROAD_DIFFICULTY_DATA) as ChickenRoadDifficulty[]).map((dKey) => {
                    const d = CHICKEN_ROAD_DIFFICULTY_DATA[dKey];
                    const isSelected = difficulty === dKey;

                    return (
                      <button
                        key={dKey}
                        type="button"
                        disabled={isInProgress}
                        onClick={() => setDifficulty(dKey)}
                        className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer disabled:opacity-50 ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                            : 'bg-arena-surface hover:bg-arena-highlight border-arena-border'
                        }`}
                      >
                        <span className="text-xs font-black text-arena-text block font-display">
                          {d.name}
                        </span>
                        <span className="text-[10px] text-arena-muted font-mono block">
                          {Math.round(d.safeProbability * 100)}% Safe / {d.totalLanes} Lanes
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stake Amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-arena-muted font-display">
                    Bet Amount (ETB)
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
                    disabled={isInProgress}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    className="w-full bg-arena-surface border border-arena-border rounded-2xl py-3.5 pl-4 pr-16 font-black font-mono text-lg text-arena-text outline-none focus:border-amber-400 transition-colors disabled:opacity-50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-arena-muted font-mono">
                    ETB
                  </span>
                </div>

                {/* Stake Presets */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 25, 50, 100].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      disabled={isInProgress}
                      onClick={() => setBetAmount(betAmount + chip)}
                      className="py-1.5 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-xl text-xs font-bold text-arena-muted transition-colors cursor-pointer disabled:opacity-50"
                    >
                      +{chip}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={isInProgress}
                    onClick={() => setBetAmount(Math.max(0.5, Math.floor(betAmount / 2)))}
                    className="py-1.5 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-xl text-xs font-bold text-arena-muted transition-colors cursor-pointer disabled:opacity-50"
                  >
                    1/2
                  </button>
                  <button
                    type="button"
                    disabled={isInProgress}
                    onClick={() => setBetAmount(betAmount * 2)}
                    className="py-1.5 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-xl text-xs font-bold text-arena-muted transition-colors cursor-pointer disabled:opacity-50"
                  >
                    2×
                  </button>
                  <button
                    type="button"
                    disabled={isInProgress || !balance}
                    onClick={() => setBetAmount(balance?.availableBalance || 10)}
                    className="py-1.5 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-xl text-xs font-bold text-arena-muted transition-colors cursor-pointer disabled:opacity-50"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* ACTION BUTTONS: START / HOP / CASHOUT */}
              {!isInProgress ? (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={startGame}
                  className="w-full py-4 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-display disabled:opacity-50"
                >
                  <Zap className="w-5 h-5 fill-slate-950" />
                  <span>START CROSSING ({betAmount} ETB)</span>
                </button>
              ) : (
                <div className="space-y-2.5">
                  {/* HOP NEXT LANE BUTTON */}
                  <button
                    type="button"
                    disabled={isStepping}
                    onClick={handleHopStep}
                    className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-display disabled:opacity-50 animate-pulse"
                  >
                    <Footprints className="w-5 h-5" />
                    <span>HOP TO LANE {game.currentLane + 1} ({nextLaneMultiplier}×)</span>
                  </button>

                  {/* CASHOUT BUTTON */}
                  <button
                    type="button"
                    disabled={isCashingOut || game.currentLane === 0}
                    onClick={handleCashoutClick}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-display disabled:opacity-50"
                  >
                    <Coins className="w-4 h-4 fill-slate-950" />
                    <span>CASHOUT {currentPotentialPayout.toFixed(2)} ETB ({currentMultiplier}×)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: 60FPS REALISTIC CANVAS SIMULATION */}
          <div className="lg:col-span-8 space-y-3">
            {/* Status Bar */}
            <div className="flex items-center justify-between glass-panel p-3 rounded-2xl border border-arena-border">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-arena-muted uppercase font-bold">LANE:</span>
                <span className="text-amber-400 font-black">
                  {isInProgress ? `${game.currentLane} / ${config.totalLanes}` : `0 / ${config.totalLanes}`}
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-arena-muted uppercase font-bold">MULTIPLIER:</span>
                <span className="text-emerald-400 font-black text-sm">{currentMultiplier}×</span>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-arena-muted uppercase font-bold">POTENTIAL:</span>
                <span className="text-amber-300 font-black text-sm">
                  {currentPotentialPayout.toFixed(2)} ETB
                </span>
              </div>
            </div>

            {/* Canvas Visualizer */}
            <ChickenRoadCanvas
              game={game}
              difficulty={difficulty}
              isStepping={isStepping}
            />
          </div>
        </div>

        {/* BET HISTORY */}
        <div className="glass-panel rounded-3xl p-6 border border-arena-border space-y-4">
          <div className="flex items-center justify-between border-b border-arena-border pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-black uppercase font-display tracking-wider text-arena-text">
                My Chicken Road History
              </h2>
            </div>
            <span className="text-xs font-mono text-arena-muted">
              {history.length} games recorded
            </span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8 text-arena-muted text-sm font-bold">
              No Chicken Road runs played yet. Pick your difficulty and start crossing!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-arena-border text-arena-muted font-mono uppercase">
                    <th className="pb-3 font-bold">Game ID</th>
                    <th className="pb-3 font-bold">Difficulty</th>
                    <th className="pb-3 font-bold">Stake</th>
                    <th className="pb-3 font-bold">Lane Reached</th>
                    <th className="pb-3 font-bold">Multiplier</th>
                    <th className="pb-3 font-bold">Status</th>
                    <th className="pb-3 font-bold text-right">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-arena-border/40 font-mono">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-arena-surface/50 transition-colors">
                      <td className="py-3 text-arena-muted font-mono">#{h.id.substring(h.id.length - 6)}</td>
                      <td className="py-3 font-bold">{h.difficulty}</td>
                      <td className="py-3">{h.betAmount.toFixed(2)} ETB</td>
                      <td className="py-3 font-bold text-amber-400">Lane {h.reachedLane}</td>
                      <td className="py-3">{h.multiplier.toFixed(2)}×</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            h.status === 'CASHED_OUT'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
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
                    Chicken Road Provably Fair Verification
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
                  Every 25-lane hazard layout is predetermined prior to Lane 1 crossing using cryptographic SHA-256 seed hashing.
                </p>

                {game ? (
                  <div className="space-y-2 font-mono bg-arena-surface p-4 rounded-2xl border border-arena-border">
                    <div>
                      <span className="text-[10px] font-bold text-arena-muted uppercase block">Game ID:</span>
                      <span className="text-amber-400 font-bold">#{game.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-arena-muted uppercase block">Committed SHA-256 Hash:</span>
                      <span className="text-emerald-400 break-all">{game.hash}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-arena-muted uppercase block">Server Seed (Unhashed):</span>
                      <span className="text-amber-300 break-all">
                        {game.serverSeed || '*** HIDDEN UNTIL CASHOUT / CRASH ***'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-arena-surface rounded-2xl text-center text-arena-muted font-bold">
                    Start a crossing run to generate a provably fair seed hash.
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
