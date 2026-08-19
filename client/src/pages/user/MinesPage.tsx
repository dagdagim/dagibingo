import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { useMinesStore } from '../../stores/minesStore';
import {
  Bomb,
  Diamond,
  Volume2,
  VolumeX,
  ShieldCheck,
  Sparkles,
  History,
  RotateCcw,
  Trophy,
  Zap,
  HelpCircle,
  X,
  CheckCircle2,
  AlertCircle,
  Flame,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Web Audio Synthesizer for Mines                                            */
/* -------------------------------------------------------------------------- */
class MinesAudioEngine {
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

  public playDiamondChime(consecutiveIndex: number) {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const baseFreq = 523.25; // C5
      const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
      const semitone = scale[Math.min(consecutiveIndex, scale.length - 1)];
      const freq = baseFreq * Math.pow(2, semitone / 12);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.45);
    } catch {
      // Audio fallback
    }
  }

  public playExplosionBoom() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      // Sub-bass sweep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.6);
    } catch {
      // Audio fallback
    }
  }

  public playCashoutFanfare() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.12, this.ctx!.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(this.ctx!.currentTime + idx * 0.08);
        osc.stop(this.ctx!.currentTime + idx * 0.08 + 0.35);
      });
    } catch {
      // Audio fallback
    }
  }

  public playClick() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Audio fallback
    }
  }
}

const minesAudio = new MinesAudioEngine();

/* -------------------------------------------------------------------------- */
/* Mines Page Component                                                       */
/* -------------------------------------------------------------------------- */
export const MinesPage: React.FC = () => {
  const { token, isAuthenticated } = useAuthStore();
  const { balance } = useWalletStore();
  const {
    activeGame,
    betAmount,
    mineCount,
    revealedTiles,
    currentMultiplier,
    nextMultiplier,
    payoutAmount,
    status,
    grid,
    lastExplodedTile,
    lastRevealedGem,
    isStarting,
    isRevealing,
    isCashingOut,
    soundEnabled,
    error,
    history,
    stats,
    setBetAmount,
    setMineCount,
    toggleSound,
    setError,
    startGame,
    revealTile,
    autoPickRandomTile,
    cashout,
    fetchActiveGame,
    fetchHistory,
    fetchStats,
    resetGame,
  } = useMinesStore();

  const [isFairModalOpen, setIsFairModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'GAME' | 'HISTORY' | 'RULES'>('GAME');

  // Register pointer gesture
  useEffect(() => {
    const handleGesture = () => minesAudio.init();
    window.addEventListener('pointerdown', handleGesture, { once: true });
    return () => window.removeEventListener('pointerdown', handleGesture);
  }, []);

  // Fetch active game & data on mount
  useEffect(() => {
    if (token) {
      fetchActiveGame();
      fetchHistory();
    }
    fetchStats();
  }, [token]);

  // Audio triggers based on actions
  const handleTileClick = async (index: number) => {
    if (status !== 'IN_PROGRESS' || isRevealing || revealedTiles.includes(index)) return;
    minesAudio.playClick();

    const isMine = await revealTile(index);
    if (soundEnabled) {
      if (isMine) {
        minesAudio.playExplosionBoom();
      } else if (isMine === false) {
        minesAudio.playDiamondChime(revealedTiles.length);
      }
    }
  };

  const handleStartGame = async () => {
    minesAudio.playClick();
    await startGame();
  };

  const handleCashout = async () => {
    minesAudio.playClick();
    await cashout();
    if (soundEnabled) {
      minesAudio.playCashoutFanfare();
    }
  };

  const handleAutoPick = async () => {
    minesAudio.playClick();
    await autoPickRandomTile();
  };

  const totalSafeGems = 25 - mineCount;
  const gemsFound = revealedTiles.length;
  const isPlaying = status === 'IN_PROGRESS';
  const potentialWin = Math.floor(betAmount * currentMultiplier * 100) / 100;
  const nextWin = Math.floor(betAmount * nextMultiplier * 100) / 100;

  return (
    <div className="min-h-screen bg-arena-bg text-arena-text px-4 sm:px-6 lg:px-8 py-8 font-sans selection:bg-rose-500 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 rounded-3xl border border-arena-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-amber-500 to-emerald-400 p-0.5 shadow-lg shadow-rose-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-xl">
                💣
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-display tracking-wide text-arena-text">
                  DAGI <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400">MINES</span>
                </h1>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-black tracking-wider uppercase font-mono">
                  97% RTP
                </span>
              </div>
              <span className="text-xs text-arena-muted font-bold">
                Uncover diamonds, avoid hidden landmines & cash out on time!
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Provably Fair */}
            <button
              type="button"
              onClick={() => setIsFairModalOpen(true)}
              className="p-2.5 glass-panel rounded-2xl border border-arena-border hover:border-emerald-500/50 hover:bg-emerald-500/10 text-arena-muted hover:text-emerald-400 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Provably Fair Verifier"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Fair Seed</span>
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className={`p-2.5 glass-panel rounded-2xl border border-arena-border hover:bg-arena-surface text-arena-muted hover:text-arena-text transition-all cursor-pointer ${
                !soundEnabled && 'opacity-50'
              }`}
              title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4" />}
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

        {/* Main Game Arena (Grid on Left, Betting Control Panel on Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 5x5 MINES GRID (8 Cols on Desktop) */}
          <div className="lg:col-span-7 xl:col-span-8 glass-panel-elevated rounded-3xl p-5 sm:p-7 border border-arena-border shadow-2xl flex flex-col justify-between relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Top Multiplier & Profit HUD */}
            <div className="flex items-center justify-between pb-4 border-b border-arena-border mb-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-arena-muted font-display">
                  Current Multiplier
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-200 to-emerald-400 drop-shadow-md">
                    {currentMultiplier.toFixed(2)}×
                  </span>
                  {isPlaying && gemsFound > 0 && (
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      (+{(potentialWin - betAmount).toFixed(2)} ETB)
                    </span>
                  )}
                </div>
              </div>

              {/* Safe Diamonds / Mines Stats */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-arena-muted block font-display">
                    Safe Diamonds
                  </span>
                  <span className="text-base font-black font-mono text-emerald-400">
                    {gemsFound} / {totalSafeGems}
                  </span>
                </div>
                <div className="w-px h-8 bg-arena-border" />
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-arena-muted block font-display">
                    Mines
                  </span>
                  <span className="text-base font-black font-mono text-rose-500">
                    💣 {mineCount}
                  </span>
                </div>
              </div>
            </div>

            {/* 5x5 Interactive Grid */}
            <div className="relative aspect-square max-w-[480px] mx-auto w-full p-2">
              <div className="grid grid-cols-5 gap-2.5 sm:gap-3.5 h-full w-full">
                {Array.from({ length: 25 }, (_, idx) => {
                  const isRevealed = revealedTiles.includes(idx);
                  const isExploded = lastExplodedTile === idx;
                  const isGem = isRevealed && !isExploded;
                  const isGameOver = status === 'CASHED_OUT' || status === 'EXPLODED';
                  const showHiddenMine = isGameOver && grid && grid[idx] && !isRevealed;
                  const showHiddenGem = isGameOver && grid && !grid[idx] && !isRevealed;

                  return (
                    <motion.button
                      key={idx}
                      type="button"
                      disabled={!isPlaying || isRevealed || isRevealing}
                      onClick={() => handleTileClick(idx)}
                      whileHover={isPlaying && !isRevealed ? { scale: 1.05 } : {}}
                      whileTap={isPlaying && !isRevealed ? { scale: 0.95 } : {}}
                      className={`relative w-full h-full rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all duration-300 font-mono font-black select-none cursor-pointer border shadow-lg ${
                        isGem
                          ? 'bg-gradient-to-br from-emerald-400/30 via-teal-500/20 to-emerald-900/40 border-emerald-400/60 shadow-emerald-500/20'
                          : isExploded
                          ? 'bg-gradient-to-br from-rose-500/40 via-red-600/30 to-rose-950 border-rose-500 shadow-rose-500/40 animate-pulse'
                          : showHiddenMine
                          ? 'bg-rose-950/30 border-rose-500/30 opacity-60'
                          : showHiddenGem
                          ? 'bg-emerald-950/20 border-emerald-500/20 opacity-40'
                          : isPlaying
                          ? 'bg-arena-surface hover:bg-arena-highlight border-arena-border hover:border-indigo-500/50 shadow-inner'
                          : 'bg-arena-surface/60 border-arena-border/60 opacity-90'
                      }`}
                    >
                      {/* Active Gem Animation */}
                      {isGem && (
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="flex flex-col items-center justify-center gap-0.5"
                        >
                          <Diamond className="w-7 h-7 sm:w-9 sm:h-9 text-emerald-400 fill-emerald-400 filter drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                          <span className="text-[10px] sm:text-xs font-black text-emerald-300 font-mono">
                            💎
                          </span>
                        </motion.div>
                      )}

                      {/* Exploded Mine */}
                      {isExploded && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="flex flex-col items-center justify-center"
                        >
                          <Bomb className="w-8 h-8 sm:w-10 sm:h-10 text-rose-500 fill-rose-500 filter drop-shadow-[0_0_15px_rgba(244,63,94,0.9)]" />
                        </motion.div>
                      )}

                      {/* Game Over revealed remaining mines */}
                      {showHiddenMine && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.7 }}>
                          <Bomb className="w-5 h-5 sm:w-7 sm:h-7 text-rose-400" />
                        </motion.div>
                      )}

                      {/* Game Over revealed remaining safe diamonds */}
                      {showHiddenGem && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }}>
                          <Diamond className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-400" />
                        </motion.div>
                      )}

                      {/* Unrevealed tile cyber accent */}
                      {!isRevealed && !showHiddenMine && !showHiddenGem && (
                        <span className="w-2.5 h-2.5 rounded-full bg-arena-border/80" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Next Tile Multiplier Preview */}
            <div className="mt-4 pt-3 border-t border-arena-border flex items-center justify-between text-xs font-bold text-arena-muted">
              <span>Next Tile Multiplier:</span>
              <div className="flex items-center gap-1.5 font-mono text-arena-text">
                <span className="text-emerald-400 font-black">{nextMultiplier.toFixed(2)}×</span>
                {isPlaying && (
                  <span className="text-arena-muted">({nextWin.toFixed(2)} ETB)</span>
                )}
              </div>
            </div>
          </div>

          {/* BETTING CONTROLS & SETTINGS (4-5 Cols on Desktop) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            <div className="glass-panel-elevated rounded-3xl p-5 border border-arena-border shadow-2xl space-y-5">
              {/* Mine Count Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-arena-muted font-display flex items-center gap-1.5">
                    <Bomb className="w-4 h-4 text-rose-500" />
                    <span>Mines Count (1 - 24)</span>
                  </label>
                  <span className="text-sm font-black font-mono text-rose-500 px-2.5 py-0.5 bg-rose-500/10 rounded-full border border-rose-500/30">
                    {mineCount} {mineCount === 1 ? 'Mine' : 'Mines'}
                  </span>
                </div>

                {/* Preset Mine Pills */}
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 3, 5, 10, 24].map((count) => (
                    <button
                      key={count}
                      type="button"
                      disabled={isPlaying}
                      onClick={() => setMineCount(count)}
                      className={`py-2 rounded-xl text-xs font-black font-mono transition-all cursor-pointer border ${
                        mineCount === count
                          ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/30'
                          : 'bg-arena-surface hover:bg-arena-highlight border-arena-border text-arena-muted disabled:opacity-40'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min="1"
                  max="24"
                  disabled={isPlaying}
                  value={mineCount}
                  onChange={(e) => setMineCount(Number(e.target.value))}
                  className="w-full h-2 bg-arena-surface rounded-lg appearance-none cursor-pointer accent-rose-500 disabled:opacity-40"
                />
              </div>

              {/* Bet Amount Input */}
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
                    disabled={isPlaying}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    className="w-full bg-arena-surface border border-arena-border rounded-2xl py-3.5 pl-4 pr-16 font-black font-mono text-lg text-arena-text outline-none focus:border-rose-500 transition-colors disabled:opacity-50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-arena-muted font-mono">
                    ETB
                  </span>
                </div>

                {/* Preset Chip Buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 25, 50, 100].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      disabled={isPlaying}
                      onClick={() => setBetAmount(betAmount + chip)}
                      className="py-1.5 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-xl text-xs font-bold text-arena-muted transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      +{chip}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={isPlaying}
                    onClick={() => setBetAmount(Math.max(0.5, Math.floor(betAmount / 2)))}
                    className="py-1.5 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-xl text-xs font-bold text-arena-muted transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    1/2
                  </button>
                  <button
                    type="button"
                    disabled={isPlaying}
                    onClick={() => setBetAmount(betAmount * 2)}
                    className="py-1.5 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-xl text-xs font-bold text-arena-muted transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    2×
                  </button>
                  <button
                    type="button"
                    disabled={isPlaying || !balance}
                    onClick={() => setBetAmount(balance?.availableBalance || 10)}
                    className="py-1.5 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-xl text-xs font-bold text-arena-muted transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Primary Action Button (Start / Cashout) */}
              <div>
                {!isPlaying ? (
                  <button
                    type="button"
                    disabled={isStarting}
                    onClick={handleStartGame}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 active:scale-[0.98] text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-display disabled:opacity-50"
                  >
                    <Zap className="w-5 h-5 fill-slate-950" />
                    <span>START GAME ({betAmount} ETB)</span>
                  </button>
                ) : (
                  <div className="space-y-2.5">
                    {/* Glowing Cash Out Button */}
                    <motion.button
                      type="button"
                      disabled={isCashingOut || gemsFound === 0}
                      animate={gemsFound > 0 ? { scale: [1, 1.02, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 1 }}
                      onClick={handleCashout}
                      className={`w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-400 active:scale-[0.98] text-slate-950 font-black rounded-2xl shadow-2xl shadow-amber-500/40 transition-all flex flex-col items-center justify-center cursor-pointer border-2 border-amber-300 disabled:opacity-40 ${
                        gemsFound === 0 && 'cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-lg uppercase tracking-wider font-display font-black">
                        <Sparkles className="w-5 h-5 fill-slate-950" />
                        <span>CASH OUT</span>
                      </div>
                      <span className="text-sm font-mono font-black text-slate-900 bg-amber-300/60 px-3 py-0.5 rounded-full mt-0.5">
                        +{potentialWin.toFixed(2)} ETB ({currentMultiplier.toFixed(2)}×)
                      </span>
                    </motion.button>

                    {/* Auto-Pick Random Tile Button */}
                    <button
                      type="button"
                      disabled={isRevealing}
                      onClick={handleAutoPick}
                      className="w-full py-3 bg-arena-surface hover:bg-indigo-500/10 border border-arena-border hover:border-indigo-500/40 text-indigo-400 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>PICK RANDOM TILE</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Game Stats Card */}
            {stats && (
              <div className="glass-panel rounded-3xl p-4 border border-arena-border grid grid-cols-2 gap-3 text-center">
                <div className="p-2.5 bg-arena-surface rounded-2xl">
                  <span className="text-[10px] font-black uppercase text-arena-muted block font-display">
                    Max Multiplier
                  </span>
                  <span className="text-lg font-black font-mono text-emerald-400">
                    {stats.highestMultiplier.toFixed(2)}×
                  </span>
                </div>
                <div className="p-2.5 bg-arena-surface rounded-2xl">
                  <span className="text-[10px] font-black uppercase text-arena-muted block font-display">
                    Max Payout
                  </span>
                  <span className="text-lg font-black font-mono text-amber-400">
                    {stats.highestPayout.toFixed(2)} ETB
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History & Provably Fair Section */}
        <div className="glass-panel rounded-3xl p-6 border border-arena-border space-y-4">
          <div className="flex items-center justify-between border-b border-arena-border pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-rose-500" />
              <h2 className="text-base font-black uppercase font-display tracking-wider text-arena-text">
                Recent Mines Games
              </h2>
            </div>
            <span className="text-xs font-mono text-arena-muted">
              {history.length} games recorded
            </span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8 text-arena-muted text-sm font-bold">
              No games played yet. Choose your mines count and place a bet above!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-arena-border text-arena-muted font-mono uppercase">
                    <th className="pb-3 font-bold">Time</th>
                    <th className="pb-3 font-bold">Mines</th>
                    <th className="pb-3 font-bold">Bet</th>
                    <th className="pb-3 font-bold">Diamonds</th>
                    <th className="pb-3 font-bold">Multiplier</th>
                    <th className="pb-3 font-bold text-right">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-arena-border/40 font-mono">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-arena-surface/50 transition-colors">
                      <td className="py-3 text-arena-muted">
                        {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3 font-bold text-rose-400">💣 {h.mineCount}</td>
                      <td className="py-3">{h.betAmount.toFixed(2)} ETB</td>
                      <td className="py-3 text-emerald-400 font-bold">💎 {h.revealedCount}</td>
                      <td className="py-3 font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-md ${
                            h.status === 'CASHED_OUT'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {h.multiplier.toFixed(2)}×
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
                    Provably Fair Verification
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
                  Every game round uses cryptographic SHA-256 hashing. The mine layout is generated and committed before you reveal any tiles.
                </p>

                {activeGame ? (
                  <div className="space-y-2 font-mono bg-arena-surface p-4 rounded-2xl border border-arena-border">
                    <div>
                      <span className="text-[10px] font-bold text-arena-muted uppercase block">SHA-256 Hash:</span>
                      <span className="text-emerald-400 break-all">{activeGame.hash}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-arena-muted uppercase block">Client Seed:</span>
                      <span className="text-arena-text break-all">{activeGame.clientSeed}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-arena-muted uppercase block">Server Seed (Unhashed):</span>
                      <span className="text-amber-400 break-all">
                        {activeGame.serverSeed || '*** HIDDEN UNTIL GAME ENDS ***'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-arena-surface rounded-2xl text-center text-arena-muted font-bold">
                    Start a game to view the active cryptographic hash and verification seeds.
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
