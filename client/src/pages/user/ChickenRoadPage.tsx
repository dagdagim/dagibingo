import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { useChickenRoadStore, CHICKEN_ROAD_DIFFICULTY_DATA } from '../../stores/chickenRoadStore';
import { ChickenRoadDifficulty } from '../../shared';
import { ChickenRoadCanvas } from '../../components/chickenroad/ChickenRoadCanvas';
import {
  Volume2,
  VolumeX,
  ShieldCheck,
  History,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  Car,
  Flame,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Comprehensive Photorealistic Web Audio Synthesizer for Chicken Road        */
/* -------------------------------------------------------------------------- */
class ChickenRoadAudioEngine {
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

  // Chicken Hop & Spring Cluck
  public playHopSound(laneIndex = 0) {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = 450 + laneIndex * 35;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.6, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);

      // Golden coin drop chime
      const coinOsc = this.ctx.createOscillator();
      const coinGain = this.ctx.createGain();
      coinOsc.type = 'triangle';
      const coinFreq = 987.77 + laneIndex * 60;
      coinOsc.frequency.setValueAtTime(coinFreq, this.ctx.currentTime + 0.04);
      coinOsc.frequency.setValueAtTime(coinFreq * 1.5, this.ctx.currentTime + 0.1);

      coinGain.gain.setValueAtTime(0.1, this.ctx.currentTime + 0.04);
      coinGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);

      coinOsc.connect(coinGain);
      coinGain.connect(this.ctx.destination);
      coinOsc.start(this.ctx.currentTime + 0.04);
      coinOsc.stop(this.ctx.currentTime + 0.22);
    } catch {}
  }

  // Hydraulic Road Blocker Deploy Sound (Pneumatic Hiss & Metal Clank)
  public playBlockerDeploy() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      // 1. Pneumatic Hiss
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      whiteNoise.start();

      // 2. Heavy Metal Barrier Clank
      const osc = this.ctx.createOscillator();
      const metalGain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime + 0.05);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.22);

      metalGain.gain.setValueAtTime(0.12, this.ctx.currentTime + 0.05);
      metalGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

      osc.connect(metalGain);
      metalGain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + 0.05);
      osc.stop(this.ctx.currentTime + 0.25);
    } catch {}
  }

  // Speeding Car Crash & Screech
  public playCrashSound() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      // Tire Screech
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(1400, this.ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.35);

      gain1.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start();
      osc1.stop(this.ctx.currentTime + 0.35);

      // Deep Impact Crunch
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(120, this.ctx.currentTime + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.5);

      gain2.gain.setValueAtTime(0.28, this.ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(this.ctx.currentTime + 0.08);
      osc2.stop(this.ctx.currentTime + 0.5);

      // Comical Cartoon Rubber Squeak / Squish
      const squeakOsc = this.ctx.createOscillator();
      const squeakGain = this.ctx.createGain();
      squeakOsc.type = 'sine';
      squeakOsc.frequency.setValueAtTime(700, this.ctx.currentTime + 0.1);
      squeakOsc.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.2);
      squeakOsc.frequency.exponentialRampToValueAtTime(250, this.ctx.currentTime + 0.38);

      squeakGain.gain.setValueAtTime(0.18, this.ctx.currentTime + 0.1);
      squeakGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      squeakOsc.connect(squeakGain);
      squeakGain.connect(this.ctx.destination);
      squeakOsc.start(this.ctx.currentTime + 0.1);
      squeakOsc.stop(this.ctx.currentTime + 0.4);
    } catch {}
  }

  // Cashout Fanfare & Coin Chimes
  public playCashoutFanfare() {
    try {
      if (!this.hasInteracted) return;
      this.init();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((note, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note, this.ctx!.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.15, this.ctx!.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(this.ctx!.currentTime + idx * 0.08);
        osc.stop(this.ctx!.currentTime + idx * 0.08 + 0.35);
      });
    } catch {}
  }
}

const audio = new ChickenRoadAudioEngine();

const QUICK_BETS = [0.5, 1, 5, 10, 25, 50, 100, 250];

export const ChickenRoadPage: React.FC = () => {
  const { user, isAuthenticated, token } = useAuthStore();
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
  } = useChickenRoadStore();

  const [showProvablyFair, setShowProvablyFair] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (token) {
      fetchActiveGame();
      fetchHistory();
    }
  }, [token, fetchActiveGame, fetchHistory]);

  const handleStart = async () => {
    if (!isAuthenticated) return;
    audio.init();
    await startGame();
    if (soundEnabled) audio.playHopSound(0);
  };

  const handleStep = async (tileIndex: number = 0) => {
    audio.init();
    await stepTile(tileIndex);
    const updatedGame = useChickenRoadStore.getState().game;
    if (updatedGame) {
      if (updatedGame.status === 'IN_PROGRESS') {
        if (soundEnabled) {
          audio.playHopSound(updatedGame.currentRow);
          audio.playBlockerDeploy();
        }
      } else if (updatedGame.status === 'CRUSHED') {
        if (soundEnabled) audio.playCrashSound();
      } else if (updatedGame.status === 'CASHED_OUT') {
        if (soundEnabled) audio.playCashoutFanfare();
      }
    }
  };

  const handleCashout = async () => {
    audio.init();
    await cashout();
    if (soundEnabled) audio.playCashoutFanfare();
  };

  // Keyboard shortcut: Spacebar to step
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (game?.status === 'IN_PROGRESS' && !isStepping) {
          handleStep(0);
        } else if (!game || game.status !== 'IN_PROGRESS') {
          if (!isLoading) handleStart();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game, isStepping, isLoading]);

  const config = game ? CHICKEN_ROAD_DIFFICULTY_DATA[game.difficulty] : CHICKEN_ROAD_DIFFICULTY_DATA[difficulty];
  const currentRow = game ? game.currentRow : 0;
  const currentMultiplier = game ? game.currentMultiplier : 1.0;
  const currentPayout = game ? game.betAmount * game.currentMultiplier : 0;
  const nextMultiplier = currentRow < 10 ? config.multipliers[currentRow] : config.multipliers[9];
  const nextPayout = game ? game.betAmount * nextMultiplier : betAmount * config.multipliers[0];

  return (
    <div className="min-h-screen pt-24 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" onClick={() => audio.init()}>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-green-500 p-0.5 shadow-arena-glow flex items-center justify-center">
            <span className="text-3xl">🐔</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-wider text-white">
                Chicken Road
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black">
                98% RTP
              </span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm font-medium mt-0.5">
              Guide the chicken across 10 dangerous traffic lanes, dodge speeding cars & deploy road blockers!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowHelp(true)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="How to play"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors font-bold text-xs"
          >
            <History className="w-4 h-4 text-indigo-400" />
            <span>History</span>
          </button>
          <button
            onClick={toggleSound}
            className={`p-2.5 rounded-xl border transition-colors ${
              soundEnabled ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 shadow-sm' : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center justify-between text-rose-400 text-sm font-bold shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-500/20 rounded-lg text-rose-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Game Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Betting Dashboard */}
        <div className="lg:col-span-4 space-y-5">
          <div className="glass-panel-elevated p-6 rounded-3xl border border-arena-border relative overflow-hidden space-y-5 shadow-2xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-500/10 to-amber-500/10 blur-3xl rounded-full pointer-events-none" />

            {/* Bet Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider font-display">
                  Bet Stake
                </label>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  Wallet: {balance?.availableBalance?.toFixed(2) || '0.00'} ETB
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-500 text-sm">ETB</span>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={betAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBetAmount(Number(e.target.value))}
                  disabled={game?.status === 'IN_PROGRESS' || isLoading}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-2xl py-3.5 pl-14 pr-24 text-white font-black text-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    onClick={() => setBetAmount(Math.max(0.5, betAmount / 2))}
                    disabled={game?.status === 'IN_PROGRESS'}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-black text-slate-300 transition-colors"
                  >
                    ½
                  </button>
                  <button
                    onClick={() => setBetAmount(betAmount * 2)}
                    disabled={game?.status === 'IN_PROGRESS'}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-black text-slate-300 transition-colors"
                  >
                    2×
                  </button>
                </div>
              </div>

              {/* Quick Chips */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {QUICK_BETS.map((amt) => (
                  <button
                    key={amt}
                    disabled={game?.status === 'IN_PROGRESS' || isLoading}
                    onClick={() => setBetAmount(amt)}
                    className={`py-1.5 rounded-xl border text-xs font-black font-mono transition-all ${
                      betAmount === amt
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-600 disabled:opacity-50'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Mode Selection */}
            <div className="space-y-2.5">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider font-display">
                Traffic Danger Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(CHICKEN_ROAD_DIFFICULTY_DATA).map((d) => (
                  <button
                    key={d.name}
                    disabled={game?.status === 'IN_PROGRESS' || isLoading}
                    onClick={() => setDifficulty(d.name)}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-black uppercase tracking-wider flex flex-col items-center gap-1 transition-all ${
                      difficulty === d.name
                        ? 'bg-gradient-to-tr from-indigo-600/30 to-purple-600/30 border-indigo-500 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.25)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-600 disabled:opacity-50'
                    }`}
                  >
                    <span>{d.name}</span>
                    <span className="text-[10px] opacity-70 font-mono">
                      {d.safePerRow} Safe / {d.carsPerRow} Car
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Action Button */}
            {game?.status === 'IN_PROGRESS' ? (
              <div className="space-y-3 pt-2">
                {/* Cross Next Lane Button */}
                <button
                  onClick={() => handleStep(0)}
                  disabled={isStepping || game.currentRow >= 10}
                  className="w-full relative group overflow-hidden rounded-2xl p-[2px] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl active:scale-[0.98] transition-transform"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 opacity-90 group-hover:opacity-100 transition-opacity bg-[length:200%_auto] animate-gradient" />
                  <div className="relative bg-slate-950 px-6 py-4 rounded-[14px] flex items-center justify-center gap-3">
                    <span className="text-xl animate-bounce">🐔</span>
                    <div className="text-center">
                      <span className="font-display font-black uppercase tracking-wider text-base sm:text-lg text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300 block">
                        {isStepping ? 'HOPPING...' : `CROSS LANE ${currentRow + 1} (${nextMultiplier}×)`}
                      </span>
                      <span className="text-[11px] text-slate-400 font-bold block">
                        Next Win: {nextPayout.toFixed(2)} ETB
                      </span>
                    </div>
                  </div>
                </button>

                {/* Cash Out Button */}
                <button
                  onClick={handleCashout}
                  disabled={isCashingOut || game.currentRow === 0}
                  className="w-full relative group overflow-hidden rounded-2xl p-[2px] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg active:scale-[0.98] transition-transform"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-600 opacity-90 group-hover:opacity-100 transition-opacity bg-[length:200%_auto] animate-gradient" />
                  <div className="relative bg-slate-950 px-6 py-3.5 rounded-[14px] flex items-center justify-center gap-2">
                    <span className="font-display font-black uppercase tracking-widest text-sm sm:text-base text-emerald-400">
                      {isCashingOut ? 'Cashing Out...' : `CASH OUT ${currentPayout.toFixed(2)} ETB`}
                    </span>
                  </div>
                </button>
              </div>
            ) : (
              <button
                onClick={handleStart}
                disabled={isLoading || !isAuthenticated}
                className="w-full relative group overflow-hidden rounded-2xl p-[2px] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl active:scale-[0.98] transition-transform"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-400 to-green-600 opacity-90 group-hover:opacity-100 transition-opacity bg-[length:200%_auto] animate-gradient" />
                <div className="relative bg-slate-950 px-6 py-4 rounded-[14px] flex items-center justify-center gap-3">
                  <Zap className="w-5 h-5 text-green-400 animate-pulse" />
                  <span className="font-display font-black uppercase tracking-widest text-lg text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
                    {isLoading ? 'STARTING...' : 'START CROSSING'}
                  </span>
                </div>
              </button>
            )}

            {/* Fairness verification button */}
            {game && game.status !== 'IN_PROGRESS' && (
              <button
                onClick={() => setShowProvablyFair(true)}
                className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-400 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" /> Verify Provably Fair Outcome
              </button>
            )}
          </div>

          {/* Lane Multipliers Ribbon */}
          <div className="glass-panel p-4 rounded-3xl border border-arena-border">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 font-display mb-3 block">
              10-Lane Payout Ladder ({difficulty})
            </span>
            <div className="grid grid-cols-5 gap-2">
              {config.multipliers.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-xl text-center border transition-all ${
                    currentRow > idx
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : currentRow === idx && game?.status === 'IN_PROGRESS'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md animate-pulse'
                      : 'bg-slate-900/50 border-slate-800 text-slate-500'
                  }`}
                >
                  <span className="text-[10px] block opacity-70">L{idx + 1}</span>
                  <span className="text-xs font-black font-mono">{m}×</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: High-Graphics Canvas Simulation */}
        <div className="lg:col-span-8 space-y-4">
          {/* Live HUD Banner */}
          <div className="glass-panel-elevated p-4 rounded-2xl border border-arena-border flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400 font-black text-sm">
                LANE {currentRow} / 10
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-display">
                  Current Odds
                </span>
                <span className="text-xl font-black font-mono text-amber-400">
                  {currentMultiplier.toFixed(2)}×
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-display text-right">
                  Accumulated Prize
                </span>
                <span className="text-xl font-black font-mono text-emerald-400">
                  {currentPayout.toFixed(2)} ETB
                </span>
              </div>
              <div className="hidden sm:block">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-display text-right">
                  Next Step
                </span>
                <span className="text-xl font-black font-mono text-indigo-300">
                  {nextMultiplier.toFixed(2)}×
                </span>
              </div>
            </div>
          </div>

          {/* HTML5 Canvas Highway Engine */}
          <ChickenRoadCanvas
            game={game}
            difficulty={difficulty}
            tilesPerRow={config.tilesPerRow}
            multipliers={config.multipliers}
            isStepping={isStepping}
            onStep={handleStep}
          />
        </div>
      </div>

      {/* Provably Fair Modal */}
      {showProvablyFair && game && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" /> Provably Fair Verification
              </h3>
              <button onClick={() => setShowProvablyFair(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1 block">Server Seed</label>
                <input readOnly value={game.serverSeed || 'Hidden during active round'} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 font-mono" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1 block">Client Seed</label>
                <input readOnly value={game.clientSeed || 'chickenroad_client_seed'} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 font-mono" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1 block">Nonce</label>
                <input readOnly value="1" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 font-mono" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1 block">SHA-256 HMAC Hash</label>
                <input readOnly value={game.hash} className="w-full bg-slate-950 border border-indigo-500/30 rounded-xl px-4 py-3 text-xs text-indigo-300 font-mono" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 shrink-0">
              <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" /> My Chicken Road History
              </h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-0 overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No games played yet.</div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-950/50 text-slate-400 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">Date</th>
                      <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">Difficulty</th>
                      <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">Stake</th>
                      <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">Odds</th>
                      <th className="px-6 py-4 font-black uppercase tracking-wider text-xs text-right">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-slate-300">{new Date(h.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs font-bold">{h.difficulty}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-300">{h.betAmount.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`font-black ${h.status === 'CRUSHED' ? 'text-rose-400' : 'text-green-400'}`}>
                            {h.status === 'CRUSHED' ? '0.00×' : `${h.multiplier.toFixed(2)}×`}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-right font-black font-mono ${h.payoutAmount > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                          {h.payoutAmount > 0 ? '+' : ''}{h.payoutAmount.toFixed(2)} ETB
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rules & Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" /> How to Play Chicken Road
              </h3>
              <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-slate-300 text-sm">
              <p>1. <strong>Select Stake & Difficulty:</strong> Choose your bet amount and risk level (Easy, Medium, Hard, Extreme, Nightmare).</p>
              <p>2. <strong>Cross the Road:</strong> Click "Cross Next Lane" or click directly on the road target arrows to hop forward.</p>
              <p>3. <strong>Road Blockers:</strong> When the chicken safely enters a lane, heavy hydraulic safety barriers deploy to block oncoming cars!</p>
              <p>4. <strong>Odds Growth:</strong> Each successful lane crossing multiplies your prize exponentially.</p>
              <p>5. <strong>Avoid Collision:</strong> If a speeding car hits the chicken before the barrier raises, you lose your stake.</p>
              <p>6. <strong>Cash Out Anytime:</strong> Take your profits whenever you want by clicking Cash Out, or reach Lane 10 for the Golden Trophy!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChickenRoadPage;
