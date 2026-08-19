import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Play,
  X,
  History,
  TrendingUp,
  Shield,
  Radio,
  DollarSign,
  Info,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';
import { useAviatorStore, PanelBetState } from '../../stores/aviatorStore';
import { useWalletStore } from '../../stores/walletStore';
import { useAuthStore } from '../../stores/authStore';

// Web Audio API Aviator Flight Synthesizer
class AviatorAudioEngine {
  private ctx: AudioContext | null = null;
  private flightOsc: OscillatorNode | null = null;
  private flightGain: GainNode | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public startFlightSound() {
    try {
      this.init();
      if (!this.ctx) return;

      this.stopFlightSound();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      // Lowpass filter to muffle raw sawtooth
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      this.flightOsc = osc;
      this.flightGain = gain;
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public updateFlightPitch(multiplier: number) {
    try {
      if (!this.ctx || !this.flightOsc) return;
      const targetFreq = Math.min(120 + Math.log(multiplier) * 180, 850);
      this.flightOsc.frequency.setValueAtTime(targetFreq, this.ctx.currentTime);
    } catch {
      // Silent
    }
  }

  public stopFlightSound() {
    try {
      if (this.flightOsc) {
        this.flightOsc.stop();
        this.flightOsc.disconnect();
        this.flightOsc = null;
      }
    } catch {
      // Silent
    }
  }

  public playCashoutChime() {
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch {
      // Silent
    }
  }

  public playCrashBoom() {
    try {
      this.init();
      if (!this.ctx) return;

      this.stopFlightSound();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch {
      // Silent
    }
  }
}

const audioSynth = new AviatorAudioEngine();

interface ExhaustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

export const AviatorPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    panels,
    currentRound,
    flightStatus,
    currentMultiplier,
    countdownSeconds,
    lastCrashMultiplier,
    recentMultipliers,
    liveBets,
    myHistory,
    stats,
    soundEnabled,
    error,
    setPanelAmount,
    setPanelAutoCashout,
    setPanelAutoMultiplier,
    toggleSound,
    placeBet,
    cancelBet,
    cashout,
    fetchMyHistory,
    fetchStats,
    initSocketListeners,
  } = useAviatorStore();

  const { fetchBalance } = useWalletStore();
  const { token, isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'all_bets' | 'my_bets' | 'stats'>('all_bets');
  const [showProvablyFairModal, setShowProvablyFairModal] = useState(false);

  // Initialize socket & fetch data
  useEffect(() => {
    fetchBalance();
    fetchStats();
    if (token) {
      fetchMyHistory();
    }
    const cleanup = initSocketListeners();
    return () => {
      cleanup();
      audioSynth.stopFlightSound();
    };
  }, [token]);

  // Audio syncer with flight state
  useEffect(() => {
    if (!soundEnabled) {
      audioSynth.stopFlightSound();
      return;
    }

    if (flightStatus === 'FLYING') {
      audioSynth.startFlightSound();
    } else if (flightStatus === 'CRASHED') {
      audioSynth.playCrashBoom();
    } else {
      audioSynth.stopFlightSound();
    }
  }, [flightStatus, soundEnabled]);

  useEffect(() => {
    if (soundEnabled && flightStatus === 'FLYING') {
      audioSynth.updateFlightPitch(currentMultiplier);
    }
  }, [currentMultiplier, flightStatus, soundEnabled]);

  // -------------------------------------------------------------
  // HIGH-FPS CANVAS FLIGHT PHYSICS & JET RENDERING
  // -------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: ExhaustParticle[] = [];
    let bgOffset = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // 1. Grid Background
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;

      const gridSize = 40;
      bgOffset = (bgOffset + (flightStatus === 'FLYING' ? 1.5 : 0.2)) % gridSize;

      for (let x = -gridSize + bgOffset; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      const paddingLeft = 50;
      const paddingBottom = 40;
      const graphWidth = width - paddingLeft - 80;
      const graphHeight = height - paddingBottom - 60;

      // 2. Flight Trajectory & Plane Coordinates
      if (flightStatus === 'FLYING' || flightStatus === 'CRASHED') {
        const mult = currentMultiplier;
        // Map multiplier smoothly into [0, 1] screen curve
        const progress = Math.min(1, Math.max(0, (mult - 1.0) / 4.0));
        const planeX = paddingLeft + Math.min(graphWidth, progress * graphWidth);
        const planeY = height - paddingBottom - Math.min(graphHeight, Math.pow(progress, 0.85) * graphHeight);

        // Draw Under-Curve Fill
        ctx.save();
        const curveGrad = ctx.createLinearGradient(0, planeY, 0, height - paddingBottom);
        if (flightStatus === 'FLYING') {
          curveGrad.addColorStop(0, 'rgba(225, 29, 72, 0.35)');
          curveGrad.addColorStop(1, 'rgba(225, 29, 72, 0.0)');
        } else {
          curveGrad.addColorStop(0, 'rgba(100, 116, 139, 0.2)');
          curveGrad.addColorStop(1, 'rgba(100, 116, 139, 0.0)');
        }

        ctx.beginPath();
        ctx.moveTo(paddingLeft, height - paddingBottom);
        ctx.quadraticCurveTo(
          paddingLeft + (planeX - paddingLeft) * 0.5,
          height - paddingBottom,
          planeX,
          planeY
        );
        ctx.lineTo(planeX, height - paddingBottom);
        ctx.closePath();
        ctx.fillStyle = curveGrad;
        ctx.fill();

        // Draw Glowing Trajectory Line
        ctx.beginPath();
        ctx.moveTo(paddingLeft, height - paddingBottom);
        ctx.quadraticCurveTo(
          paddingLeft + (planeX - paddingLeft) * 0.5,
          height - paddingBottom,
          planeX,
          planeY
        );
        ctx.strokeStyle = flightStatus === 'FLYING' ? '#f43f5e' : '#64748b';
        ctx.lineWidth = 4;
        ctx.shadowColor = flightStatus === 'FLYING' ? '#f43f5e' : 'transparent';
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.restore();

        // Spawn Jet Exhaust Particles during flight
        if (flightStatus === 'FLYING') {
          for (let p = 0; p < 3; p++) {
            particles.push({
              x: planeX - 12,
              y: planeY + 6,
              vx: -2 - Math.random() * 3,
              vy: (Math.random() - 0.5) * 1.8,
              alpha: 1,
              size: 3 + Math.random() * 3,
              color: Math.random() > 0.4 ? '#f59e0b' : '#ef4444',
            });
          }
        }

        // Draw Jet Silhouette
        if (flightStatus === 'FLYING') {
          ctx.save();
          ctx.translate(planeX, planeY);
          // Angle of ascent
          const angle = -Math.PI / 8 - Math.min(0.2, progress * 0.2);
          ctx.rotate(angle);

          // Plane Body
          ctx.beginPath();
          ctx.ellipse(0, 0, 22, 7, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 12;
          ctx.fill();

          // Cabin Window
          ctx.beginPath();
          ctx.ellipse(6, -2, 5, 2.5, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.shadowBlur = 0;
          ctx.fill();

          // Wing
          ctx.beginPath();
          ctx.moveTo(-4, -1);
          ctx.lineTo(-12, -14);
          ctx.lineTo(-4, -14);
          ctx.lineTo(4, -1);
          ctx.closePath();
          ctx.fillStyle = '#dc2626';
          ctx.fill();

          // Tail Fin
          ctx.beginPath();
          ctx.moveTo(-16, 0);
          ctx.lineTo(-24, -9);
          ctx.lineTo(-18, -9);
          ctx.lineTo(-12, 0);
          ctx.closePath();
          ctx.fillStyle = '#b91c1c';
          ctx.fill();

          // Propeller Blade
          const propAngle = (Date.now() / 20) % (Math.PI * 2);
          ctx.beginPath();
          ctx.ellipse(22, 0, 2, 9 * Math.sin(propAngle), 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fill();

          ctx.restore();
        }
      }

      // 3. Update & Draw Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.04;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [flightStatus, currentMultiplier]);

  const getPillColor = (mult: number) => {
    if (mult >= 10.0) return 'bg-amber-500/20 text-amber-500 border-amber-500/40 font-bold';
    if (mult >= 2.0) return 'bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold';
    return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-5 text-arena-text">
      {/* Top Bar: Recent Crash Multipliers Ribbon & Info */}
      <div className="glass-panel-elevated rounded-2xl p-2.5 sm:p-3 border border-arena-border flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-arena-muted shrink-0 flex items-center gap-1 font-display">
            <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
            Crashes:
          </span>
          {recentMultipliers.length === 0 ? (
            <span className="text-xs text-arena-subtle italic">Waiting for flight history...</span>
          ) : (
            recentMultipliers.slice(0, 16).map((m, idx) => (
              <motion.span
                key={idx}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-mono border shrink-0 ${getPillColor(m)}`}
              >
                {m.toFixed(2)}×
              </motion.span>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowProvablyFairModal(true)}
            className="p-2 rounded-xl bg-arena-surface hover:bg-arena-highlight border border-arena-border text-arena-muted hover:text-arena-text transition-colors"
            title="Provably Fair Verifier"
          >
            <Shield className="w-4 h-4 text-emerald-500" />
          </button>

          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-500'
                : 'bg-arena-surface border-arena-border text-arena-muted hover:text-arena-text'
            }`}
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Aviator Center Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================= */}
        {/* CENTER COLUMN: LIVE FLIGHT CANVAS & HUD (8 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 space-y-4">
          {/* Interactive Flight Canvas Container */}
          <div className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-arena-border rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden min-h-[340px] sm:min-h-[420px] flex items-center justify-center">
            {/* Canvas */}
            <canvas
              ref={canvasRef}
              width={750}
              height={420}
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
            />

            {/* Central HUD Multiplier Readout */}
            <div className="relative z-10 text-center flex flex-col items-center select-none">
              {flightStatus === 'BETTING' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-2"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 animate-spin-slow">
                    ✈️
                  </div>
                  <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-arena-muted block font-display">
                    WAITING FOR NEXT ROUND
                  </span>
                  <div className="w-48 h-2 bg-arena-surface rounded-full overflow-hidden mx-auto border border-arena-border">
                    <motion.div
                      className="h-full bg-gradient-to-r from-rose-500 to-amber-500"
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: countdownSeconds, ease: 'linear' }}
                    />
                  </div>
                  <span className="text-2xl font-black text-rose-500 font-mono">
                    {countdownSeconds}s
                  </span>
                </motion.div>
              )}

              {flightStatus === 'FLYING' && (
                <motion.div
                  key="flying"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="space-y-1"
                >
                  <div className="text-5xl sm:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-200 to-rose-400 font-mono drop-shadow-[0_0_35px_rgba(244,63,94,0.6)]">
                    {currentMultiplier.toFixed(2)}×
                  </div>
                </motion.div>
              )}

              {flightStatus === 'CRASHED' && (
                <motion.div
                  key="crashed"
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-1"
                >
                  <span className="text-sm sm:text-base font-black uppercase tracking-widest text-rose-500 font-display">
                    FLEW AWAY!
                  </span>
                  <div className="text-5xl sm:text-7xl font-black tracking-tight text-rose-500 font-mono">
                    {lastCrashMultiplier ? lastCrashMultiplier.toFixed(2) : currentMultiplier.toFixed(2)}×
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* DUAL BETTING PANELS: Panel 1 (Bet 1) & Panel 2 (Bet 2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1].map((panelIdx) => {
              const p = panels[panelIdx as 0 | 1];
              const isPanelActive = !!p.activeBet && p.activeBet.status === 'ACTIVE';
              const isPanelCashedOut = !!p.activeBet && p.activeBet.status === 'CASHED_OUT';
              const potentialWin = Math.floor(p.betAmount * currentMultiplier * 100) / 100;

              return (
                <div
                  key={panelIdx}
                  className="glass-panel-elevated rounded-3xl p-4 border border-arena-border shadow-lg space-y-3"
                >
                  {/* Panel Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-arena-muted flex items-center gap-1.5 font-display">
                      <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                      Bet Panel {panelIdx + 1}
                    </span>

                    {/* Auto Cashout Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-arena-subtle uppercase">Auto Cashout</span>
                      <button
                        type="button"
                        onClick={() => setPanelAutoCashout(panelIdx as 0 | 1, !p.autoCashout)}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                          p.autoCashout ? 'bg-emerald-500' : 'bg-arena-surface border border-arena-border'
                        }`}
                      >
                        <motion.div
                          className="w-4 h-4 rounded-full bg-white shadow-sm"
                          animate={{ x: p.autoCashout ? 16 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Inputs Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Wager Amount */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-arena-subtle">Wager (ETB)</label>
                      <div className="flex items-center bg-arena-surface border border-arena-border rounded-xl p-1">
                        <button
                          type="button"
                          disabled={isPanelActive || flightStatus === 'FLYING'}
                          onClick={() => setPanelAmount(panelIdx as 0 | 1, Math.max(0.5, p.betAmount - 5))}
                          className="w-7 h-7 rounded-lg bg-arena-elevated hover:bg-arena-highlight text-arena-muted flex items-center justify-center disabled:opacity-40 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="0.5"
                          disabled={isPanelActive || flightStatus === 'FLYING'}
                          value={p.betAmount}
                          onChange={(e) => setPanelAmount(panelIdx as 0 | 1, Number(e.target.value))}
                          className="w-full text-center bg-transparent font-black text-sm text-arena-text outline-none font-mono"
                        />
                        <button
                          type="button"
                          disabled={isPanelActive || flightStatus === 'FLYING'}
                          onClick={() => setPanelAmount(panelIdx as 0 | 1, p.betAmount + 5)}
                          className="w-7 h-7 rounded-lg bg-arena-elevated hover:bg-arena-highlight text-arena-muted flex items-center justify-center disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Auto Multiplier (If enabled) */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-arena-subtle">Auto Multiplier</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1.05"
                        disabled={!p.autoCashout || isPanelActive}
                        value={p.autoCashoutMultiplier}
                        onChange={(e) => setPanelAutoMultiplier(panelIdx as 0 | 1, Number(e.target.value))}
                        className={`w-full bg-arena-surface border border-arena-border rounded-xl py-2 px-3 text-center font-black text-sm font-mono outline-none ${
                          p.autoCashout ? 'text-emerald-500 border-emerald-500/40' : 'text-arena-subtle opacity-50'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Preset Chip Buttons */}
                  <div className="grid grid-cols-4 gap-1">
                    {[10, 25, 50, 100].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        disabled={isPanelActive || flightStatus === 'FLYING'}
                        onClick={() => setPanelAmount(panelIdx as 0 | 1, chip)}
                        className="py-1 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-lg text-[11px] font-bold text-arena-muted transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        +{chip}
                      </button>
                    ))}
                  </div>

                  {/* Big Action Button */}
                  <div>
                    {flightStatus === 'BETTING' && (
                      !p.activeBet ? (
                        <button
                          type="button"
                          disabled={p.isProcessing}
                          onClick={() => placeBet(panelIdx as 0 | 1)}
                          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer font-display"
                        >
                          <Play className="w-4 h-4 fill-slate-950" />
                          <span>BET {p.betAmount} ETB</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={p.isProcessing}
                          onClick={() => cancelBet(panelIdx as 0 | 1)}
                          className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-display"
                        >
                          <X className="w-4 h-4" />
                          <span>CANCEL ({p.betAmount} ETB)</span>
                        </button>
                      )
                    )}

                    {flightStatus === 'FLYING' && (
                      isPanelActive ? (
                        <motion.button
                          type="button"
                          animate={{ scale: [1, 1.02, 1] }}
                          transition={{ repeat: Infinity, duration: 0.6 }}
                          onClick={() => cashout(panelIdx as 0 | 1)}
                          className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/30 transition-all flex flex-col items-center justify-center cursor-pointer font-display"
                        >
                          <span>CASH OUT</span>
                          <span className="text-xs font-mono font-black">{potentialWin.toLocaleString()} ETB</span>
                        </motion.button>
                      ) : isPanelCashedOut ? (
                        <div className="w-full py-3.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-center rounded-2xl flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>WON +{p.activeBet?.payoutAmount?.toLocaleString()} ETB</span>
                        </div>
                      ) : p.queuedForNextRound ? (
                        <button
                          type="button"
                          onClick={() => cancelBet(panelIdx as 0 | 1)}
                          className="w-full py-3.5 bg-arena-surface border border-rose-500/40 text-rose-400 font-black text-sm uppercase rounded-2xl cursor-pointer"
                        >
                          QUEUED (CANCEL)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => placeBet(panelIdx as 0 | 1)}
                          className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-black text-sm uppercase rounded-2xl shadow-md cursor-pointer"
                        >
                          BET FOR NEXT ROUND
                        </button>
                      )
                    )}

                    {flightStatus === 'CRASHED' && (
                      <div className="w-full py-3.5 bg-arena-surface border border-arena-border text-arena-subtle font-black text-center rounded-2xl text-sm uppercase">
                        WAITING FOR NEXT FLIGHT...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: MULTIPLAYER LIVE ARENA TABLE (4 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel-elevated rounded-3xl p-4 border border-arena-border shadow-lg">
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-arena-border pb-3 mb-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('all_bets')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer font-display ${
                    activeTab === 'all_bets'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-arena-muted hover:text-arena-text'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>All Bets ({liveBets.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('my_bets')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer font-display ${
                    activeTab === 'my_bets'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-arena-muted hover:text-arena-text'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>My History</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Live Arena Bets Table */}
            {activeTab === 'all_bets' && (
              <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1">
                {liveBets.length === 0 ? (
                  <div className="py-12 text-center text-arena-subtle text-xs">
                    No active bets in this flight yet.
                  </div>
                ) : (
                  liveBets.map((b) => {
                    const isWin = b.status === 'CASHED_OUT';
                    return (
                      <div
                        key={b.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                          isWin
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-arena-surface/80 border-arena-border text-arena-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isWin ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'}`} />
                          <span className="text-xs font-bold text-arena-text">{b.username}</span>
                        </div>

                        <div className="flex items-center gap-3 font-mono text-xs">
                          <span className="font-bold text-arena-muted">{b.betAmount} ETB</span>
                          {isWin ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-black text-[11px]">
                              {b.cashedOutMultiplier?.toFixed(2)}× (+{b.payoutAmount?.toLocaleString()})
                            </span>
                          ) : (
                            <span className="text-arena-subtle text-[11px]">In Flight</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: Personal My History */}
            {activeTab === 'my_bets' && (
              <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1">
                {myHistory.length === 0 ? (
                  <div className="py-12 text-center text-arena-subtle text-xs">
                    No past Aviator flights yet.
                  </div>
                ) : (
                  myHistory.map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-xl bg-arena-surface border border-arena-border flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="text-arena-subtle text-[10px] block">Flight #{h.roundNumber}</span>
                        <span className="font-bold text-arena-text font-mono">{h.betAmount} ETB</span>
                      </div>
                      <div className="text-right">
                        {h.status === 'CASHED_OUT' ? (
                          <span className="text-emerald-400 font-black font-mono block">
                            +{h.payoutAmount.toLocaleString()} ETB ({h.cashedOutMultiplier?.toFixed(2)}×)
                          </span>
                        ) : (
                          <span className="text-rose-500 font-bold font-mono block">0.00 ETB</span>
                        )}
                        <span className="text-[10px] text-arena-subtle">{new Date(h.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Provably Fair Info Modal */}
      <AnimatePresence>
        {showProvablyFairModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-md w-full bg-arena-surface border border-arena-border rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg font-black font-display text-arena-text">Provably Fair System</h3>
                </div>
                <button
                  onClick={() => setShowProvablyFairModal(false)}
                  className="p-1.5 rounded-full bg-arena-elevated text-arena-muted hover:text-arena-text"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-arena-muted leading-relaxed">
                Every Aviator round result is cryptographically predetermined using SHA-256 before the flight begins. The crash point cannot be altered during the flight.
              </p>

              {currentRound && (
                <div className="space-y-2 bg-arena-elevated p-3.5 rounded-2xl border border-arena-border text-xs font-mono">
                  <div>
                    <span className="text-arena-subtle text-[10px] block uppercase font-bold">Current Flight #</span>
                    <span className="text-arena-text font-black">{currentRound.roundNumber}</span>
                  </div>
                  <div>
                    <span className="text-arena-subtle text-[10px] block uppercase font-bold">SHA-256 Hash</span>
                    <span className="text-amber-500 text-[10px] break-all block">{currentRound.hash}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowProvablyFairModal(false)}
                className="w-full py-3 bg-arena-elevated hover:bg-arena-highlight text-arena-text font-black rounded-xl text-xs uppercase"
              >
                Close Verifier
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AviatorPage;
