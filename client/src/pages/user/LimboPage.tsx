import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { useLimboStore } from '../../stores/limboStore';
import {
  Trophy,
  Volume2,
  VolumeX,
  ShieldCheck,
  History,
  Zap,
  AlertCircle,
  X,
  Flame,
  Rocket,
  Sliders,
  Play,
  Square,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Web Audio Synthesizer for Limbo                                             */
/* -------------------------------------------------------------------------- */
class LimboAudioEngine {
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

  public playRollWhoosh() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {
      // Ignore
    }
  }

  public playWinChime() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const notes = [659.25, 880.0, 1174.66]; // E5, A5, D6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.06);

        gain.gain.setValueAtTime(0.12, this.ctx!.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(this.ctx!.currentTime + idx * 0.06);
        osc.stop(this.ctx!.currentTime + idx * 0.06 + 0.35);
      });
    } catch {
      // Ignore
    }
  }

  public playLossBlip() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch {
      // Ignore
    }
  }
}

const limboAudio = new LimboAudioEngine();

export const LimboPage: React.FC = () => {
  const { token } = useAuthStore();
  const { balance } = useWalletStore();
  const {
    betAmount,
    targetMultiplier,
    lastRoll,
    lastBet,
    isRolling,
    history,
    stats,
    soundEnabled,
    error,
    isAutoBetting,
    autoBetCount,
    autoBetOnWinMultiplier,
    autoBetOnLossMultiplier,
    autoStopOnProfit,
    autoStopOnLoss,
    setBetAmount,
    setTargetMultiplier,
    toggleSound,
    setError,
    setAutoBetCount,
    setAutoBetOnWinMultiplier,
    setAutoBetOnLossMultiplier,
    setAutoStopOnProfit,
    setAutoStopOnLoss,
    stopAutoBet,
    placeBet,
    startAutoBet,
    fetchHistory,
    fetchStats,
  } = useLimboStore();

  const [activeTab, setActiveTab] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [displayedRoll, setDisplayedRoll] = useState<number>(2.0);
  const [isFairModalOpen, setIsFairModalOpen] = useState(false);
  const animOdometerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleGesture = () => limboAudio.init();
    window.addEventListener('pointerdown', handleGesture, { once: true });
    return () => window.removeEventListener('pointerdown', handleGesture);
  }, []);

  useEffect(() => {
    if (token) {
      fetchHistory();
    }
    fetchStats();
  }, [token]);

  // Spacebar quick hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT' && !isRolling && !isAutoBetting) {
        e.preventDefault();
        handleManualBet();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRolling, isAutoBetting, betAmount, targetMultiplier]);

  const handleManualBet = async () => {
    if (isRolling || isAutoBetting) return;
    if (soundEnabled) limboAudio.playRollWhoosh();

    // Fast rolling odometer animation
    let count = 0;
    const interval = setInterval(() => {
      setDisplayedRoll(Math.floor((Math.random() * 15 + 1) * 100) / 100);
      count++;
      if (count > 6) clearInterval(interval);
    }, 30);

    const bet = await placeBet();
    clearInterval(interval);

    if (bet) {
      setDisplayedRoll(bet.resultMultiplier);
      if (soundEnabled) {
        if (bet.status === 'WON') {
          limboAudio.playWinChime();
        } else {
          limboAudio.playLossBlip();
        }
      }
    }
  };

  const winChance = Math.floor((98 / targetMultiplier) * 100) / 100;
  const profitOnWin = Math.floor(betAmount * targetMultiplier * 100) / 100 - betAmount;
  const isLastWin = lastBet?.status === 'WON';

  return (
    <div className="min-h-screen bg-arena-bg text-arena-text px-4 sm:px-6 lg:px-8 py-8 font-sans selection:bg-rose-500 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 rounded-3xl border border-arena-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-orange-500 to-amber-500 p-0.5 shadow-lg shadow-rose-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl">
                🚀
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-display tracking-wide text-arena-text">
                  DAGI <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400">LIMBO</span>
                </h1>
                <span className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-full text-[10px] font-black tracking-wider uppercase font-mono">
                  UP TO 1,000,000×
                </span>
              </div>
              <span className="text-xs text-arena-muted font-bold">
                Instant multiplier target game with 98% RTP & provably fair SHA-256 HMAC rolls!
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
              {soundEnabled ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4" />}
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

        {/* RECENT MULTIPLIERS STRIP */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
          <span className="text-[10px] font-black uppercase tracking-wider text-arena-muted font-display flex-shrink-0 mr-1">
            RECENT:
          </span>
          {history.slice(0, 14).map((h) => (
            <div
              key={h.id}
              className={`px-3 py-1 rounded-xl text-xs font-black font-mono flex-shrink-0 border transition-all ${
                h.status === 'WON'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                  : 'bg-arena-surface text-arena-muted border-arena-border'
              }`}
            >
              {h.resultMultiplier.toFixed(2)}×
            </div>
          ))}
        </div>

        {/* MAIN GAME DISPLAY & CONTROLS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: BETTING & AUTO CONTROLS */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel-elevated rounded-3xl p-5 border border-arena-border shadow-2xl space-y-5">
              {/* Tab Switcher: Manual vs Auto */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-arena-surface rounded-2xl border border-arena-border">
                <button
                  type="button"
                  disabled={isAutoBetting}
                  onClick={() => setActiveTab('MANUAL')}
                  className={`py-2 rounded-xl text-xs font-black font-display uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'MANUAL'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'text-arena-muted hover:text-arena-text'
                  }`}
                >
                  Manual Roll
                </button>
                <button
                  type="button"
                  disabled={isAutoBetting}
                  onClick={() => setActiveTab('AUTO')}
                  className={`py-2 rounded-xl text-xs font-black font-display uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'AUTO'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'text-arena-muted hover:text-arena-text'
                  }`}
                >
                  Auto Bot
                </button>
              </div>

              {/* Stake Input */}
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
                    disabled={isAutoBetting}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    className="w-full bg-arena-surface border border-arena-border rounded-2xl py-3.5 pl-4 pr-16 font-black font-mono text-lg text-arena-text outline-none focus:border-rose-400 transition-colors disabled:opacity-50"
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
                      disabled={isAutoBetting}
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
                    disabled={isAutoBetting}
                    onClick={() => setBetAmount(Math.max(0.5, Math.floor(betAmount / 2)))}
                    className="py-1.5 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-xl text-xs font-bold text-arena-muted transition-colors cursor-pointer disabled:opacity-50"
                  >
                    1/2
                  </button>
                  <button
                    type="button"
                    disabled={isAutoBetting}
                    onClick={() => setBetAmount(betAmount * 2)}
                    className="py-1.5 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-xl text-xs font-bold text-arena-muted transition-colors cursor-pointer disabled:opacity-50"
                  >
                    2×
                  </button>
                  <button
                    type="button"
                    disabled={isAutoBetting || !balance}
                    onClick={() => setBetAmount(balance?.availableBalance || 10)}
                    className="py-1.5 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-xl text-xs font-bold text-arena-muted transition-colors cursor-pointer disabled:opacity-50"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Target Multiplier & Win Chance Slider */}
              <div className="space-y-3 pt-2 border-t border-arena-border">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-black uppercase text-arena-muted font-display block mb-1">
                      Target Multiplier
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1.01"
                        max="1000000"
                        step="0.1"
                        disabled={isAutoBetting}
                        value={targetMultiplier}
                        onChange={(e) => setTargetMultiplier(Number(e.target.value))}
                        className="w-full bg-arena-surface border border-arena-border rounded-xl py-2 pl-3 pr-8 font-mono font-black text-sm text-arena-text outline-none focus:border-rose-400"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-rose-400 font-mono">
                        ×
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase text-arena-muted font-display block mb-1">
                      Win Chance (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0.0001"
                        max="97.02"
                        step="0.1"
                        disabled={isAutoBetting}
                        value={winChance}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val > 0) setTargetMultiplier(Math.floor((98 / val) * 100) / 100);
                        }}
                        className="w-full bg-arena-surface border border-arena-border rounded-xl py-2 pl-3 pr-8 font-mono font-black text-sm text-arena-text outline-none focus:border-rose-400"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-400 font-mono">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Target Presets */}
                <div className="grid grid-cols-5 gap-1">
                  {[1.5, 2.0, 5.0, 10.0, 100.0].map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={isAutoBetting}
                      onClick={() => setTargetMultiplier(t)}
                      className={`py-1 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                        targetMultiplier === t
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : 'bg-arena-surface border-arena-border text-arena-muted hover:text-arena-text'
                      }`}
                    >
                      {t}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Profit on Win Calculation */}
              <div className="flex items-center justify-between p-3 bg-arena-surface rounded-2xl border border-arena-border text-xs">
                <span className="font-bold text-arena-muted">Profit on Win:</span>
                <span className="font-mono font-black text-emerald-400">
                  +{profitOnWin.toFixed(2)} ETB
                </span>
              </div>

              {/* ACTION BUTTON */}
              {activeTab === 'MANUAL' ? (
                <button
                  type="button"
                  disabled={isRolling}
                  onClick={handleManualBet}
                  className="w-full py-4 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 active:scale-[0.98] text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-rose-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-display disabled:opacity-50"
                >
                  <Rocket className="w-5 h-5 fill-white" />
                  <span>ROLL LIMBO ({betAmount} ETB)</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-arena-muted font-bold block mb-1">Number of Bets</label>
                      <input
                        type="number"
                        min="1"
                        value={autoBetCount}
                        disabled={isAutoBetting}
                        onChange={(e) => setAutoBetCount(Number(e.target.value))}
                        className="w-full bg-arena-surface border border-arena-border rounded-xl py-1.5 px-3 font-mono text-xs text-arena-text"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-arena-muted font-bold block mb-1">On Loss Multiply</label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={autoBetOnLossMultiplier}
                        disabled={isAutoBetting}
                        onChange={(e) => setAutoBetOnLossMultiplier(Number(e.target.value))}
                        className="w-full bg-arena-surface border border-arena-border rounded-xl py-1.5 px-3 font-mono text-xs text-arena-text"
                      />
                    </div>
                  </div>

                  {!isAutoBetting ? (
                    <button
                      type="button"
                      onClick={startAutoBet}
                      className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:brightness-110 active:scale-[0.98] text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer font-display"
                    >
                      <Play className="w-5 h-5 fill-white" />
                      <span>START AUTO BOT</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopAutoBet}
                      className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer font-display animate-pulse"
                    >
                      <Square className="w-5 h-5 fill-white" />
                      <span>STOP AUTO BOT</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: GIANT NEON MULTIPLIER ODOMETER DISPLAY */}
          <div className="lg:col-span-7 glass-panel-elevated rounded-3xl p-6 sm:p-10 border border-arena-border shadow-2xl space-y-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[380px]">
            {/* Background Glow */}
            <div
              className={`absolute inset-0 transition-opacity duration-300 opacity-20 pointer-events-none ${
                isLastWin ? 'bg-emerald-500/30' : 'bg-rose-500/20'
              }`}
            />

            <span className="text-xs font-black uppercase tracking-widest text-arena-muted font-display">
              TARGET MULTIPLIER: <strong className="text-white">{targetMultiplier.toFixed(2)}×</strong>
            </span>

            {/* Giant Odometer Readout */}
            <motion.div
              key={displayedRoll}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className={`font-black font-mono tracking-tighter text-6xl sm:text-8xl lg:text-9xl transition-colors duration-200 select-none ${
                displayedRoll >= targetMultiplier
                  ? 'text-emerald-400 drop-shadow-[0_0_35px_rgba(52,211,153,0.6)]'
                  : 'text-rose-500 drop-shadow-[0_0_35px_rgba(244,63,94,0.4)]'
              }`}
            >
              {displayedRoll.toFixed(2)}
              <span className="text-4xl sm:text-5xl ml-1">×</span>
            </motion.div>

            {/* Result Status Badge */}
            {lastBet && (
              <div
                className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider font-display flex items-center gap-2 shadow-lg ${
                  lastBet.status === 'WON'
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                    : 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                }`}
              >
                {lastBet.status === 'WON' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>TARGET HIT! WON +{lastBet.payoutAmount.toFixed(2)} ETB</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-rose-400" />
                    <span>MISSED TARGET ({targetMultiplier}×)</span>
                  </>
                )}
              </div>
            )}

            {/* Trajectory Rocket Track Indicator */}
            <div className="w-full max-w-md bg-arena-surface h-3 rounded-full overflow-hidden border border-arena-border relative mt-4">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-rose-500 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(5, (targetMultiplier / 10) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* BET HISTORY */}
        <div className="glass-panel rounded-3xl p-6 border border-arena-border space-y-4">
          <div className="flex items-center justify-between border-b border-arena-border pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-black uppercase font-display tracking-wider text-arena-text">
                My Limbo Roll History
              </h2>
            </div>
            <span className="text-xs font-mono text-arena-muted">
              {history.length} bets recorded
            </span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8 text-arena-muted text-sm font-bold">
              No Limbo bets recorded yet. Target your multiplier and hit roll!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-arena-border text-arena-muted font-mono uppercase">
                    <th className="pb-3 font-bold">Time</th>
                    <th className="pb-3 font-bold">Stake</th>
                    <th className="pb-3 font-bold">Target</th>
                    <th className="pb-3 font-bold">Result Roll</th>
                    <th className="pb-3 font-bold">Status</th>
                    <th className="pb-3 font-bold text-right">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-arena-border/40 font-mono">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-arena-surface/50 transition-colors">
                      <td className="py-3 text-arena-muted font-mono">
                        {new Date(h.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3">{h.betAmount.toFixed(2)} ETB</td>
                      <td className="py-3 font-bold text-arena-text">{h.targetMultiplier.toFixed(2)}×</td>
                      <td className={`py-3 font-black ${h.status === 'WON' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {h.resultMultiplier.toFixed(2)}×
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            h.status === 'WON'
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
                    Limbo Provably Fair Verification
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
                  Limbo rolls are calculated using cryptographic HMAC-SHA256 of the server seed, client seed, and bet nonce.
                </p>

                {lastBet ? (
                  <div className="space-y-2 font-mono bg-arena-surface p-4 rounded-2xl border border-arena-border">
                    <div>
                      <span className="text-[10px] font-bold text-arena-muted uppercase block">Bet ID:</span>
                      <span className="text-rose-400 font-bold">#{lastBet.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-arena-muted uppercase block">Committed SHA-256 Hash:</span>
                      <span className="text-emerald-400 break-all">{lastBet.hash}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-arena-muted uppercase block">Server Seed:</span>
                      <span className="text-amber-300 break-all">{lastBet.serverSeed}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-arena-muted uppercase block">Client Seed & Nonce:</span>
                      <span className="text-sky-400 break-all">{lastBet.clientSeed} (Nonce: {lastBet.nonce})</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-arena-surface rounded-2xl text-center text-arena-muted font-bold">
                    Place a Limbo bet to view cryptographic seed verification.
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
