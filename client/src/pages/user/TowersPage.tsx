import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { useTowersStore, TOWERS_DIFFICULTY_DATA } from '../../stores/towersStore';
import { TowersDifficulty, TowersTileType } from '../../shared';
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
  Skull,
  Coins,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Web Audio Synthesizer for Towers                                            */
/* -------------------------------------------------------------------------- */
class TowersAudioEngine {
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

  public playGemSound(floorNumber = 0) {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const baseFreq = 523.25 + floorNumber * 65; // Ascending C5 scale
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
    } catch {
      // Ignore
    }
  }

  public playSkullSound() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.45);
    } catch {
      // Ignore
    }
  }

  public playCashoutSound() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C Major Chord
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.07);

        gain.gain.setValueAtTime(0.12, this.ctx!.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.07 + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(this.ctx!.currentTime + idx * 0.07);
        osc.stop(this.ctx!.currentTime + idx * 0.07 + 0.45);
      });
    } catch {
      // Ignore
    }
  }
}

const towersAudio = new TowersAudioEngine();

export const TowersPage: React.FC = () => {
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
    stepTile,
    cashout,
  } = useTowersStore();

  const [isFairModalOpen, setIsFairModalOpen] = useState(false);

  useEffect(() => {
    const handleGesture = () => towersAudio.init();
    window.addEventListener('pointerdown', handleGesture, { once: true });
    return () => window.removeEventListener('pointerdown', handleGesture);
  }, []);

  useEffect(() => {
    if (token) {
      fetchActiveGame();
      fetchHistory();
    }
  }, [token]);

  const handleTileClick = async (tileIdx: number) => {
    if (!game || game.status !== 'IN_PROGRESS' || isStepping) return;
    const prevRow = game.currentRow;
    await stepTile(tileIdx);

    const updatedGame = useTowersStore.getState().game;
    if (updatedGame && soundEnabled) {
      if (updatedGame.status === 'BUSTED') {
        towersAudio.playSkullSound();
      } else if (updatedGame.status === 'CASHED_OUT') {
        towersAudio.playCashoutSound();
      } else if (updatedGame.currentRow > prevRow) {
        towersAudio.playGemSound(prevRow);
      }
    }
  };

  const handleCashoutClick = async () => {
    await cashout();
    if (soundEnabled) {
      towersAudio.playCashoutSound();
    }
  };

  const config = TOWERS_DIFFICULTY_DATA[difficulty];
  const isInProgress = game?.status === 'IN_PROGRESS';
  const currentMultiplier = game?.currentMultiplier || 1.0;
  const currentPotentialPayout = Math.floor(betAmount * currentMultiplier * 100) / 100;

  return (
    <div className="min-h-screen bg-arena-bg text-arena-text px-4 sm:px-6 lg:px-8 py-8 font-sans selection:bg-amber-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 rounded-3xl border border-arena-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-indigo-600 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl">
                🏰
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-display tracking-wide text-arena-text">
                  DAGI <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">TOWERS</span>
                </h1>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-black tracking-wider uppercase font-mono">
                  97% RTP • PROVABLY FAIR
                </span>
              </div>
              <span className="text-xs text-arena-muted font-bold">
                Climb the 9 floors, avoid the hidden skulls, and cash out your multiplier anytime!
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
                Towers Settings
              </span>

              {/* Difficulty Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-arena-muted font-display">
                  Difficulty Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {(Object.keys(TOWERS_DIFFICULTY_DATA) as TowersDifficulty[]).map((dKey) => {
                    const d = TOWERS_DIFFICULTY_DATA[dKey];
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
                          {d.gemsPerRow} Gems / {d.skullsPerRow} Skull
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

              {/* Action Button: Start vs Cashout */}
              {!isInProgress ? (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={startGame}
                  className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 active:scale-[0.98] text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-display disabled:opacity-50"
                >
                  <Zap className="w-5 h-5 fill-slate-950" />
                  <span>START CLIMB ({betAmount} ETB)</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isCashingOut || game.currentRow === 0}
                  onClick={handleCashoutClick}
                  className="w-full py-4 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 active:scale-[0.98] text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-display disabled:opacity-50 animate-pulse"
                >
                  <Coins className="w-5 h-5 fill-slate-950" />
                  <span>CASHOUT {currentPotentialPayout.toFixed(2)} ETB ({currentMultiplier}×)</span>
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: 9-FLOOR TOWER CLIMBER GRID */}
          <div className="lg:col-span-8 glass-panel-elevated rounded-3xl p-5 sm:p-7 border border-arena-border shadow-2xl space-y-3 relative overflow-hidden flex flex-col justify-center">
            {/* Tower Header */}
            <div className="flex items-center justify-between border-b border-arena-border pb-3">
              <div className="flex items-center gap-2">
                <ArrowUp className="w-4 h-4 text-amber-400 animate-bounce" />
                <span className="text-xs font-black uppercase tracking-wider text-arena-text font-display">
                  TOWER FLOORS (TOP FLOOR 9 → BOTTOM FLOOR 1)
                </span>
              </div>
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-xl text-xs font-mono font-black">
                Current: {currentMultiplier}×
              </span>
            </div>

            {/* 9 FLOORS (Rendered from top Floor 8 down to Floor 0) */}
            <div className="space-y-2 max-w-xl mx-auto w-full py-2">
              {Array.from({ length: 9 }).map((_, idx) => {
                const rowIndex = 8 - idx; // Top Floor 8 at top, Floor 0 at bottom
                const isCurrentActiveRow = isInProgress && game?.currentRow === rowIndex;
                const isPastPassedRow = isInProgress && (game?.currentRow || 0) > rowIndex;
                const isFutureRow = isInProgress && (game?.currentRow || 0) < rowIndex;
                const rowMultiplier = config.multipliers[rowIndex];

                const revealedRow = game?.rows?.find((r) => r.rowIndex === rowIndex);
                const tileCount = config.tilesPerRow;

                return (
                  <div
                    key={rowIndex}
                    className={`flex items-center gap-3 p-2 rounded-2xl border transition-all duration-300 ${
                      isCurrentActiveRow
                        ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/50'
                        : isPastPassedRow
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-arena-surface border-arena-border opacity-70'
                    }`}
                  >
                    {/* Floor & Multiplier Badge */}
                    <div className="w-20 sm:w-24 text-left flex-shrink-0">
                      <span className="text-[10px] font-bold text-arena-muted block uppercase font-mono">
                        Floor {rowIndex + 1}
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-black font-mono ${
                          isCurrentActiveRow
                            ? 'text-amber-300'
                            : isPastPassedRow
                            ? 'text-emerald-400'
                            : 'text-arena-text'
                        }`}
                      >
                        {rowMultiplier}×
                      </span>
                    </div>

                    {/* Tiles in Row */}
                    <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${tileCount}, minmax(0, 1fr))` }}>
                      {Array.from({ length: tileCount }).map((_, tileIdx) => {
                        const tileType: TowersTileType =
                          revealedRow?.tiles?.[tileIdx] || ('HIDDEN' as TowersTileType);
                        const isPicked = revealedRow?.selectedTileIndex === tileIdx;

                        return (
                          <button
                            key={tileIdx}
                            type="button"
                            disabled={!isCurrentActiveRow || isStepping}
                            onClick={() => handleTileClick(tileIdx)}
                            className={`h-11 sm:h-13 rounded-xl border flex items-center justify-center font-black transition-all duration-200 cursor-pointer ${
                              isCurrentActiveRow
                                ? 'bg-gradient-to-tr from-amber-500/25 to-yellow-400/15 border-amber-400/80 hover:scale-105 active:scale-95 shadow-md shadow-amber-500/20 animate-pulse'
                                : tileType === 'GEM'
                                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-400 shadow-inner'
                                : tileType === 'SKULL'
                                ? 'bg-rose-500/25 border-rose-400 text-rose-400 shadow-inner'
                                : 'bg-arena-surface border-arena-border/60 text-arena-muted'
                            }`}
                          >
                            {tileType === 'GEM' ? (
                              <Sparkles className="w-5 h-5 text-emerald-400 fill-emerald-400 animate-pop-in" />
                            ) : tileType === 'SKULL' ? (
                              <Skull className="w-5 h-5 text-rose-500 animate-bounce" />
                            ) : isCurrentActiveRow ? (
                              <span className="text-xs font-mono font-bold text-amber-400">?</span>
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-700 block" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* BET HISTORY */}
        <div className="glass-panel rounded-3xl p-6 border border-arena-border space-y-4">
          <div className="flex items-center justify-between border-b border-arena-border pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-black uppercase font-display tracking-wider text-arena-text">
                My Towers History
              </h2>
            </div>
            <span className="text-xs font-mono text-arena-muted">
              {history.length} games recorded
            </span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8 text-arena-muted text-sm font-bold">
              No Towers games played yet. Select your difficulty and climb the floors!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-arena-border text-arena-muted font-mono uppercase">
                    <th className="pb-3 font-bold">Game ID</th>
                    <th className="pb-3 font-bold">Difficulty</th>
                    <th className="pb-3 font-bold">Stake</th>
                    <th className="pb-3 font-bold">Floor Reached</th>
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
                      <td className="py-3 font-bold text-amber-400">Floor {h.reachedRow + 1}</td>
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
                    Towers Provably Fair Verification
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
                  Every 9-floor skull layout is predetermined prior to floor 1 selection using cryptographic SHA-256 seed hashing.
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
                        {game.serverSeed || '*** HIDDEN UNTIL CASHOUT / BUST ***'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-arena-surface rounded-2xl text-center text-arena-muted font-bold">
                    Start a game to generate a provably fair seed hash.
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
