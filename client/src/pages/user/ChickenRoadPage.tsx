import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { useChickenRoadStore, CHICKEN_SKINS, ROAD_MULTIPLIERS } from '../../stores/chickenRoadStore';
import { ChickenRoadCanvas } from '../../components/chickenroad/ChickenRoadCanvas';
import { ChickenSkinType } from '../../shared';
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
  Coins,
  Footprints,
  Users,
  Trophy,
  Sliders,
  Palette,
  ChevronRight,
  TrendingUp,
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

  public playHopSound(roadIndex = 0) {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const baseFreq = 380 + roadIndex * 20;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, this.ctx.currentTime + 0.12);

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

  public playSuccessChime() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const notes = [659.25, 880.0]; // E5, A5
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.06);

        gain.gain.setValueAtTime(0.09, this.ctx!.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(this.ctx!.currentTime + idx * 0.06);
        osc.stop(this.ctx!.currentTime + idx * 0.06 + 0.25);
      });
    } catch {
      // Ignore
    }
  }

  public playCrashSound() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      // Tire screech
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(750, this.ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.35);

      gain1.gain.setValueAtTime(0.14, this.ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.38);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start();
      osc1.stop(this.ctx.currentTime + 0.38);

      // Impact thud
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.28);

      gain2.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.32);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start();
      osc2.stop(this.ctx.currentTime + 0.32);
    } catch {
      // Ignore
    }
  }

  public playVictoryFanfare() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C Major Fanfare
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.12, this.ctx!.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.08 + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(this.ctx!.currentTime + idx * 0.08);
        osc.stop(this.ctx!.currentTime + idx * 0.08 + 0.45);
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
    skin,
    betAmount,
    autoStopMultiplier,
    isLoading,
    isStepping,
    isCashingOut,
    history,
    liveRuns,
    soundEnabled,
    isSkinModalOpen,
    error,
    setSkin,
    setBetAmount,
    setAutoStopMultiplier,
    setIsSkinModalOpen,
    toggleSound,
    setError,
    fetchActiveGame,
    fetchHistory,
    fetchLiveRuns,
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
    fetchLiveRuns();
    const interval = setInterval(() => fetchLiveRuns(), 8000);
    return () => clearInterval(interval);
  }, [token]);

  const handleCrossStep = async () => {
    if (!game || game.status !== 'IN_PROGRESS' || isStepping) return;
    const currentRoad = game.currentRoad;
    const outcome = await stepForward();

    if (soundEnabled) {
      if (outcome === 'CRASHED') {
        chickenAudio.playCrashSound();
      } else if (outcome === 'SAFE') {
        chickenAudio.playHopSound(currentRoad);
        chickenAudio.playSuccessChime();
      } else if (outcome === 'AUTO_COLLECT_WIN' || outcome === 'FINISH_LINE_VICTORY') {
        chickenAudio.playVictoryFanfare();
      }
    }
  };

  const handleCollectClick = async () => {
    await cashout();
    if (soundEnabled) {
      chickenAudio.playVictoryFanfare();
    }
  };

  const isInProgress = game?.status === 'IN_PROGRESS';
  const currentMultiplier = game?.currentMultiplier || 1.0;
  const currentPotentialPayout = Math.floor(betAmount * currentMultiplier * 100) / 100;
  const nextRoadMultiplier =
    isInProgress && game.currentRoad < 25
      ? ROAD_MULTIPLIERS[game.currentRoad + 1]
      : ROAD_MULTIPLIERS[1];

  const currentSkinConfig = CHICKEN_SKINS.find((s) => s.id === skin) || CHICKEN_SKINS[0];

  return (
    <div className="min-h-screen bg-arena-bg text-arena-text px-4 sm:px-6 lg:px-8 py-8 font-sans selection:bg-amber-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* TOP ARCADE HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 rounded-3xl border border-arena-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-600 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl">
                {currentSkinConfig.emoji}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-display tracking-wide text-arena-text">
                  CHICKEN <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500">ROAD</span>
                </h1>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-black tracking-wider uppercase font-mono">
                  ARCADE CROSSING
                </span>
              </div>
              <span className="text-xs text-arena-muted font-bold">
                “How far should you push the chicken before collecting your multiplier?”
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Skin Selector Button */}
            <button
              type="button"
              onClick={() => setIsSkinModalOpen(true)}
              className="px-3 py-2 glass-panel rounded-2xl border border-arena-border hover:border-amber-400/50 hover:bg-amber-500/10 text-arena-text transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <Palette className="w-4 h-4 text-amber-400" />
              <span>Skin: <strong>{currentSkinConfig.name}</strong></span>
            </button>

            {/* Provably Fair Verifier */}
            <button
              type="button"
              onClick={() => setIsFairModalOpen(true)}
              className="p-2.5 glass-panel rounded-2xl border border-arena-border hover:border-emerald-500/50 hover:bg-emerald-500/10 text-arena-muted hover:text-emerald-400 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
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

        {/* RECENT OUTCOMES STRIP */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
          <span className="text-[10px] font-black uppercase tracking-wider text-arena-muted font-display flex-shrink-0 mr-1">
            RECENT RESULTS:
          </span>
          {liveRuns.map((r) => (
            <div
              key={r.id}
              className={`px-3 py-1 rounded-xl text-xs font-black font-mono flex-shrink-0 border transition-all flex items-center gap-1 ${
                r.status === 'WON'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                  : 'bg-arena-surface text-arena-muted border-arena-border'
              }`}
            >
              <span>{r.multiplier.toFixed(2)}×</span>
              <span className="text-[10px] text-arena-muted">({r.username})</span>
            </div>
          ))}
        </div>

        {/* MAIN GAME DISPLAY & CONTROLS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: BETTING & RISK-REWARD CONSOLE */}
          <div className="lg:col-span-4 space-y-4">
            <div className="glass-panel-elevated rounded-3xl p-5 border border-arena-border shadow-2xl space-y-5">
              {/* CURRENT RUN MULTIPLIER READOUT */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-slate-950 border border-amber-500/30 text-center space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-arena-muted font-display">
                  CURRENT RUN
                </span>
                <div className="font-black font-mono text-4xl text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                  {currentMultiplier.toFixed(2)}×
                </div>
                <span className="text-[11px] text-emerald-400 font-mono font-bold block">
                  {isInProgress ? `Road ${game.currentRoad} Crossed • ${currentPotentialPayout.toFixed(2)} ETB` : 'Ready to Start'}
                </span>
              </div>

              {/* Stake Amount */}
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
                    disabled={isInProgress}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    className="w-full bg-arena-surface border border-arena-border rounded-2xl py-3.5 pl-4 pr-16 font-black font-mono text-lg text-arena-text outline-none focus:border-amber-400 transition-colors disabled:opacity-50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-arena-muted font-mono">
                    ETB
                  </span>
                </div>

                {/* Presets */}
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

              {/* Auto Stop Multiplier */}
              <div className="space-y-2 pt-2 border-t border-arena-border">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase text-arena-muted font-display">
                    Auto Stop Multiplier
                  </label>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    {autoStopMultiplier ? `${autoStopMultiplier}× target` : 'Off'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[2.0, 3.2, 5.0, 10.0].map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={isInProgress}
                      onClick={() => setAutoStopMultiplier(autoStopMultiplier === t ? null : t)}
                      className={`py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer disabled:opacity-50 ${
                        autoStopMultiplier === t
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-arena-surface border-arena-border text-arena-muted hover:text-arena-text'
                      }`}
                    >
                      {t}×
                    </button>
                  ))}
                </div>
              </div>

              {/* ACTION BUTTONS: START / CROSS ROAD / COLLECT */}
              {!isInProgress ? (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={startGame}
                  className="w-full py-4 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-display disabled:opacity-50"
                >
                  <Zap className="w-5 h-5 fill-slate-950" />
                  <span>START RUN ({betAmount} ETB)</span>
                </button>
              ) : (
                <div className="space-y-2.5">
                  {/* CROSS ROAD BUTTON */}
                  <button
                    type="button"
                    disabled={isStepping}
                    onClick={handleCrossStep}
                    className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-display disabled:opacity-50 animate-pulse"
                  >
                    <Footprints className="w-5 h-5" />
                    <span>CROSS ROAD {game.currentRoad + 1} ({nextRoadMultiplier}×)</span>
                  </button>

                  {/* COLLECT BUTTON */}
                  <button
                    type="button"
                    disabled={isCashingOut || game.currentRoad === 0}
                    onClick={handleCollectClick}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-display disabled:opacity-50"
                  >
                    <Coins className="w-4 h-4 fill-slate-950" />
                    <span>COLLECT {currentPotentialPayout.toFixed(2)} ETB ({currentMultiplier}×)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: 3D-STYLIZED ARCADE ROAD CANVAS */}
          <div className="lg:col-span-8 space-y-3">
            {/* Live Progress Header */}
            <div className="flex items-center justify-between glass-panel p-3 rounded-2xl border border-arena-border">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-arena-muted uppercase font-bold">STAGE:</span>
                <span className="text-amber-400 font-black uppercase">
                  {game?.stageTheme || 'COUNTRY ROAD 🌾'}
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-arena-muted uppercase font-bold">ROAD:</span>
                <span className="text-emerald-400 font-black text-sm">
                  {isInProgress ? `${game.currentRoad} / 25` : '0 / 25'}
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-arena-muted uppercase font-bold">NEXT MULTIPLIER:</span>
                <span className="text-amber-300 font-black text-sm">{nextRoadMultiplier}×</span>
              </div>
            </div>

            {/* 3D Stylized Canvas Simulator */}
            <ChickenRoadCanvas
              game={game}
              selectedSkin={skin}
              isStepping={isStepping}
            />
          </div>
        </div>

        {/* BET HISTORY & LIVE RUNS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MY HISTORY */}
          <div className="glass-panel rounded-3xl p-6 border border-arena-border space-y-4">
            <div className="flex items-center justify-between border-b border-arena-border pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-black uppercase font-display tracking-wider text-arena-text">
                  My Chicken Road History
                </h2>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-6 text-arena-muted text-xs font-bold">
                No runs recorded yet. Start crossing the roads!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-arena-border text-arena-muted font-mono uppercase">
                      <th className="pb-2 font-bold">Skin</th>
                      <th className="pb-2 font-bold">Stake</th>
                      <th className="pb-2 font-bold">Road Reached</th>
                      <th className="pb-2 font-bold">Multiplier</th>
                      <th className="pb-2 font-bold text-right">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-arena-border/40 font-mono">
                    {history.slice(0, 8).map((h) => (
                      <tr key={h.id} className="hover:bg-arena-surface/50 transition-colors">
                        <td className="py-2.5 font-bold flex items-center gap-1">
                          <span>{CHICKEN_SKINS.find((s) => s.id === h.skin)?.emoji || '🐔'}</span>
                          <span>{h.skin}</span>
                        </td>
                        <td className="py-2.5">{h.betAmount.toFixed(2)} ETB</td>
                        <td className="py-2.5 font-bold text-amber-400">Road {h.reachedRoad}</td>
                        <td className="py-2.5">{h.multiplier.toFixed(2)}×</td>
                        <td className={`py-2.5 text-right font-black ${h.payoutAmount > 0 ? 'text-emerald-400' : 'text-arena-muted'}`}>
                          {h.payoutAmount > 0 ? `+${h.payoutAmount.toFixed(2)} ETB` : '0.00 ETB'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* LIVE COMMUNITY RUNS */}
          <div className="glass-panel rounded-3xl p-6 border border-arena-border space-y-4">
            <div className="flex items-center justify-between border-b border-arena-border pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-black uppercase font-display tracking-wider text-arena-text">
                  Live Chicken Runs
                </h2>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                ACTIVE
              </span>
            </div>

            <div className="space-y-2">
              {liveRuns.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-arena-surface border border-arena-border text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">
                      {CHICKEN_SKINS.find((s) => s.id === r.skin)?.emoji || '🐔'}
                    </span>
                    <div>
                      <span className="font-bold text-arena-text block">{r.username}</span>
                      <span className="text-[10px] text-arena-muted font-sans">
                        Road {r.currentRoad} • {r.status === 'WON' ? 'Collected' : 'Crossing'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-amber-400 block">{r.multiplier.toFixed(2)}×</span>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      +{r.payoutAmount.toFixed(2)} ETB
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CHICKEN SKIN CUSTOMIZATION MODAL */}
      <AnimatePresence>
        {isSkinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl glass-panel-elevated rounded-3xl p-6 border border-arena-border space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-arena-border pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-black font-display text-arena-text">
                    Choose Your Chicken Skin
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSkinModalOpen(false)}
                  className="p-1 hover:bg-arena-surface rounded-xl text-arena-muted hover:text-arena-text"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Skins Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {CHICKEN_SKINS.map((s) => {
                  const isSelected = skin === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSkin(s.id);
                        setIsSkinModalOpen(false);
                      }}
                      className={`p-3.5 rounded-2xl text-left border transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50 shadow-lg'
                          : 'bg-arena-surface hover:bg-arena-highlight border-arena-border'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-arena-border flex items-center justify-center text-2xl flex-shrink-0">
                        {s.emoji}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-arena-text font-display">{s.name}</span>
                          {isSelected && (
                            <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-mono font-black text-[9px] rounded-md">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-arena-muted leading-tight">{s.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setIsSkinModalOpen(false)}
                className="w-full py-3 bg-arena-surface hover:bg-arena-highlight border border-arena-border text-arena-text font-black text-xs uppercase rounded-2xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                    Chicken Road Provably Fair Engine
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
                  Every 25-road layout is determined deterministically before Road 1 starts using SHA-256 seed commitment.
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
                      <span className="text-[10px] font-bold text-arena-muted uppercase block">Server Seed:</span>
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
