import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Play,
  Square,
  History,
  TrendingUp,
  Award,
  Layers,
  Shield,
  Radio,
  Trophy,
  DollarSign,
  Info,
  ChevronRight,
  Flame,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  usePlinkoStore,
  VisualBall,
} from '../../stores/plinkoStore';
import { useWalletStore } from '../../stores/walletStore';
import { useAuthStore } from '../../stores/authStore';
import { socketService } from '../../services/socket';
import {
  PlinkoRisk,
  PlinkoRows,
  PLINKO_PAYTABLES,
  PLINKO_PRESET_BETS,
  PlinkoDropResult,
} from '../../shared';

// Web Audio API Procedural Sound Synthesizer
class PlinkoAudioEngine {
  private ctx: AudioContext | null = null;

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

  public playPegHit(rowRatio: number) {
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = 480 + rowRatio * 380 + Math.random() * 50;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public playBucketLanding(multiplier: number) {
    try {
      this.init();
      if (!this.ctx) return;

      const isBigWin = multiplier >= 10;
      const isWin = multiplier >= 1.5;

      const baseFreq = isBigWin ? 880 : isWin ? 523.25 : 293.66;
      const duration = isBigWin ? 0.4 : 0.2;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isBigWin ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      if (isBigWin) {
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, this.ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(isBigWin ? 0.25 : 0.16, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Silent catch
    }
  }
}

const audioSynth = new PlinkoAudioEngine();

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

interface PegPulse {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export const PlinkoPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    betAmount,
    rows,
    risk,
    soundEnabled,
    animationSpeed,
    isAutoPlaying,
    autoPlayCountRemaining,
    myHistory,
    liveFeed,
    stats,
    lastHitMultipliers,
    bucketPulseIndex,
    setBetAmount,
    setRows,
    setRisk,
    toggleSound,
    dropBall,
    dropBatch,
    startAutoPlay,
    stopAutoPlay,
    fetchMyHistory,
    fetchStats,
    removeVisualBall,
    triggerBucketPulse,
  } = usePlinkoStore();

  const { balance, fetchBalance } = useWalletStore();
  const { token } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'my_drops' | 'live_feed' | 'paytable'>('my_drops');
  const [isDroppingBall, setIsDroppingBall] = useState(false);
  const [autoCountSelect, setAutoCountSelect] = useState<number>(50);
  const [bigWinResult, setBigWinResult] = useState<PlinkoDropResult | null>(null);

  // Setup sockets & stats
  useEffect(() => {
    fetchBalance();
    fetchStats();
    if (token) {
      fetchMyHistory();
    }

    socketService.connect();
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('plinko:join' as any);
      socket.on('plinko:live_drop' as any, (data: any) => {
        usePlinkoStore.setState((state) => ({
          liveFeed: [data, ...state.liveFeed.slice(0, 24)],
        }));
      });
    }

    return () => {
      if (socket) {
        socket.emit('plinko:leave' as any);
        socket.off('plinko:live_drop' as any);
      }
    };
  }, [token]);

  // Current paytable array
  const currentPaytable = PLINKO_PAYTABLES[rows]?.[risk] || [];
  const maxMultiplier = currentPaytable.length > 0 ? Math.max(...currentPaytable) : 1000;

  // Helper: Color generator for multiplier bucket badges
  const getBucketColor = (multiplier: number, maxMult: number) => {
    if (multiplier >= maxMult * 0.8) return 'from-rose-600 via-red-600 to-amber-600 text-white shadow-rose-500/50 border-rose-400';
    if (multiplier >= 20) return 'from-amber-500 to-orange-600 text-slate-950 shadow-orange-500/40 border-amber-400';
    if (multiplier >= 5) return 'from-yellow-400 to-amber-500 text-slate-950 shadow-yellow-500/30 border-yellow-300';
    if (multiplier >= 1.5) return 'from-emerald-500 to-teal-600 text-white shadow-emerald-500/30 border-emerald-400';
    if (multiplier >= 1.0) return 'from-cyan-500 to-blue-600 text-white shadow-cyan-500/20 border-cyan-400';
    return 'from-slate-800 to-slate-900 text-slate-400 shadow-none border-slate-700/60';
  };

  // -------------------------------------------------------------
  // HIGH-FPS CANVAS RENDER & PHYSICS ENGINE WITH PARTICLES & BEAMS
  // -------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    const lastPegHitTime = new Map<string, number>();
    const particles: SparkParticle[] = [];
    const pegPulses: PegPulse[] = [];

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Board Dimensions
      const topPadding = 48;
      const bottomPadding = 68;
      const boardHeight = height - topPadding - bottomPadding;
      const rowSpacing = boardHeight / rows;
      const startWidth = width * 0.16;
      const endWidth = width * 0.90;

      // 1. Ambient Background Grid & Funnel Glow
      ctx.save();
      const funnelGrad = ctx.createLinearGradient(0, topPadding, 0, topPadding + boardHeight);
      funnelGrad.addColorStop(0, 'rgba(56, 189, 248, 0.04)');
      funnelGrad.addColorStop(1, 'rgba(168, 85, 247, 0.08)');

      ctx.beginPath();
      ctx.moveTo(width / 2 - startWidth / 2 - 10, topPadding);
      ctx.lineTo(width / 2 + startWidth / 2 + 10, topPadding);
      ctx.lineTo(width / 2 + endWidth / 2 + 15, topPadding + boardHeight);
      ctx.lineTo(width / 2 - endWidth / 2 - 15, topPadding + boardHeight);
      ctx.closePath();
      ctx.fillStyle = funnelGrad;
      ctx.fill();

      // Guide Border Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 2. Active Bucket Light Beam
      const activeBucket = usePlinkoStore.getState().bucketPulseIndex;
      if (activeBucket !== null && currentPaytable[activeBucket] !== undefined) {
        const lastRowProgress = 1;
        const lastRowWidth = startWidth + (endWidth - startWidth) * lastRowProgress;
        const lastPinCount = rows + 3;
        const lastSpacing = lastRowWidth / (lastPinCount - 1);
        const lastStartX = width / 2 - lastRowWidth / 2;
        const bucketCenterX = lastStartX + (activeBucket + 1.5) * lastSpacing;

        ctx.save();
        const beamGrad = ctx.createLinearGradient(0, topPadding + boardHeight, 0, topPadding);
        beamGrad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
        beamGrad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(bucketCenterX - 18, topPadding, 36, boardHeight + 10);
        ctx.restore();
      }

      // 3. Draw Peg Pulses (Expanding Rings)
      for (let i = pegPulses.length - 1; i >= 0; i--) {
        const pulse = pegPulses[i];
        pulse.radius += 0.8;
        pulse.alpha -= 0.05;

        if (pulse.alpha <= 0) {
          pegPulses.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${pulse.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // 4. Draw Peg Pyramid Grid
      for (let r = 0; r <= rows; r++) {
        const pinCount = r + 3;
        const rowY = topPadding + r * rowSpacing;
        const rowProgress = r / rows;
        const currentRowWidth = startWidth + (endWidth - startWidth) * rowProgress;
        const pinSpacing = currentRowWidth / (pinCount - 1);
        const rowStartX = width / 2 - currentRowWidth / 2;

        for (let c = 0; c < pinCount; c++) {
          const pinX = rowStartX + c * pinSpacing;

          // Glowing Outer Halo
          ctx.beginPath();
          ctx.arc(pinX, rowY, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
          ctx.fill();

          // Chrome Core Pin Dot
          ctx.beginPath();
          ctx.arc(pinX, rowY, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#f8fafc';
          ctx.shadowBlur = 0;
          ctx.fill();
        }
      }

      // 5. Simulate & Draw Active Visual Balls
      const now = Date.now();
      const balls = usePlinkoStore.getState().visualBalls;

      balls.forEach((ball) => {
        const elapsed = now - ball.startTime;
        const totalDuration = ball.durationMs;
        const progress = Math.min(1, elapsed / totalDuration);

        const currentStepFloat = progress * ball.rows;
        const currentRow = Math.floor(currentStepFloat);
        const nextRow = Math.min(ball.rows, currentRow + 1);
        const subProgress = currentStepFloat - currentRow;

        let rightsBefore = 0;
        for (let i = 0; i < currentRow; i++) {
          rightsBefore += ball.path[i] || 0;
        }

        const isLastRow = currentRow >= ball.rows;
        const nextTurn = !isLastRow ? ball.path[currentRow] : 0;
        const nextRights = rightsBefore + nextTurn;

        const r1Progress = currentRow / ball.rows;
        const r1Width = startWidth + (endWidth - startWidth) * r1Progress;
        const r1PinCount = currentRow + 3;
        const r1Spacing = r1Width / (r1PinCount - 1);
        const r1StartX = width / 2 - r1Width / 2;
        const x1 = r1StartX + (rightsBefore + 1) * r1Spacing;
        const y1 = topPadding + currentRow * rowSpacing;

        const r2Progress = nextRow / ball.rows;
        const r2Width = startWidth + (endWidth - startWidth) * r2Progress;
        const r2PinCount = nextRow + 3;
        const r2Spacing = r2Width / (r2PinCount - 1);
        const r2StartX = width / 2 - r2Width / 2;
        const x2 = r2StartX + (nextRights + 1) * r2Spacing;
        const y2 = topPadding + nextRow * rowSpacing;

        const easeSub = Math.sin(subProgress * Math.PI * 0.5);
        const ballX = x1 + (x2 - x1) * easeSub;
        const arcOffset = Math.sin(subProgress * Math.PI) * -9;
        const ballY = y1 + (y2 - y1) * subProgress + arcOffset;

        // Peg Impact: Sparks & Ripple
        const pegKey = `${ball.id}_row_${currentRow}`;
        if (!lastPegHitTime.has(pegKey) && currentRow > 0) {
          lastPegHitTime.set(pegKey, now);
          if (soundEnabled) {
            audioSynth.playPegHit(currentRow / ball.rows);
          }

          pegPulses.push({ x: x1, y: y1, radius: 4, alpha: 0.8 });

          // Spawn 5 sparkle particles
          for (let p = 0; p < 5; p++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.2 + Math.random() * 2.5;
            particles.push({
              x: ballX,
              y: ballY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              alpha: 1,
              color: ball.color,
              size: 2 + Math.random() * 2,
            });
          }
        }

        // Draw Ball Trail & Spherical Glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(ballX, ballY, 7, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 18;
        ctx.fill();

        // White 3D Specular Highlight
        ctx.beginPath();
        ctx.arc(ballX - 2, ballY - 2, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fill();
        ctx.restore();

        // Ball Landing in Bucket
        if (progress >= 1) {
          triggerBucketPulse(ball.bucketIndex);
          if (soundEnabled) {
            audioSynth.playBucketLanding(ball.multiplier);
          }

          // Trigger Big Win popup for high multipliers (>= 10x)
          if (ball.multiplier >= 10) {
            setBigWinResult({
              id: ball.dropId,
              betAmount: ball.betAmount,
              rows: ball.rows,
              risk: ball.risk,
              path: ball.path,
              bucketIndex: ball.bucketIndex,
              multiplier: ball.multiplier,
              payoutAmount: ball.payoutAmount,
              status: ball.status,
              createdAt: new Date().toISOString(),
            });
          }

          // Landing spark burst
          for (let p = 0; p < 12; p++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            particles.push({
              x: ballX,
              y: ballY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              alpha: 1,
              color: '#f59e0b',
              size: 3 + Math.random() * 2,
            });
          }

          removeVisualBall(ball.id);
        }
      });

      // 6. Draw & Update Spark Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // subtle gravity
        p.alpha -= 0.035;

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

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [rows, soundEnabled]);

  // Handle single ball drop click
  const handleDropSingle = async () => {
    if (isDroppingBall) return;
    setIsDroppingBall(true);
    try {
      await dropBall();
    } catch {
      // Handled
    } finally {
      setTimeout(() => setIsDroppingBall(false), 120);
    }
  };

  // Handle multi-drop volley
  const handleDropVolley = async (count: number) => {
    try {
      await dropBatch(count);
    } catch {
      // Handled
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 py-6 px-3 sm:px-6 lg:px-8">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-indigo-500/20 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 p-0.5 shadow-xl shadow-amber-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl font-black">
              🎯
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">
                DAGI <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400">PLINKO</span>
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PROVABLY FAIR
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-medium">
              Up to <span className="text-amber-400 font-bold">1,000x Max Multiplier</span> • Instant Physics Drops • Live ETB Payouts
            </p>
          </div>
        </div>

        {/* Live Wallet & Sound Quick Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-inner">
            <span className="text-[11px] text-slate-400 font-bold uppercase">Balance</span>
            <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
              {token ? `${(balance?.availableBalance || 0).toLocaleString()} ETB` : 'Demo 10,000 ETB'}
            </span>
          </div>

          <button
            onClick={toggleSound}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30 shadow-md shadow-indigo-600/10'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Grid: Controls + Board */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: LUXURY BET CONTROLS & RISK PANEL (4 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-5 bg-slate-900/80 border border-slate-800/90 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl">
          {/* Bet Amount Input & Presets */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-display">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                Wager Amount (ETB)
              </label>
              <span className="text-xs font-bold text-slate-500">Min: 0.5 ETB</span>
            </div>

            <div className="relative mb-3">
              <input
                type="number"
                min="0.5"
                step="1"
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl px-4 py-3 text-xl font-black text-white outline-none transition-all font-mono"
                placeholder="10"
              />
              <span className="absolute right-4 top-3.5 text-xs font-black text-amber-400 uppercase">
                ETB
              </span>
            </div>

            {/* Quick Multipliers (1/2, 2X, Max) */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                onClick={() => setBetAmount(Math.max(0.5, Math.floor(betAmount / 2)))}
                className="py-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-xs font-black text-slate-300 transition-all active:scale-95 cursor-pointer"
              >
                ½ Half
              </button>
              <button
                onClick={() => setBetAmount(betAmount * 2)}
                className="py-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-xs font-black text-slate-300 transition-all active:scale-95 cursor-pointer"
              >
                2× Double
              </button>
              <button
                onClick={() => setBetAmount(Math.min(balance?.availableBalance || 500, 500))}
                className="py-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-xs font-black text-amber-400 transition-all active:scale-95 cursor-pointer"
              >
                Max Wager
              </button>
            </div>

            {/* Preset Chip Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {PLINKO_PRESET_BETS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBetAmount(amt)}
                  className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    betAmount === amt
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/30 scale-105'
                      : 'bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-slate-300'
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-800/80" />

          {/* Risk Level Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2.5 font-display">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              Risk Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH'] as PlinkoRisk[]).map((r) => (
                <button
                  key={r}
                  disabled={isAutoPlaying}
                  onClick={() => setRisk(r)}
                  className={`py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                    risk === r
                      ? r === 'HIGH'
                        ? 'bg-gradient-to-b from-rose-500 to-red-600 text-white shadow-xl shadow-rose-500/30 scale-105 border border-rose-400'
                        : r === 'MEDIUM'
                        ? 'bg-gradient-to-b from-amber-500 to-orange-600 text-slate-950 shadow-xl shadow-amber-500/30 scale-105 border border-amber-300'
                        : 'bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 scale-105 border border-emerald-400'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{r}</span>
                  <span className="text-[10px] font-medium opacity-90">
                    {r === 'HIGH' ? 'Up to 1000x' : r === 'MEDIUM' ? 'Up to 110x' : 'Steady Wins'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Rows Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2.5 font-display">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Pin Pyramid Rows
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {([8, 10, 12, 14, 16] as PlinkoRows[]).map((rowCount) => (
                <button
                  key={rowCount}
                  disabled={isAutoPlaying}
                  onClick={() => setRows(rowCount)}
                  className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    rows === rowCount
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400 scale-105'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {rowCount}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-800/80" />

          {/* Action Buttons: Drop Ball & Volleys */}
          <div className="space-y-2.5">
            <button
              disabled={isAutoPlaying}
              onClick={handleDropSingle}
              className="w-full py-4 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-500 hover:from-emerald-300 hover:to-teal-400 active:scale-[0.98] text-slate-950 font-black text-lg tracking-wide rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>Drop Ball ({betAmount} ETB)</span>
            </button>

            {/* Quick Multi-Ball Volleys */}
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={isAutoPlaying}
                onClick={() => handleDropVolley(5)}
                className="py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-black rounded-2xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Volley (5 Balls)</span>
              </button>

              <button
                disabled={isAutoPlaying}
                onClick={() => handleDropVolley(10)}
                className="py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-black rounded-2xl shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>Rain (10 Balls)</span>
              </button>
            </div>
          </div>

          {/* Auto-Play Mode Drawer */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5 font-display">
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                Auto-Drop Mode
              </span>
              {isAutoPlaying && (
                <span className="text-xs font-black text-amber-400 animate-pulse font-mono">
                  {autoPlayCountRemaining} left
                </span>
              )}
            </div>

            {!isAutoPlaying ? (
              <div className="flex items-center gap-2">
                <select
                  value={autoCountSelect}
                  onChange={(e) => setAutoCountSelect(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 outline-none cursor-pointer"
                >
                  <option value={10}>10 Drops</option>
                  <option value={50}>50 Drops</option>
                  <option value={100}>100 Drops</option>
                  <option value={500}>500 Drops</option>
                </select>

                <button
                  onClick={() => startAutoPlay(autoCountSelect)}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Auto</span>
                </button>
              </div>
            ) : (
              <button
                onClick={stopAutoPlay}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Stop Auto Drop</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* CENTER COLUMN: INTERACTIVE PLINKO CANVAS & MULTIPLIERS (8 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 space-y-4">
          {/* Recent Multipliers Ribbon */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-3 backdrop-blur-2xl flex items-center gap-2 overflow-x-auto scrollbar-none shadow-xl">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1 font-display">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Recent Hits:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {lastHitMultipliers.length === 0 ? (
                <span className="text-xs text-slate-500 italic">No drops yet in this session</span>
              ) : (
                lastHitMultipliers.map((item, idx) => (
                  <motion.span
                    key={`${item.id}_${idx}`}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black shrink-0 font-mono shadow-sm ${
                      item.multiplier >= 20
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : item.multiplier >= 2
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {item.multiplier}×
                  </motion.span>
                ))
              )}
            </div>
          </div>

          {/* Canvas Board Container */}
          <div className="relative bg-gradient-to-b from-slate-950 via-slate-900/95 to-slate-950 border border-slate-800/90 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden backdrop-blur-2xl">
            {/* Top Drop Hole Graphic */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
              <div className="w-14 h-4 rounded-full bg-slate-900 border border-amber-500/40 shadow-inner flex items-center justify-center">
                <div className="w-7 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50" />
              </div>
            </div>

            {/* Interactive Physics Canvas */}
            <canvas
              ref={canvasRef}
              width={750}
              height={550}
              className="w-full h-auto max-h-[550px] object-contain rounded-2xl select-none"
            />

            {/* Bottom Multiplier Buckets Bar */}
            <div className="mt-2 flex items-center justify-between gap-1 overflow-x-auto pb-1">
              {currentPaytable.map((multiplier, idx) => {
                const isPulsing = bucketPulseIndex === idx;
                const badgeStyle = getBucketColor(multiplier, maxMultiplier);

                return (
                  <motion.div
                    key={idx}
                    animate={isPulsing ? { scale: [1, 1.25, 1], y: [0, -6, 0] } : {}}
                    transition={{ duration: 0.25 }}
                    className={`flex-1 min-w-[32px] sm:min-w-[42px] py-2 rounded-xl text-center font-black text-[10px] sm:text-xs shadow-md bg-gradient-to-b transition-all border font-mono ${
                      isPulsing
                        ? 'ring-2 ring-white border-white brightness-125'
                        : 'border-white/10'
                    } ${badgeStyle}`}
                  >
                    <span>{multiplier}×</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Stats & History Tabs */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('my_drops')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer font-display ${
                    activeTab === 'my_drops'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>My Drops ({myHistory.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('live_feed')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer font-display ${
                    activeTab === 'live_feed'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-rose-400" />
                  <span>Live Arena Drops</span>
                </button>

                <button
                  onClick={() => setActiveTab('paytable')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer font-display ${
                    activeTab === 'paytable'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Paytable Matrix</span>
                </button>
              </div>

              {stats && (
                <div className="hidden sm:flex items-center gap-4 text-xs font-semibold text-slate-400 font-mono">
                  <span>
                    Highest Win:{' '}
                    <span className="text-amber-400 font-bold">
                      {stats.highestWin.toLocaleString()} ETB
                    </span>
                  </span>
                  <span>
                    Top Multiplier:{' '}
                    <span className="text-rose-400 font-bold font-mono">
                      {stats.highestMultiplier}×
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* TAB 1: My Personal Drops */}
            {activeTab === 'my_drops' && (
              <div className="overflow-x-auto">
                {myHistory.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No drops recorded yet. Drop a ball to start your winning streak!
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800/80">
                        <th className="pb-2 font-bold uppercase">Time</th>
                        <th className="pb-2 font-bold uppercase">Wager</th>
                        <th className="pb-2 font-bold uppercase">Rows / Risk</th>
                        <th className="pb-2 font-bold uppercase">Multiplier</th>
                        <th className="pb-2 font-bold text-right uppercase">Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {myHistory.slice(0, 10).map((h) => (
                        <tr key={h.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 text-slate-400 font-mono">
                            {new Date(h.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 font-bold text-slate-200 font-mono">
                            {h.betAmount} ETB
                          </td>
                          <td className="py-2.5 text-slate-400">
                            {h.rows} Rows • {h.risk}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-md font-black text-xs font-mono ${
                                h.multiplier >= 20
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                  : h.multiplier >= 2
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {h.multiplier}×
                            </span>
                          </td>
                          <td
                            className={`py-2.5 text-right font-black font-mono ${
                              h.payoutAmount > 0 ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          >
                            {h.payoutAmount > 0
                              ? `+${h.payoutAmount.toLocaleString()} ETB`
                              : '0.00 ETB'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TAB 2: Live Arena Drops */}
            {activeTab === 'live_feed' && (
              <div className="overflow-x-auto">
                {liveFeed.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Watching live spectator feed... Drops will appear as other players play.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800/80">
                        <th className="pb-2 font-bold uppercase">Player</th>
                        <th className="pb-2 font-bold uppercase">Bet</th>
                        <th className="pb-2 font-bold uppercase">Risk</th>
                        <th className="pb-2 font-bold uppercase">Multiplier</th>
                        <th className="pb-2 font-bold text-right uppercase">Won</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {liveFeed.slice(0, 10).map((drop, idx) => (
                        <tr key={`${drop.id}_${idx}`} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 font-bold text-indigo-400">
                            {drop.username || 'Spectator'}
                          </td>
                          <td className="py-2.5 text-slate-200 font-mono">
                            {drop.betAmount} ETB
                          </td>
                          <td className="py-2.5 text-slate-400">
                            {drop.risk}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-md font-black text-xs font-mono ${
                                drop.multiplier >= 20
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                  : drop.multiplier >= 2
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {drop.multiplier}×
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-black text-emerald-400 font-mono">
                            {drop.payoutAmount > 0
                              ? `+${drop.payoutAmount.toLocaleString()} ETB`
                              : '0.00 ETB'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TAB 3: Paytable Matrix */}
            {activeTab === 'paytable' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Full multipliers for current configuration (<strong>{rows} Rows</strong> • <strong>{risk} Risk</strong>). The ball bounces 50% left and 50% right at each pin, generating a binomial distribution with massive edge multipliers.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {currentPaytable.map((m, i) => (
                    <div
                      key={i}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-center"
                    >
                      <span className="text-[10px] text-slate-500 block font-bold">Bucket {i}</span>
                      <span className="text-xs font-black text-amber-400 font-mono">{m}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BIG WIN CELEBRATION MODAL OVERLAY */}
      {/* ========================================================= */}
      <AnimatePresence>
        {bigWinResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="relative max-w-sm w-full bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-400/50 rounded-3xl p-6 shadow-2xl shadow-amber-500/30 text-center overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setBigWinResult(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/60"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/40 text-3xl animate-bounce">
                🏆
              </div>

              <span className="text-xs font-black uppercase tracking-widest text-amber-400 font-display">
                MASSIVE HIT!
              </span>

              <div className="my-2">
                <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 font-mono">
                  {bigWinResult.multiplier}×
                </span>
              </div>

              <p className="text-sm text-slate-300 mb-4">
                You won{' '}
                <span className="text-emerald-400 font-black text-lg font-mono">
                  +{bigWinResult.payoutAmount.toLocaleString()} ETB
                </span>
              </p>

              <button
                onClick={() => setBigWinResult(null)}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/30 transition-transform active:scale-95 cursor-pointer"
              >
                Collect Win
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlinkoPage;
