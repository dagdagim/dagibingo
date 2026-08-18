import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKenoStore } from '../../stores/kenoStore';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BingoBall } from '../../components/bingo/BingoBall';
import {
  KENO_TOTAL_NUMBERS,
  KENO_MAX_SPOTS,
  KENO_MIN_SPOTS,
  KENO_PAYTABLE,
  KENO_PRESET_BETS,
} from '../../shared';
import {
  Sparkles,
  Flame,
  Snowflake,
  Trophy,
  History,
  TrendingUp,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Radio,
  Gamepad2,
  Coins,
  Check,
  Star,
  Shuffle,
  Eye,
} from 'lucide-react';
import { voiceController } from '../../utils/voiceController';

export const KenoPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { balance } = useWalletStore();
  const {
    currentRound,
    selectedNumbers,
    betAmount,
    myTickets,
    stats,
    gameMode,
    isLoading,
    isDrawing,
    error,
    drawnBalls,
    lastResult,
    setGameMode,
    toggleNumber,
    setBetAmount,
    quickPick,
    clearNumbers,
    fetchLiveRound,
    fetchMyTickets,
    fetchStats,
    placeLiveBet,
    playInstant,
    initSocketListeners,
  } = useKenoStore();

  const [activeTab, setActiveTab] = useState<'paytable' | 'history' | 'stats'>('paytable');
  const [isMuted, setIsMuted] = useState(false);
  const [customBet, setCustomBet] = useState('');

  useEffect(() => {
    fetchLiveRound();
    fetchMyTickets();
    fetchStats();
    const cleanup = initSocketListeners();
    return () => cleanup();
  }, [fetchLiveRound, fetchMyTickets, fetchStats, initSocketListeners]);

  const spotsCount = selectedNumbers.length;

  // Paytable for current spot count
  const currentPaytable = useMemo(() => {
    if (spotsCount === 0) return null;
    return KENO_PAYTABLE[spotsCount] || null;
  }, [spotsCount]);

  // Matches between user selections and drawn balls
  const matchedNumbers = useMemo(() => {
    return selectedNumbers.filter((n) => drawnBalls.includes(n));
  }, [selectedNumbers, drawnBalls]);

  const hitsCount = matchedNumbers.length;
  const currentMultiplier = currentPaytable ? currentPaytable[hitsCount] || 0 : 0;
  const potentialMaxMultiplier = useMemo(() => {
    if (!currentPaytable) return 0;
    const multipliers = Object.values(currentPaytable);
    return Math.max(...multipliers, 0);
  }, [currentPaytable]);

  const hotSet = useMemo(() => {
    return new Set((stats?.hotNumbers || []).slice(0, 8).map((h) => h.number));
  }, [stats]);

  const coldSet = useMemo(() => {
    return new Set((stats?.coldNumbers || []).slice(0, 8).map((c) => c.number));
  }, [stats]);

  const latestBall = drawnBalls.length > 0 ? drawnBalls[drawnBalls.length - 1] : null;

  const toggleSound = () => {
    if (isMuted) {
      voiceController.setVolume(0.9);
      setIsMuted(false);
    } else {
      voiceController.setVolume(0);
      setIsMuted(true);
    }
  };

  const handleBetClick = () => {
    if (gameMode === 'LIVE') {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      placeLiveBet();
    } else {
      playInstant();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-indigo-500/15 border border-amber-500/30 p-5 sm:p-6 shadow-sm">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 font-display">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                Live 80-Ball Keno Arena
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Multiplayer Online
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-display text-arena-text">
              DAGI BINGO <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 bg-clip-text text-transparent">KENO 80</span>
            </h1>
            <p className="text-xs sm:text-sm text-arena-muted mt-0.5">
              Pick 1 to 10 spots, watch 20 numbers drawn live, and win up to <strong>50,000x</strong> your wager in ETB!
            </p>
          </div>

          {/* Mode Toggle & Audio */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="bg-arena-surface/80 p-1 rounded-2xl border border-arena-border flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGameMode('LIVE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  gameMode === 'LIVE'
                    ? 'bg-amber-500 text-white shadow-sm font-black'
                    : 'text-arena-muted hover:text-arena-text'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${gameMode === 'LIVE' ? 'animate-pulse' : ''}`} />
                Live Multi-Draw
              </button>
              <button
                type="button"
                onClick={() => setGameMode('INSTANT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  gameMode === 'INSTANT'
                    ? 'bg-indigo-500 text-white shadow-sm font-black'
                    : 'text-arena-muted hover:text-arena-text'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Instant Play
              </button>
            </div>

            <button
              type="button"
              onClick={toggleSound}
              className="p-2.5 rounded-2xl bg-arena-surface border border-arena-border text-arena-muted hover:text-arena-text cursor-pointer transition-colors"
              title={isMuted ? 'Unmute Sound' : 'Mute Voice & Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Game Arena Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: 1-80 Grid & Draw Tray (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Round Status & Live Ball Spotlight Banner */}
          <div className="glass-panel-elevated p-4 sm:p-5 rounded-2xl border border-amber-500/30 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center font-black text-white font-display text-base shadow-sm border border-amber-300/40">
                  #{currentRound?.roundNumber || 1001}
                </div>
                <div>
                  <div className="text-xs text-arena-muted font-bold font-display uppercase tracking-wider">
                    {gameMode === 'LIVE' ? 'Multiplayer Live Arena' : 'Instant Solo Draw'}
                  </div>
                  <div className="text-sm font-black text-arena-text flex items-center gap-2">
                    {currentRound?.status === 'BETTING' && (
                      <span className="text-emerald-500 flex items-center gap-1.5 font-bold">
                        <Clock className="w-4 h-4 animate-spin-slow" />
                        Betting Open — Draw in {currentRound.countdownSeconds || 30}s
                      </span>
                    )}
                    {currentRound?.status === 'DRAWING' && (
                      <span className="text-amber-500 flex items-center gap-1.5 font-bold animate-pulse">
                        <Radio className="w-4 h-4 text-amber-500 animate-ping" />
                        Live Draw In Progress ({drawnBalls.length}/20 Balls)
                      </span>
                    )}
                    {currentRound?.status === 'COMPLETED' && (
                      <span className="text-indigo-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                        Round Settled — Next Round in {currentRound.countdownSeconds || 12}s
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Matches Counter Display */}
              <div className="flex items-center gap-2.5 bg-arena-surface px-3.5 py-2 rounded-2xl border border-arena-border shadow-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-arena-muted font-bold">Spots:</span>
                  <span className="text-sm font-black font-mono text-amber-500">
                    {spotsCount}/{KENO_MAX_SPOTS}
                  </span>
                </div>
                {drawnBalls.length > 0 && (
                  <>
                    <span className="text-arena-border">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-arena-muted font-bold">Hits:</span>
                      <span className="text-sm font-black font-mono text-emerald-400 animate-bounce flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {hitsCount}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Spotlight Showcase of Latest Ball when Drawing */}
            {isDrawing && latestBall && (
              <div className="flex items-center justify-center p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-400/30 animate-pop-in">
                <div className="flex items-center gap-4">
                  <BingoBall ball={{ number: latestBall, letter: 'K' as any }} size="lg" isNew />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 block font-display animate-pulse">
                      • CURRENT BALL DRAWN
                    </span>
                    <span className="text-xl font-black font-display text-arena-text">
                      Number {latestBall}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Live 20-Ball 3D Spherical Catcher Tray */}
            <div className="pt-3 border-t border-arena-border">
              <div className="flex items-center justify-between mb-2 px-0.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-arena-muted flex items-center gap-1.5 font-display">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Live 20-Ball Tray ({drawnBalls.length}/20)
                </span>
                {hitsCount > 0 && (
                  <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    🎯 {hitsCount} Matching Spot{hitsCount > 1 ? 's' : ''}!
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {drawnBalls.map((num, idx) => {
                  const isHit = selectedNumbers.includes(num);
                  return (
                    <div
                      key={`${num}-${idx}`}
                      className={`relative flex-shrink-0 transition-transform ${
                        isHit ? 'scale-110 z-10' : ''
                      }`}
                    >
                      <BingoBall
                        ball={{ number: num, letter: 'K' as any }}
                        size="md"
                        isNew={idx === drawnBalls.length - 1}
                      />
                      {isHit && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[9px] font-black shadow-md">
                          ✓
                        </span>
                      )}
                    </div>
                  );
                })}
                {Array.from({ length: Math.max(0, 20 - drawnBalls.length) }).map((_, i) => (
                  <div
                    key={`slot-${i}`}
                    className="w-12 h-12 rounded-full flex-shrink-0 border-2 border-dashed border-arena-border/70 bg-arena-surface/50 flex flex-col items-center justify-center text-xs font-mono font-bold text-arena-muted/40"
                  >
                    #{drawnBalls.length + i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 1-80 Interactive Number Spot Matrix */}
          <div className="glass-panel-elevated p-4 sm:p-6 rounded-2xl border border-arena-border shadow-card-elevated space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-arena-text font-display">
                  80-SPOT KENO BOARD
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-semibold text-arena-muted">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md daub-stamp free-space border border-amber-300" /> Picked
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md daub-stamp border border-indigo-300" /> Drawn
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md winning-cell bg-emerald-400 border border-emerald-300" /> Match!
                </span>
              </div>
            </div>

            {/* 10 x 8 Tactile Casino Number Grid */}
            <div className="grid grid-cols-10 gap-1.5 sm:gap-2 select-none">
              {Array.from({ length: KENO_TOTAL_NUMBERS }, (_, i) => i + 1).map((num) => {
                const isSelected = selectedNumbers.includes(num);
                const isDrawn = drawnBalls.includes(num);
                const isHit = isSelected && isDrawn;
                const isHot = hotSet.has(num);
                const isCold = coldSet.has(num);

                let cellClass =
                  'bg-arena-surface hover:bg-arena-elevated text-arena-text border border-arena-border hover:border-amber-400/60 hover:scale-105 active:scale-95 shadow-xs';

                if (isHit) {
                  cellClass =
                    'winning-cell bg-gradient-to-tr from-emerald-400 via-teal-300 to-emerald-500 text-slate-950 border-2 border-emerald-300 shadow-accent-glow scale-110 z-20 animate-pop-in font-black';
                } else if (isDrawn) {
                  cellClass =
                    'daub-stamp text-white border-2 border-indigo-300 shadow-arena-glow scale-105 z-10 font-black';
                } else if (isSelected) {
                  cellClass =
                    'daub-stamp free-space text-slate-950 font-black border-2 border-yellow-300 shadow-gold-glow scale-105 z-10 ring-2 ring-amber-400/50';
                }

                return (
                  <button
                    key={num}
                    type="button"
                    disabled={isDrawing}
                    onClick={() => toggleNumber(num)}
                    className={`relative aspect-square rounded-xl font-bold font-mono text-xs sm:text-sm flex flex-col items-center justify-center transition-all duration-150 cursor-pointer overflow-hidden ${cellClass}`}
                  >
                    {/* Top specular shine for 3D button feel */}
                    <div className="absolute top-[4%] left-[10%] w-[40%] h-[20%] rounded-full bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

                    <span>{num}</span>

                    {/* Hot / Cold Indicators */}
                    {isHot && !isSelected && !isDrawn && (
                      <span className="absolute top-0.5 right-0.5" title="Hot Number (High Frequency)">
                        <Flame className="w-2.5 h-2.5 text-rose-500" />
                      </span>
                    )}
                    {isCold && !isSelected && !isDrawn && (
                      <span className="absolute top-0.5 right-0.5" title="Cold Number (Low Frequency)">
                        <Snowflake className="w-2.5 h-2.5 text-sky-400" />
                      </span>
                    )}

                    {isHit && (
                      <span className="absolute bottom-0.5 right-0.5">
                        <Star className="w-2.5 h-2.5 fill-slate-950 text-slate-950" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Pick and Selection Action Toolbar */}
            <div className="pt-4 border-t border-arena-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-black text-arena-muted mr-1 font-display uppercase tracking-wider">
                  Quick Pick:
                </span>
                {[3, 5, 8, 10].map((count) => (
                  <button
                    key={count}
                    type="button"
                    disabled={isDrawing}
                    onClick={() => quickPick(count)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-black font-display uppercase transition-all cursor-pointer border ${
                      spotsCount === count
                        ? 'bg-amber-500 text-white border-amber-400 shadow-sm'
                        : 'bg-arena-surface text-arena-muted hover:text-arena-text border-arena-border hover:border-amber-400/40'
                    }`}
                  >
                    {count} Spots
                  </button>
                ))}
                <button
                  type="button"
                  disabled={isDrawing}
                  onClick={() => quickPick(Math.floor(Math.random() * 8) + 3)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-black font-display uppercase bg-arena-surface text-amber-500 border border-amber-500/30 hover:bg-amber-500/10 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Shuffle className="w-3 h-3" />
                  Random
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isDrawing || spotsCount === 0}
                  onClick={clearNumbers}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear Grid
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Wager Controls, Paytable, and Personal Bets (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Wager Selection & Bet Panel */}
          <div className="glass-panel-elevated p-4 sm:p-5 rounded-2xl border border-arena-border shadow-card-elevated space-y-4">
            <div className="flex items-center justify-between border-b border-arena-border pb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-black font-display uppercase tracking-wider text-arena-text">
                  Wager & Payout
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-arena-muted">
                Balance: <span className="text-arena-text font-black">{balance?.availableBalance || 0} ETB</span>
              </div>
            </div>

            {/* Preset Wager Poker Chips */}
            <div>
              <label className="text-xs font-bold text-arena-muted mb-2 block font-display">
                Select Bet Amount (ETB):
              </label>
              <div className="grid grid-cols-4 gap-2">
                {KENO_PRESET_BETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    disabled={isDrawing}
                    onClick={() => {
                      setBetAmount(amt);
                      setCustomBet('');
                    }}
                    className={`py-2 rounded-xl text-xs font-mono font-black transition-all cursor-pointer border ${
                      betAmount === amt && !customBet
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-400 shadow-gold-glow scale-105'
                        : 'bg-arena-surface text-arena-text border-arena-border hover:border-amber-400/40 hover:scale-102'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Bet Input */}
            <div>
              <Input
                label="Custom Amount"
                type="number"
                placeholder="Enter custom ETB wager..."
                min="1"
                value={customBet}
                onChange={(e) => {
                  setCustomBet(e.target.value);
                  const parsed = parseFloat(e.target.value);
                  if (!isNaN(parsed) && parsed > 0) {
                    setBetAmount(parsed);
                  }
                }}
              />
            </div>

            {/* Potential Max Payout Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-indigo-500/15 border border-amber-500/30">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-arena-muted font-bold font-display uppercase tracking-wider">
                  Max Multiplier:
                </span>
                <span className="text-amber-500 font-mono font-black">{potentialMaxMultiplier}x</span>
              </div>
              <div className="text-xl font-black font-mono text-arena-text">
                {(betAmount * potentialMaxMultiplier).toLocaleString()} ETB
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Main Action Bet Button */}
            <Button
              variant="accent"
              size="lg"
              fullWidth
              isLoading={isLoading || isDrawing}
              disabled={selectedNumbers.length === 0}
              onClick={handleBetClick}
              rightIcon={<Play className="w-4 h-4 fill-current" />}
            >
              {gameMode === 'LIVE'
                ? isAuthenticated
                  ? `Place Live Bet (${betAmount} ETB)`
                  : `Sign In to Place Live Bet (${betAmount} ETB)`
                : isAuthenticated
                ? `Play Instant (${betAmount} ETB)`
                : `Play Instant Demo (${betAmount} ETB)`}
            </Button>
          </div>

          {/* Tabs: Paytable / History / Stats */}
          <div className="glass-panel-elevated p-4 rounded-2xl border border-arena-border shadow-card-elevated">
            <div className="flex border-b border-arena-border pb-2 mb-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('paytable')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'paytable'
                    ? 'bg-amber-500 text-white font-black'
                    : 'text-arena-muted hover:text-arena-text'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                Paytable
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-amber-500 text-white font-black'
                    : 'text-arena-muted hover:text-arena-text'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                My Bets
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('stats')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'stats'
                    ? 'bg-amber-500 text-white font-black'
                    : 'text-arena-muted hover:text-arena-text'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Hot / Cold
              </button>
            </div>

            {/* TAB 1: Dynamic Paytable */}
            {activeTab === 'paytable' && (
              <div className="space-y-2">
                <div className="text-xs text-arena-muted flex items-center justify-between pb-1 font-semibold">
                  <span>{spotsCount > 0 ? `${spotsCount}-Spot Multipliers` : 'Pick spots to view'}</span>
                  <span>Payout for {betAmount} ETB</span>
                </div>

                {currentPaytable ? (
                  <div className="space-y-1 max-h-56 overflow-y-auto scrollbar-none">
                    {Object.entries(currentPaytable).map(([hits, multiplier]) => {
                      const isCurrentHit = hitsCount === Number(hits) && drawnBalls.length > 0;
                      return (
                        <div
                          key={hits}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-all ${
                            isCurrentHit
                              ? 'bg-emerald-500/25 border border-emerald-400 text-emerald-400 font-black shadow-accent-glow scale-102'
                              : 'bg-arena-surface/80 border border-arena-border text-arena-text'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{hits} Hits:</span>
                            <span className="text-amber-500 font-bold">{multiplier}x</span>
                          </div>
                          <div className="font-black text-right text-arena-text">
                            {(betAmount * multiplier).toLocaleString()} ETB
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-arena-muted italic">
                    Select 1 to 10 numbers on the board to view the dynamic paytable and potential winnings.
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: My Tickets & Result History */}
            {activeTab === 'history' && (
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-none">
                {myTickets.length === 0 ? (
                  <div className="py-6 text-center text-xs text-arena-muted italic">
                    No tickets placed yet. Place your bet and watch the live draw!
                  </div>
                ) : (
                  myTickets.slice(0, 15).map((ticket) => (
                    <div
                      key={ticket._id}
                      className="p-2.5 rounded-xl bg-arena-surface border border-arena-border text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-arena-text">
                          {ticket.isQuickPlay ? '⚡ Instant' : `Round #${ticket.roundNumber || 'Live'}`}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            ticket.status === 'WON'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : ticket.status === 'LOST'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {ticket.status === 'WON' ? `+${ticket.payoutAmount} ETB` : ticket.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-arena-muted flex items-center justify-between">
                        <span>
                          Spots: {ticket.spotsCount} ({ticket.hitsCount || 0} Hits)
                        </span>
                        <span>Bet: {ticket.betAmount} ETB</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: Hot / Cold Frequency Stats */}
            {activeTab === 'stats' && (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center gap-1 font-bold text-rose-500 mb-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    Hot Numbers (Most Drawn):
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(stats?.hotNumbers || []).slice(0, 10).map((item) => (
                      <button
                        key={`hot-${item.number}`}
                        type="button"
                        onClick={() => toggleNumber(item.number)}
                        className="px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 font-mono font-bold hover:scale-105 cursor-pointer"
                      >
                        {item.number} ({item.frequency}x)
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 font-bold text-sky-400 mb-1.5">
                    <Snowflake className="w-3.5 h-3.5" />
                    Cold Numbers (Least Drawn):
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(stats?.coldNumbers || []).slice(0, 10).map((item) => (
                      <button
                        key={`cold-${item.number}`}
                        type="button"
                        onClick={() => toggleNumber(item.number)}
                        className="px-2 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 font-mono font-bold hover:scale-105 cursor-pointer"
                      >
                        {item.number} ({item.frequency}x)
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
