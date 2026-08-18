import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKenoStore } from '../../stores/kenoStore';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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
          
          {/* Round Status Banner */}
          <Card elevated className="p-4 border-amber-500/25">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center font-black text-white font-display text-base shadow-sm">
                  #{currentRound?.roundNumber || 1001}
                </div>
                <div>
                  <div className="text-xs text-arena-muted font-semibold">
                    {gameMode === 'LIVE' ? 'Multiplayer Live Round' : 'Instant Solo Draw'}
                  </div>
                  <div className="text-sm font-black text-arena-text flex items-center gap-2">
                    {currentRound?.status === 'BETTING' && (
                      <span className="text-emerald-500 flex items-center gap-1.5 font-bold">
                        <Clock className="w-4 h-4 animate-spin-slow" />
                        Betting Open — Draw in {currentRound.countdownSeconds || 25}s
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
                        Round Settled — Next Round in {currentRound.countdownSeconds || 10}s
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Matches Counter Display */}
              <div className="flex items-center gap-2 bg-arena-surface px-3 py-1.5 rounded-2xl border border-arena-border">
                <span className="text-xs text-arena-muted font-bold">Selected:</span>
                <span className="text-sm font-black font-mono text-amber-500">
                  {spotsCount} / {KENO_MAX_SPOTS} Spots
                </span>
                {drawnBalls.length > 0 && (
                  <>
                    <span className="text-arena-border">|</span>
                    <span className="text-xs text-arena-muted font-bold">Hits:</span>
                    <span className="text-sm font-black font-mono text-emerald-400 animate-bounce">
                      {hitsCount} Hits
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Live 20-Ball Catcher Tray */}
            {drawnBalls.length > 0 && (
              <div className="mt-4 pt-3 border-t border-arena-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-arena-muted flex items-center gap-1 font-display">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Drawn Balls ({drawnBalls.length}/20)
                  </span>
                  {hitsCount > 0 && (
                    <span className="text-[11px] font-bold text-emerald-400">
                      🎯 {hitsCount} of your picks matched!
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                  {drawnBalls.map((num, idx) => {
                    const isHit = selectedNumbers.includes(num);
                    return (
                      <div
                        key={`${num}-${idx}`}
                        className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-sm font-mono transition-all transform animate-pop-in ${
                          isHit
                            ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-accent-glow ring-2 ring-emerald-400 scale-110'
                            : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-sm'
                        }`}
                      >
                        {num}
                      </div>
                    );
                  })}
                  {Array.from({ length: Math.max(0, 20 - drawnBalls.length) }).map((_, i) => (
                    <div
                      key={`placeholder-${i}`}
                      className="w-9 h-9 rounded-xl flex-shrink-0 border border-dashed border-arena-border/60 bg-arena-surface/40 flex items-center justify-center text-[10px] text-arena-muted/40 font-mono"
                    >
                      {drawnBalls.length + i + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* 1-80 Interactive Number Spot Matrix */}
          <Card elevated className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-arena-muted font-display">
                Keno Board (1 - 80)
              </span>
              <div className="flex items-center gap-2 text-[11px] text-arena-muted">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-md bg-amber-500" /> Selected
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-md bg-indigo-500" /> Drawn
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-md bg-emerald-400" /> Hit!
                </span>
              </div>
            </div>

            {/* 10 x 8 Grid */}
            <div className="grid grid-cols-10 gap-1.5 sm:gap-2 select-none">
              {Array.from({ length: KENO_TOTAL_NUMBERS }, (_, i) => i + 1).map((num) => {
                const isSelected = selectedNumbers.includes(num);
                const isDrawn = drawnBalls.includes(num);
                const isHit = isSelected && isDrawn;
                const isHot = hotSet.has(num);
                const isCold = coldSet.has(num);

                let btnStyles = 'bg-arena-surface border-arena-border text-arena-text hover:border-amber-500/50 hover:bg-amber-500/10';

                if (isHit) {
                  btnStyles = 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 font-black shadow-accent-glow scale-105 z-10';
                } else if (isDrawn) {
                  btnStyles = 'bg-indigo-600/80 border-indigo-400 text-white font-bold shadow-sm';
                } else if (isSelected) {
                  btnStyles = 'bg-gradient-to-tr from-amber-500 to-amber-600 text-white border-amber-400 font-black shadow-arena-glow scale-105 z-10';
                }

                return (
                  <button
                    key={num}
                    type="button"
                    disabled={isDrawing}
                    onClick={() => toggleNumber(num)}
                    className={`relative h-10 sm:h-12 rounded-xl border text-xs sm:text-sm font-mono font-bold transition-all duration-150 flex items-center justify-center cursor-pointer ${btnStyles}`}
                  >
                    {num}

                    {/* Hot / Cold Indicators */}
                    {isHot && !isSelected && !isDrawn && (
                      <span className="absolute top-0.5 right-0.5" title="Hot Number">
                        <Flame className="w-2.5 h-2.5 text-rose-500" />
                      </span>
                    )}
                    {isCold && !isSelected && !isDrawn && (
                      <span className="absolute top-0.5 right-0.5" title="Cold Number">
                        <Snowflake className="w-2.5 h-2.5 text-sky-400" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Pick and Selection Action Toolbar */}
            <div className="mt-4 pt-4 border-t border-arena-border flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-arena-muted mr-1 font-display">Quick Pick:</span>
                {[3, 5, 8, 10].map((count) => (
                  <button
                    key={count}
                    type="button"
                    disabled={isDrawing}
                    onClick={() => quickPick(count)}
                    className="px-2.5 py-1 rounded-xl bg-arena-surface border border-arena-border text-arena-text text-xs font-bold hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors cursor-pointer"
                  >
                    Pick {count}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={isDrawing}
                  onClick={() => quickPick(Math.floor(Math.random() * 8) + 3)}
                  className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-indigo-500/20 border border-amber-500/40 text-amber-500 text-xs font-bold hover:bg-amber-500/30 transition-colors cursor-pointer"
                >
                  🎲 Lucky
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isDrawing || selectedNumbers.length === 0}
                  onClick={clearNumbers}
                  className="px-3 py-1 rounded-xl bg-arena-surface border border-arena-border text-rose-400 text-xs font-bold hover:bg-rose-500/15 hover:border-rose-500/40 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Betting Engine & Paytable (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Bet Control Card */}
          <Card elevated className="p-5 border-indigo-500/30">
            <h2 className="text-base font-black font-display text-arena-text flex items-center gap-2 mb-3">
              <Coins className="w-4 h-4 text-amber-400" />
              Place Your Keno Bet
            </h2>

            {/* Wallet Balance Summary */}
            <div className="p-3 rounded-2xl bg-arena-surface border border-arena-border flex items-center justify-between mb-4">
              <span className="text-xs text-arena-muted font-semibold">Your Wallet Balance:</span>
              <span className="text-sm font-black font-mono text-indigo-400">
                {(balance?.availableBalance || 0).toLocaleString()} ETB
              </span>
            </div>

            {/* Preset Wager Chips */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-bold text-arena-muted uppercase tracking-wider block font-display">
                Select Bet Amount (ETB)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {KENO_PRESET_BETS.slice(0, 4).map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setBetAmount(amt);
                      setCustomBet('');
                    }}
                    className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      betAmount === amt && !customBet
                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                        : 'bg-arena-surface border-arena-border text-arena-text hover:border-amber-500/50'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {KENO_PRESET_BETS.slice(4).map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setBetAmount(amt);
                      setCustomBet('');
                    }}
                    className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      betAmount === amt && !customBet
                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                        : 'bg-arena-surface border-arena-border text-arena-text hover:border-amber-500/50'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
              <Input
                placeholder="Or custom bet amount"
                type="number"
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
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-indigo-500/15 border border-amber-500/30 mb-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-arena-muted font-bold">Max Potential Payout:</span>
                <span className="text-amber-500 font-mono font-bold">{potentialMaxMultiplier}x</span>
              </div>
              <div className="text-lg font-black font-mono text-arena-text">
                {(betAmount * potentialMaxMultiplier).toLocaleString()} ETB
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2 mb-4">
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
          </Card>

          {/* Tabs: Paytable / History / Stats */}
          <Card elevated className="p-4">
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
                Stats
              </button>
            </div>

            {/* Tab 1: Paytable for Selected Spots */}
            {activeTab === 'paytable' && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-arena-muted flex items-center justify-between mb-2">
                  <span>Payouts for {spotsCount || 1} Spot{spotsCount !== 1 ? 's' : ''}:</span>
                  <span className="text-[10px] text-amber-500 font-mono">Wager: {betAmount} ETB</span>
                </div>

                {currentPaytable ? (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {Object.entries(currentPaytable).map(([hit, mult]) => {
                      const isCurrentHit = hitsCount === parseInt(hit, 10);
                      const prize = Math.round(betAmount * mult * 100) / 100;
                      return (
                        <div
                          key={hit}
                          className={`p-2 rounded-xl flex items-center justify-between text-xs transition-colors ${
                            isCurrentHit
                              ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-black scale-[1.02]'
                              : 'bg-arena-surface border border-arena-border text-arena-text'
                          }`}
                        >
                          <span className="font-bold flex items-center gap-1.5">
                            {isCurrentHit && <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
                            {hit} Hits
                          </span>
                          <div className="text-right font-mono">
                            <span className="text-amber-500 font-bold mr-2">{mult}x</span>
                            <span className="font-bold">{prize.toLocaleString()} ETB</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-arena-muted">
                    Pick 1 to 10 numbers on the board to view the payout table.
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: User Bet History */}
            {activeTab === 'history' && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {myTickets.length === 0 ? (
                  <div className="py-6 text-center text-xs text-arena-muted">
                    No tickets yet. Place your first Keno bet!
                  </div>
                ) : (
                  myTickets.slice(0, 10).map((ticket) => (
                    <div
                      key={ticket._id}
                      className="p-2.5 rounded-xl bg-arena-surface border border-arena-border flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-arena-text">
                          {ticket.isQuickPlay ? '⚡ Solo Draw' : `Round #${ticket.roundNumber || 'Live'}`}
                        </div>
                        <div className="text-[11px] text-arena-muted">
                          {ticket.spotsCount} Spots • {ticket.betAmount} ETB
                        </div>
                      </div>
                      <div className="text-right">
                        {ticket.status === 'WON' ? (
                          <div className="text-emerald-400 font-black font-mono">
                            +{ticket.payoutAmount.toLocaleString()} ETB
                          </div>
                        ) : ticket.status === 'LOST' ? (
                          <div className="text-rose-400 font-bold font-mono">Lost</div>
                        ) : (
                          <div className="text-amber-400 font-bold font-mono">Pending</div>
                        )}
                        <div className="text-[10px] text-arena-muted">
                          {ticket.hitsCount}/{ticket.spotsCount} Hits
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Hot / Cold Frequency Stats */}
            {activeTab === 'stats' && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold text-rose-400 flex items-center gap-1 mb-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-500" /> Hot Numbers (Last 50 Rounds)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(stats?.hotNumbers || []).slice(0, 8).map((h) => (
                      <span
                        key={h.number}
                        className="px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold"
                      >
                        #{h.number} ({h.frequency})
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-sky-400 flex items-center gap-1 mb-1.5">
                    <Snowflake className="w-3.5 h-3.5 text-sky-400" /> Cold Numbers
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(stats?.coldNumbers || []).slice(0, 8).map((c) => (
                      <span
                        key={c.number}
                        className="px-2 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-mono font-bold"
                      >
                        #{c.number} ({c.frequency})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
