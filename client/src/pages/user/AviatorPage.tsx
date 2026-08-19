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
  private hasUserInteracted: boolean = false;

  public init() {
    if (typeof window === 'undefined') return;
    this.hasUserInteracted = true;
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

  public startFlightSound() {
    try {
      if (!this.hasUserInteracted) return;
      this.init();
      if (!this.ctx || this.ctx.state !== 'running') return;

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
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, this.ctx.currentTime + 0.3); // D6

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.45);
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
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
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
    setError,
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
  const { token } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'all_bets' | 'my_bets' | 'stats'>('all_bets');
  const [showProvablyFairModal, setShowProvablyFairModal] = useState(false);

  // Initialize socket & fetch data
  useEffect(() => {
    fetchBalance();
    fetchStats();
    if (token) {
      fetchMyHistory();
    }
    const handleFirstInteraction = () => {
      audioSynth.init();
    };
    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });

    const cleanup = initSocketListeners();
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
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

  const handlePlaceBet = async (panelIdx: 0 | 1) => {
    audioSynth.init();
    await placeBet(panelIdx);
  };

  const handleCashout = async (panelIdx: 0 | 1) => {
    if (soundEnabled) {
      audioSynth.playCashoutChime();
    }
    await cashout(panelIdx);
  };

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

          // Propeller Blade (safeguard radius against negative values)
          const propAngle = (Date.now() / 20) % (Math.PI * 2);
          ctx.beginPath();
          ctx.ellipse(22, 0, 2, Math.max(0.5, Math.abs(9 * Math.sin(propAngle))), 0, 0, Math.PI * 2);
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
        ctx.arc(p.x, p.y, Math.max(0.2, p.size), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
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

      {/* Error Alert Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-2xl flex items-center justify-between gap-3 text-rose-400 text-sm font-bold shadow-lg"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-rose-500/20 rounded-lg text-rose-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
                    <span className="text-xs font-black uppercase tracking-wider text-arena-muted flex items-center gap-1 font-display">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                      Bet Panel {panelIdx + 1}
                    </span>

                    {/* Auto Cashout Switch */}
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-bold text-arena-muted">Auto Cashout</label>
                      <button
                        type="button"
                        onClick={() => setPanelAutoCashout(panelIdx as 0 | 1, !p.autoCashout)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                          p.autoCashout ? 'bg-emerald-500' : 'bg-arena-surface border border-arena-border'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            p.autoCashout ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Bet Amount Stepper & Auto Multiplier Inputs */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Amount Stepper */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-arena-subtle">Amount (ETB)</label>
                      <div className="flex items-center bg-arena-surface border border-arena-border rounded-xl p-1">
                        <button
                          type="button"
                          disabled={isPanelActive || flightStatus === 'FLYING'}
                          onClick={() => setPanelAmount(panelIdx as 0 | 1, Math.max(0.5, p.betAmount - 5))}
                          className="p-1 hover:bg-arena-highlight rounded-lg text-arena-muted disabled:opacity-40"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          step="1"
                          min="0.5"
                          disabled={isPanelActive || flightStatus === 'FLYING'}
                          value={p.betAmount}
                          onChange={(e) => setPanelAmount(panelIdx as 0 | 1, Number(e.target.value))}
                          className="w-full bg-transparent text-center font-black text-sm font-mono outline-none text-arena-text"
                        />
                        <button
                          type="button"
                          disabled={isPanelActive || flightStatus === 'FLYING'}
                          onClick={() => setPanelAmount(panelIdx as 0 | 1, p.betAmount + 5)}
                          className="p-1 hover:bg-arena-highlight rounded-lg text-arena-muted disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Auto Cashout Multiplier */}
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
                          onClick={() => handlePlaceBet(panelIdx as 0 | 1)}
                          className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 active:scale-[0.98] text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-display disabled:opacity-50"
                        >
                          <Play className="w-5 h-5 fill-slate-950" />
                          <span>BET {p.betAmount} ETB</span>
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <div className="flex-1 py-3.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase shadow-inner">
                            <span className="animate-pulse">✈️</span>
                            <span>BET PLACED (READY TO CASH OUT)</span>
                          </div>
                          <button
                            type="button"
                            disabled={p.isProcessing}
                            onClick={() => cancelBet(panelIdx as 0 | 1)}
                            className="px-4 py-3.5 bg-rose-600/80 hover:bg-rose-500 active:scale-[0.98] text-white font-black text-xs uppercase rounded-2xl transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Cancel Bet"
                          >
                            <X className="w-4 h-4" />
                            <span>CANCEL</span>
                          </button>
                        </div>
                      )
                    )}

                    {flightStatus === 'FLYING' && (
                      isPanelActive ? (
                        <motion.button
                          type="button"
                          disabled={p.isProcessing}
                          animate={{ scale: [1, 1.02, 1] }}
                          transition={{ repeat: Infinity, duration: 0.5 }}
                          onClick={() => handleCashout(panelIdx as 0 | 1)}
                          className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-400 active:scale-[0.97] text-slate-950 font-black rounded-2xl shadow-2xl shadow-amber-500/40 transition-all flex flex-col items-center justify-center cursor-pointer border-2 border-amber-300 disabled:opacity-50"
                        >
                          <div className="flex items-center gap-2 text-lg sm:text-xl uppercase tracking-wider font-display font-black">
                            <Sparkles className="w-5 h-5 fill-slate-950" />
                            <span>CASH OUT</span>
                          </div>
                          <span className="text-sm font-mono font-black text-slate-900 bg-amber-300/60 px-3 py-0.5 rounded-full mt-0.5">
                            {potentialWin.toFixed(2)} ETB ({currentMultiplier.toFixed(2)}×)
                          </span>
                        </motion.button>
                      ) : isPanelCashedOut ? (
                        <div className="w-full py-4 bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400 font-black text-center rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-emerald-500/10">
                          <div className="flex items-center gap-1.5 text-base uppercase font-display">
                            <CheckCircle2 className="w-5 h-5" />
                            <span>CASHED OUT!</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-300">
                            +{p.activeBet?.payoutAmount?.toFixed(2) || potentialWin.toFixed(2)} ETB ({p.activeBet?.cashedOutMultiplier || currentMultiplier}×)
                          </span>
                        </div>
                      ) : p.queuedForNextRound ? (
                        <button
                          type="button"
                          onClick={() => cancelBet(panelIdx as 0 | 1)}
                          className="w-full py-3.5 bg-arena-surface border border-rose-500/40 text-rose-400 font-black text-sm uppercase rounded-2xl cursor-pointer hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          <span>QUEUED FOR NEXT ROUND (CANCEL)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePlaceBet(panelIdx as 0 | 1)}
                          className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 text-white font-black text-sm uppercase rounded-2xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>BET FOR NEXT ROUND ({p.betAmount} ETB)</span>
                        </button>
                      )
                    )}

                    {flightStatus === 'CRASHED' && (
                      isPanelCashedOut ? (
                        <div className="w-full py-3.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-center rounded-2xl flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>WON +{p.activeBet?.payoutAmount?.toFixed(2)} ETB</span>
                        </div>
                      ) : p.queuedForNextRound ? (
                        <div className="w-full py-3.5 bg-arena-surface border border-emerald-500/40 text-emerald-400 font-black text-center rounded-2xl text-sm uppercase">
                          QUEUED FOR TAKEOFF...
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePlaceBet(panelIdx as 0 | 1)}
                          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase rounded-2xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 font-display"
                        >
                          <Play className="w-4 h-4 fill-slate-950" />
                          <span>BET FOR NEXT ROUND ({p.betAmount} ETB)</span>
                        </button>
                      )
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
            <div className="grid grid-cols-3 gap-1 p-1 bg-arena-surface rounded-2xl mb-4 border border-arena-border">
              <button
                onClick={() => setActiveTab('all_bets')}
                className={`py-2 text-xs font-black uppercase rounded-xl transition-all ${
                  activeTab === 'all_bets'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-arena-muted hover:text-arena-text'
                }`}
              >
                All Bets
              </button>
              <button
                onClick={() => setActiveTab('my_bets')}
                className={`py-2 text-xs font-black uppercase rounded-xl transition-all ${
                  activeTab === 'my_bets'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-arena-muted hover:text-arena-text'
                }`}
              >
                My Bets
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-2 text-xs font-black uppercase rounded-xl transition-all ${
                  activeTab === 'stats'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-arena-muted hover:text-arena-text'
                }`}
              >
                Top / Stats
              </button>
            </div>

            {/* Tab Contents */}
            <div className="min-h-[380px] max-h-[460px] overflow-y-auto scrollbar-thin pr-1">
              {activeTab === 'all_bets' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-arena-subtle px-2 pb-1 border-b border-arena-border">
                    <span>PILOT</span>
                    <span>BET</span>
                    <span>X</span>
                    <span>CASH OUT</span>
                  </div>
                  {liveBets.length === 0 ? (
                    <div className="text-center py-12 text-xs text-arena-subtle">
                      No active bets in this round yet.
                    </div>
                  ) : (
                    liveBets.map((b) => (
                      <div
                        key={b.id}
                        className={`flex items-center justify-between text-xs py-2 px-2.5 rounded-xl border transition-all ${
                          b.status === 'CASHED_OUT'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-arena-surface border-arena-border text-arena-muted'
                        }`}
                      >
                        <span className="font-bold truncate max-w-[90px]">{b.username}</span>
                        <span className="font-mono">{b.betAmount} ETB</span>
                        <span className="font-mono font-black">
                          {b.cashedOutMultiplier ? `${b.cashedOutMultiplier.toFixed(2)}×` : '-'}
                        </span>
                        <span className="font-mono font-black">
                          {b.payoutAmount ? `+${b.payoutAmount.toFixed(2)}` : '-'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'my_bets' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-arena-subtle px-2 pb-1 border-b border-arena-border">
                    <span>ROUND</span>
                    <span>BET</span>
                    <span>MULT</span>
                    <span>PAYOUT</span>
                  </div>
                  {myHistory.length === 0 ? (
                    <div className="text-center py-12 text-xs text-arena-subtle">
                      No personal flight history yet.
                    </div>
                  ) : (
                    myHistory.map((h) => (
                      <div
                        key={h.id}
                        className={`flex items-center justify-between text-xs py-2 px-2.5 rounded-xl border ${
                          h.status === 'CASHED_OUT'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        <span className="font-mono font-bold">#{h.roundNumber}</span>
                        <span className="font-mono">{h.betAmount} ETB</span>
                        <span className="font-mono font-black">
                          {h.cashedOutMultiplier ? `${h.cashedOutMultiplier.toFixed(2)}×` : 'Crashed'}
                        </span>
                        <span className="font-mono font-black">
                          {h.payoutAmount ? `+${h.payoutAmount.toFixed(2)}` : '0 ETB'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'stats' && (
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-arena-surface p-3 rounded-2xl border border-arena-border text-center">
                      <span className="text-[10px] font-bold uppercase text-arena-subtle block">Total Rounds</span>
                      <span className="text-xl font-black font-mono text-arena-text">
                        {stats?.totalRounds || 0}
                      </span>
                    </div>
                    <div className="bg-arena-surface p-3 rounded-2xl border border-arena-border text-center">
                      <span className="text-[10px] font-bold uppercase text-arena-subtle block">Total Bets</span>
                      <span className="text-xl font-black font-mono text-arena-text">
                        {stats?.totalBets || 0}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-gradient-to-r from-amber-500/15 to-rose-500/15 border border-amber-500/30 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400">Highest Multiplier</span>
                      <span className="text-lg font-black font-mono text-amber-400">
                        {stats?.highestMultiplier ? `${stats.highestMultiplier.toFixed(2)}×` : '1.00×'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400">Biggest Single Payout</span>
                      <span className="text-lg font-black font-mono text-emerald-400">
                        {stats?.highestPayout ? `${stats.highestPayout.toLocaleString()} ETB` : '0 ETB'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Provably Fair Verifier Modal */}
      {showProvablyFairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel-elevated rounded-3xl p-6 border border-arena-border max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-arena-border pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-black font-display">Provably Fair Algorithm</h3>
              </div>
              <button
                onClick={() => setShowProvablyFairModal(false)}
                className="p-1 rounded-lg hover:bg-arena-surface text-arena-muted hover:text-arena-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-arena-muted leading-relaxed">
              Every Aviator round result is cryptographically predetermined using SHA-256 server seed hashing before flight takeoff. The multiplier cannot be altered during flight.
            </p>

            <div className="space-y-2 text-xs">
              <div className="bg-arena-surface p-3 rounded-xl border border-arena-border">
                <span className="text-[10px] font-bold text-arena-subtle block uppercase">Round #{currentRound?.roundNumber || '-'} SHA-256 Hash</span>
                <span className="font-mono text-emerald-400 break-all select-all text-[11px]">
                  {currentRound?.hash || 'Generating hash...'}
                </span>
              </div>
              <div className="bg-arena-surface p-3 rounded-xl border border-arena-border">
                <span className="text-[10px] font-bold text-arena-subtle block uppercase">Server Seed</span>
                <span className="font-mono text-arena-muted text-[11px]">
                  {currentRound?.seed || '*** Hidden until crash ***'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowProvablyFairModal(false)}
              className="w-full py-3 bg-arena-surface hover:bg-arena-highlight border border-arena-border rounded-xl text-xs font-black uppercase text-arena-text transition-colors"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
