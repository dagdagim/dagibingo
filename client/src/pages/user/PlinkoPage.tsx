import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Play,
  Square,
  Flame,
  History,
  TrendingUp,
  Award,
  Layers,
  Shield,
  CircleDot,
  Radio,
  Trophy,
  DollarSign,
  Info,
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

      // Pitch rises gently down the board
      const freq = 450 + rowRatio * 350 + Math.random() * 40;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, this.ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public playBucketLanding(multiplier: number) {
    try {
      this.init();
      if (!this.ctx) return;

      const isHighWin = multiplier >= 10;
      const isWin = multiplier >= 1.5;

      const baseFreq = isHighWin ? 784 : isWin ? 523.25 : 261.63; // G5, C5, C4
      const duration = isHighWin ? 0.35 : 0.18;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isHighWin ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      if (isHighWin) {
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(isHighWin ? 0.2 : 0.15, this.ctx.currentTime);
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
    visualBalls,
    lastHitMultipliers,
    bucketPulseIndex,
    setBetAmount,
    setRows,
    setRisk,
    setAnimationSpeed,
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
  const { user, token } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'my_drops' | 'live_feed' | 'paytable'>('my_drops');
  const [isDroppingBall, setIsDroppingBall] = useState(false);
  const [autoCountSelect, setAutoCountSelect] = useState<number>(50);

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

  // Helper: Color generator for multiplier bucket badges
  const getBucketColor = (multiplier: number, maxMult: number) => {
    if (multiplier >= maxMult * 0.8) return 'from-red-600 to-rose-700 text-white shadow-red-500/50';
    if (multiplier >= 20) return 'from-amber-500 to-orange-600 text-slate-950 shadow-orange-500/40';
    if (multiplier >= 5) return 'from-yellow-400 to-amber-500 text-slate-950 shadow-yellow-500/30';
    if (multiplier >= 1.5) return 'from-emerald-500 to-teal-600 text-white shadow-emerald-500/30';
    if (multiplier >= 1.0) return 'from-blue-500 to-cyan-600 text-white shadow-blue-500/20';
    return 'from-slate-700 to-slate-800 text-slate-300 shadow-none';
  };

  // -------------------------------------------------------------
  // CANVAS RENDER & PHYSICS LOOP
  // -------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    const lastPegHitTime = new Map<string, number>();

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear Canvas with subtle dark gradient
      ctx.clearRect(0, 0, width, height);

      // Board Dimensions
      const topPadding = 45;
      const bottomPadding = 65;
      const boardHeight = height - topPadding - bottomPadding;
      const rowSpacing = boardHeight / rows;
      const startWidth = width * 0.16;
      const endWidth = width * 0.88;

      // Draw Background Guide Lines / Funnel
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width / 2 - startWidth / 2, topPadding);
      ctx.lineTo(width / 2 - endWidth / 2, topPadding + boardHeight);
      ctx.moveTo(width / 2 + startWidth / 2, topPadding);
      ctx.lineTo(width / 2 + endWidth / 2, topPadding + boardHeight);
      ctx.stroke();
      ctx.restore();

      // 1. Draw Peg Pyramid Grid
      // Row 0 has 3 pins, row r has (r + 3) pins
      for (let r = 0; r <= rows; r++) {
        const pinCount = r + 3;
        const rowY = topPadding + r * rowSpacing;
        const rowProgress = r / rows;
        const currentRowWidth = startWidth + (endWidth - startWidth) * rowProgress;
        const pinSpacing = currentRowWidth / (pinCount - 1);
        const rowStartX = width / 2 - currentRowWidth / 2;

        for (let c = 0; c < pinCount; c++) {
          const pinX = rowStartX + c * pinSpacing;

          // Draw Pin Glow
          ctx.beginPath();
          ctx.arc(pinX, rowY, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 8;
          ctx.fill();

          // Pin Core Dot
          ctx.beginPath();
          ctx.arc(pinX, rowY, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = '#e2e8f0';
          ctx.shadowBlur = 0;
          ctx.fill();
        }
      }

      // 2. Draw & Simulate Active Visual Balls
      const now = Date.now();
      const balls = usePlinkoStore.getState().visualBalls;

      balls.forEach((ball) => {
        const elapsed = now - ball.startTime;
        const totalDuration = ball.durationMs;
        const progress = Math.min(1, elapsed / totalDuration);

        // Calculate continuous ball position along its authoritative path
        // Total steps = ball.rows
        const currentStepFloat = progress * ball.rows;
        const currentRow = Math.floor(currentStepFloat);
        const nextRow = Math.min(ball.rows, currentRow + 1);
        const subProgress = currentStepFloat - currentRow;

        // Count right bounces up to current row
        let rightsBefore = 0;
        for (let i = 0; i < currentRow; i++) {
          rightsBefore += ball.path[i] || 0;
        }

        const isLastRow = currentRow >= ball.rows;
        const nextTurn = !isLastRow ? ball.path[currentRow] : 0;
        const nextRights = rightsBefore + nextTurn;

        // Current and Next Coordinates
        const r1Progress = currentRow / ball.rows;
        const r1Width = startWidth + (endWidth - startWidth) * r1Progress;
        const r1PinCount = currentRow + 3;
        const r1Spacing = r1Width / (r1PinCount - 1);
        const r1StartX = width / 2 - r1Width / 2;
        // Start slot for ball at top is apex center (pin index 1)
        const x1 = r1StartX + (rightsBefore + 1) * r1Spacing;
        const y1 = topPadding + currentRow * rowSpacing;

        const r2Progress = nextRow / ball.rows;
        const r2Width = startWidth + (endWidth - startWidth) * r2Progress;
        const r2PinCount = nextRow + 3;
        const r2Spacing = r2Width / (r2PinCount - 1);
        const r2StartX = width / 2 - r2Width / 2;
        const x2 = r2StartX + (nextRights + 1) * r2Spacing;
        const y2 = topPadding + nextRow * rowSpacing;

        // Natural physics bouncing curve between pins
        // Smooth easing with arc bounce height
        const easeSub = Math.sin(subProgress * Math.PI * 0.5);
        const ballX = x1 + (x2 - x1) * easeSub;

        // Parabolic arc for bounce impulse
        const arcOffset = Math.sin(subProgress * Math.PI) * -8;
        const ballY = y1 + (y2 - y1) * subProgress + arcOffset;

        // Trigger Audio on Peg Collision
        const pegKey = `${ball.id}_row_${currentRow}`;
        if (soundEnabled && !lastPegHitTime.has(pegKey) && currentRow > 0) {
          lastPegHitTime.set(pegKey, now);
          audioSynth.playPegHit(currentRow / ball.rows);
        }

        // Draw Ball Trail & Glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(ballX, ballY, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 14;
        ctx.fill();

        // Inner Highlight
        ctx.beginPath();
        ctx.arc(ballX - 1.8, ballY - 1.8, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();

        // Ball Finished Falling
        if (progress >= 1) {
          triggerBucketPulse(ball.bucketIndex);
          if (soundEnabled) {
            audioSynth.playBucketLanding(ball.multiplier);
          }
          removeVisualBall(ball.id);
        }
      });

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
    } catch (err: any) {
      // Handled
    } finally {
      setTimeout(() => setIsDroppingBall(false), 120);
    }
  };

  // Handle multi-drop volley
  const handleDropVolley = async (count: number) => {
    try {
      await dropBatch(count);
    } catch (err) {
      // Handled
    }
  };

  // Max multiplier for current risk & row
  const maxMultiplier = currentPaytable.length > 0 ? Math.max(...currentPaytable) : 1000;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 px-3 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/30 text-white font-black text-2xl">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                DAGI PLINKO
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PROVABLY FAIR
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Up to <span className="text-amber-400 font-bold">1,000x Max Multiplier</span> • Instant Physics Drops • Real-time ETB Rewards
            </p>
          </div>
        </div>

        {/* Balance & Settings Quick Bar */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3 shadow-inner">
            <span className="text-xs text-slate-400 font-medium">Balance</span>
            <span className="text-base sm:text-lg font-black text-emerald-400">
              {token ? `${(balance?.availableBalance || 0).toLocaleString()} ETB` : 'Demo 10,000 ETB'}
            </span>
          </div>

          <button
            onClick={toggleSound}
            className={`p-2.5 rounded-xl border transition-all ${
              soundEnabled
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls, Center Plinko Board, Right History & Feed */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: BET CONTROLS & RISK SETTINGS (4 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl">
          {/* Bet Amount Input & Presets */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                Bet Amount (ETB)
              </label>
              <span className="text-xs font-semibold text-slate-500">
                Min: 0.5 ETB
              </span>
            </div>

            <div className="relative mb-3">
              <input
                type="number"
                min="0.5"
                step="1"
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 text-lg font-black text-white outline-none transition-all"
                placeholder="10"
              />
              <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400 uppercase">
                ETB
              </span>
            </div>

            {/* Quick Multiplier Buttons (1/2, 2X, Max) */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                onClick={() => setBetAmount(Math.max(0.5, Math.floor(betAmount / 2)))}
                className="py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 transition-colors"
              >
                ½ Half
              </button>
              <button
                onClick={() => setBetAmount(betAmount * 2)}
                className="py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 transition-colors"
              >
                2× Double
              </button>
              <button
                onClick={() => setBetAmount(Math.min(balance?.availableBalance || 500, 500))}
                className="py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold text-amber-400 transition-colors"
              >
                Max
              </button>
            </div>

            {/* Preset Chip Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {PLINKO_PRESET_BETS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBetAmount(amt)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    betAmount === amt
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                      : 'bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300'
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
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              Risk Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH'] as PlinkoRisk[]).map((r) => (
                <button
                  key={r}
                  disabled={isAutoPlaying}
                  onClick={() => setRisk(r)}
                  className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-0.5 ${
                    risk === r
                      ? r === 'HIGH'
                        ? 'bg-gradient-to-b from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30'
                        : r === 'MEDIUM'
                        ? 'bg-gradient-to-b from-amber-500 to-orange-600 text-slate-950 shadow-lg shadow-amber-500/30'
                        : 'bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{r}</span>
                  <span className="text-[10px] font-normal opacity-80">
                    {r === 'HIGH' ? 'Up to 1000x' : r === 'MEDIUM' ? 'Up to 110x' : 'Steady Wins'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Rows Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Number of Rows
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {([8, 10, 12, 14, 16] as PlinkoRows[]).map((rowCount) => (
                <button
                  key={rowCount}
                  disabled={isAutoPlaying}
                  onClick={() => setRows(rowCount)}
                  className={`py-2 rounded-xl text-xs font-black transition-all ${
                    rows === rowCount
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {rowCount}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-800/80" />

          {/* Action Buttons: Drop Ball & Multi-Volley */}
          <div className="space-y-2.5">
            <button
              disabled={isAutoPlaying}
              onClick={handleDropSingle}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] text-slate-950 font-black text-lg tracking-wide rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>Drop Ball ({betAmount} ETB)</span>
            </button>

            {/* Quick Multi-Ball Volleys */}
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={isAutoPlaying}
                onClick={() => handleDropVolley(5)}
                className="py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-black rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Volley (5 Balls)</span>
              </button>

              <button
                disabled={isAutoPlaying}
                onClick={() => handleDropVolley(10)}
                className="py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-black rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>Rain (10 Balls)</span>
              </button>
            </div>
          </div>

          {/* Auto-Play Mode Drawer */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                Auto-Drop Mode
              </span>
              {isAutoPlaying && (
                <span className="text-xs font-black text-amber-400 animate-pulse">
                  {autoPlayCountRemaining} left
                </span>
              )}
            </div>

            {!isAutoPlaying ? (
              <div className="flex items-center gap-2">
                <select
                  value={autoCountSelect}
                  onChange={(e) => setAutoCountSelect(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 outline-none"
                >
                  <option value={10}>10 Drops</option>
                  <option value={50}>50 Drops</option>
                  <option value={100}>100 Drops</option>
                  <option value={500}>500 Drops</option>
                </select>

                <button
                  onClick={() => startAutoPlay(autoCountSelect)}
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Auto</span>
                </button>
              </div>
            ) : (
              <button
                onClick={stopAutoPlay}
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30"
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
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 backdrop-blur-xl flex items-center gap-2 overflow-x-auto scrollbar-none shadow-lg">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Recent:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {lastHitMultipliers.length === 0 ? (
                <span className="text-xs text-slate-500 italic">No drops yet in this session</span>
              ) : (
                lastHitMultipliers.map((item, idx) => (
                  <motion.span
                    key={`${item.id}_${idx}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`px-2 py-0.5 rounded-md text-xs font-black shrink-0 ${
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
          <div className="relative bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-950 border border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden backdrop-blur-xl">
            {/* Top Drop Hole Graphic */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
              <div className="w-12 h-3.5 rounded-full bg-slate-900 border border-amber-500/40 shadow-inner flex items-center justify-center">
                <div className="w-6 h-1.5 rounded-full bg-amber-400/80 animate-pulse" />
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
                    className={`flex-1 min-w-[32px] sm:min-w-[42px] py-1.5 rounded-lg text-center font-black text-[10px] sm:text-xs shadow-md bg-gradient-to-b transition-all border ${
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
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('my_drops')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'my_drops'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>My Drops ({myHistory.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('live_feed')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'live_feed'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-rose-400" />
                  <span>Live Arena Drops</span>
                </button>

                <button
                  onClick={() => setActiveTab('paytable')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'paytable'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Paytable Matrix</span>
                </button>
              </div>

              {stats && (
                <div className="hidden sm:flex items-center gap-4 text-xs font-semibold text-slate-400">
                  <span>
                    Highest Win:{' '}
                    <span className="text-amber-400 font-bold">
                      {stats.highestWin.toLocaleString()} ETB
                    </span>
                  </span>
                  <span>
                    Top Multiplier:{' '}
                    <span className="text-rose-400 font-bold">
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
                        <th className="pb-2 font-bold">Time</th>
                        <th className="pb-2 font-bold">Wager</th>
                        <th className="pb-2 font-bold">Rows / Risk</th>
                        <th className="pb-2 font-bold">Multiplier</th>
                        <th className="pb-2 font-bold text-right">Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {myHistory.slice(0, 10).map((h) => (
                        <tr key={h.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 text-slate-400">
                            {new Date(h.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 font-bold text-slate-200">
                            {h.betAmount} ETB
                          </td>
                          <td className="py-2.5 text-slate-400">
                            {h.rows} Rows • {h.risk}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded font-black text-xs ${
                                h.multiplier >= 20
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : h.multiplier >= 2
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {h.multiplier}×
                            </span>
                          </td>
                          <td
                            className={`py-2.5 text-right font-black ${
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
                        <th className="pb-2 font-bold">Player</th>
                        <th className="pb-2 font-bold">Bet</th>
                        <th className="pb-2 font-bold">Risk</th>
                        <th className="pb-2 font-bold">Multiplier</th>
                        <th className="pb-2 font-bold text-right">Won</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {liveFeed.slice(0, 10).map((drop, idx) => (
                        <tr key={`${drop.id}_${idx}`} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 font-bold text-indigo-400">
                            {drop.username || 'Spectator'}
                          </td>
                          <td className="py-2.5 text-slate-200">
                            {drop.betAmount} ETB
                          </td>
                          <td className="py-2.5 text-slate-400">
                            {drop.risk}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded font-black text-xs ${
                                drop.multiplier >= 20
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : drop.multiplier >= 2
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {drop.multiplier}×
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-black text-emerald-400">
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
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-center"
                    >
                      <span className="text-[10px] text-slate-500 block">Bucket {i}</span>
                      <span className="text-xs font-black text-amber-400">{m}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlinkoPage;
