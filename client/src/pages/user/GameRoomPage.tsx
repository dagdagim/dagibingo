import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';
import { useWalletStore } from '../../stores/walletStore';
import { socketService } from '../../services/socket';
import { voiceController } from '../../utils/voiceController';
import { api } from '../../services/api';
import { CalledBall, NUMBER_WORDS, BingoTicketDTO, GameRoomDetails } from '@bingo/shared';

// UI & Components
import { BingoBall } from '../../components/bingo/BingoBall';
import { BingoCard } from '../../components/bingo/BingoCard';
import { CalledNumberHistory } from '../../components/bingo/CalledNumberHistory';
import { GameChat } from '../../components/bingo/GameChat';
import { WinnerModal } from '../../components/bingo/WinnerModal';
import { VoiceSettingsModal } from '../../components/bingo/VoiceSettingsModal';
import { PatternRulesModal } from '../../components/bingo/PatternRulesModal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

import {
  Volume2,
  VolumeX,
  Settings,
  MessageSquare,
  Users,
  Trophy,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  Flame,
  Target,
  HelpCircle,
  Info,
  Shield,
} from 'lucide-react';

export const GameRoomPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const {
    game,
    tickets,
    currentBall,
    calledBalls,
    winner,
    markedMap,
    autoDaub,
    isClaiming,
    claimResult,
    setGame,
    setTickets,
    addCalledBall,
    toggleMark,
    setAutoDaub,
    setIsClaiming,
    setClaimResult,
    setWinner,
    resetRoomState,
  } = useGameStore();

  const [activeTicketIndex, setActiveTicketIndex] = useState(0);
  const [selectedTicketCount, setSelectedTicketCount] = useState(1);
  const [isJoining, setIsJoining] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [nextRoundCountdown, setNextRoundCountdown] = useState<number | null>(null);

  // Load game details & my tickets
  const loadGameData = async () => {
    if (!gameId) return;
    try {
      const room = await api.get<GameRoomDetails>(`/games/${gameId}`);
      setGame(room);

      if (isAuthenticated) {
        const myTickets = await api.get<BingoTicketDTO[]>(`/games/${gameId}/my-tickets`);
        setTickets(myTickets || []);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error('Failed to load game room data:', err);
      setTickets([]);
    }
  };

  useEffect(() => {
    if (!gameId) return;

    loadGameData();

    // Connect real-time socket room
    socketService.connect();
    socketService.joinRoom(gameId);

    // Register voice caller on ball draw
    const unsubBall = socketService.onNumberDrawn((ball) => {
      addCalledBall(ball);
      if (voiceEnabled) {
        voiceController.speakBall(ball);
      }
    });

    // Register winner listener
    const unsubWinner = socketService.onWinnerAnnounced((win) => {
      setWinner(win);
      // Auto-refresh wallet balance on win declaration
      useWalletStore.getState().fetchBalance();
    });

    // Register round lifecycle listeners
    const unsubRoundEnded = socketService.onRoundEnded((data) => {
      setNextRoundCountdown(data.nextRoundInSeconds || 30);
    });

    const unsubRoundReset = socketService.onRoundReset(() => {
      setNextRoundCountdown(null);
      loadGameData();
    });

    const unsubGameStarted = socketService.onGameStarted(() => {
      setNextRoundCountdown(null);
      loadGameData();
    });

    return () => {
      unsubBall();
      unsubWinner();
      unsubRoundEnded();
      unsubRoundReset();
      unsubGameStarted();
      socketService.leaveRoom(gameId);
      resetRoomState();
    };
  }, [gameId, isAuthenticated]);

  // Countdown timer effect for next round
  useEffect(() => {
    if (nextRoundCountdown === null || nextRoundCountdown <= 0) return;
    const interval = setInterval(() => {
      setNextRoundCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [nextRoundCountdown]);

  const handleJoinGame = async () => {
    if (!gameId) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role === 'ADMIN') {
      alert('Administrators are supervisory observers and cannot participate or purchase tickets.');
      return;
    }

    try {
      setIsJoining(true);
      await api.post(`/games/${gameId}/join`, { ticketsCount: selectedTicketCount });
      await loadGameData();
      // Auto-refresh player wallet after placing bet
      await useWalletStore.getState().fetchBalance();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleClaimBingo = async () => {
    if (!gameId || tickets.length === 0) return;
    const currentTicket = tickets[activeTicketIndex];
    if (!currentTicket) return;

    try {
      setIsClaiming(true);
      setClaimResult(null);

      const res = await api.post<{ isValid: boolean; message: string; patternMatched?: string }>(
        `/games/${gameId}/claim-bingo`,
        { ticketId: currentTicket.id }
      );

      setClaimResult(res);
    } catch (err) {
      setClaimResult({
        isValid: false,
        message: (err as Error).message || 'Claim verification failed',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const activeTicket = tickets[activeTicketIndex] || null;

  // Convert Set of 'r,c' to array of [r, c] tuples
  const activeMarks: [number, number][] = activeTicket && markedMap[activeTicket.id]
    ? Array.from(markedMap[activeTicket.id]).map((s) => {
        const [r, c] = s.split(',').map(Number);
        return [r, c];
      })
    : [[2, 2]];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Arena Broadcast Bar */}
      <div className="glass-panel-elevated rounded-3xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/lobby')}
            className="w-10 h-10 rounded-2xl bg-arena-surface hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-white/5 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black font-display text-white">
                {game?.title || 'Bingo Arena'}
              </h1>
              <Badge variant={game?.status === 'LIVE' ? 'accent' : 'primary'} dot={game?.status === 'LIVE'}>
                {game?.status || 'WAITING'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsPatternModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer shadow-xs hover:scale-105"
                title="Click to view winning pattern rules & 5x5 diagram"
              >
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                <span>Pattern: <strong>{game?.pattern || 'CLASSIC'}</strong></span>
                <HelpCircle className="w-3 h-3 text-indigo-400 opacity-80" />
              </button>

              <span className="text-xs text-arena-muted">
                Speed: <strong className="text-pink-600 dark:text-pink-300">{game?.speed}</strong>
              </span>
              <span className="text-xs text-arena-muted">• Room #{game?.code}</span>
            </div>
          </div>
        </div>

        {/* Live Prize Pool Chip & Voice Controls */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-400/30 text-right">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 block">
              GRAND PRIZE
            </span>
            <span className="font-mono font-black text-lg md:text-xl gradient-text-gold leading-none">
              {game ? game.prizePool.toLocaleString() : 0} ETB
            </span>
          </div>

          <button
            onClick={() => {
              const next = !voiceEnabled;
              setVoiceEnabled(next);
              voiceController.setVolume(next ? 1 : 0);
            }}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
              voiceEnabled
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40 shadow-arena-glow'
                : 'bg-arena-surface text-slate-500 border-white/10'
            }`}
            title="Toggle Voice Announcer"
          >
            {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="w-11 h-11 rounded-2xl bg-arena-surface hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
            title="Voice Announcer Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Next Round Countdown Alert Banner */}
      {nextRoundCountdown !== null && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-purple-500/15 to-pink-500/20 border border-indigo-400/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-arena-glow animate-pulse-subtle">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 border border-indigo-300/40 flex flex-col items-center justify-center text-white shadow-arena-glow flex-shrink-0">
              <span className="font-mono font-black text-xl leading-none">{nextRoundCountdown}</span>
              <span className="text-[8px] font-bold uppercase tracking-wider text-indigo-200">sec</span>
            </div>
            <div>
              <h4 className="text-base font-black font-display text-white">
                Next Match Starting Soon
              </h4>
              <p className="text-xs text-arena-muted">
                {tickets.length > 0
                  ? 'Your tickets are locked in for this match. Ball draws begin when timer hits zero!'
                  : 'Purchase your tickets now to play in the next round. Spectate or join anytime!'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Calling Stage & Game Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center Area: Calling Disc + Tickets */}
        <div className={`space-y-6 ${isChatOpen ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          {/* Current Ball Live Spotlight Stage */}
          <Card elevated className="p-4 sm:p-5 text-center relative overflow-hidden bg-gradient-to-b from-indigo-950/20 via-arena-elevated to-arena-surface">
            <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
              {/* 3D Bingo Ball */}
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1.5 block">
                  CURRENT CALLED NUMBER
                </span>
                {currentBall ? (
                  <div className="animate-pop-in">
                    <BingoBall ball={currentBall} size="xl" isNew />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full glass-panel border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-arena-muted">
                    <Clock className="w-6 h-6 mb-1 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase text-center px-1">
                      {nextRoundCountdown !== null ? `In ${nextRoundCountdown}s` : 'Ready to Draw'}
                    </span>
                  </div>
                )}
              </div>

              {/* Callout Text & Phonetics */}
              <div className="space-y-1.5 text-center sm:text-left max-w-xs">
                <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Live Voice Announcer
                </span>
                <div className="text-xl sm:text-2xl font-black font-display text-arena-text">
                  {currentBall ? (
                    <>
                      {currentBall.letter}-{currentBall.number}
                      <span className="text-xs text-indigo-600 dark:text-indigo-300 block font-normal mt-0.5">
                        "{currentBall.letter} {NUMBER_WORDS[currentBall.number] || currentBall.number}"
                      </span>
                    </>
                  ) : nextRoundCountdown !== null ? (
                    `Next Round in ${nextRoundCountdown}s`
                  ) : (
                    'Waiting for round start...'
                  )}
                </div>
                <p className="text-[11px] text-arena-muted">
                  Called numbers are synchronized across all connected players automatically.
                </p>
              </div>
            </div>
          </Card>

          {/* Called Numbers Ribbon */}
          <CalledNumberHistory calledBalls={calledBalls} totalCalled={calledBalls.length} />

          {/* Ticket Buying / Join State or Match In Progress / Admin Notice */}
          {user?.role === 'ADMIN' ? (
            <Card elevated className="p-6 md:p-8 text-center space-y-4 border-indigo-500/40 max-w-md mx-auto shadow-arena-glow">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 mx-auto shadow-arena-glow">
                <Shield className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-black font-display text-arena-text">
                  Admin Supervisory Station
                </h3>
                <p className="text-xs text-arena-muted leading-relaxed">
                  Administrators are strictly prohibited from purchasing tickets or playing as participants. You are observing this live room as a moderator and house manager.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 text-left">
                <div className="p-3 rounded-xl bg-arena-surface border border-arena-border">
                  <span className="text-[10px] uppercase font-bold text-arena-muted block">House Prize Pool</span>
                  <span className="text-sm font-black font-mono gradient-text-gold">{game?.prizePool.toLocaleString()} ETB</span>
                </div>
                <div className="p-3 rounded-xl bg-arena-surface border border-arena-border">
                  <span className="text-[10px] uppercase font-bold text-arena-muted block">Room Status</span>
                  <span className="text-sm font-black font-mono text-emerald-500">{game?.status}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => navigate('/admin')}
                >
                  Admin Dashboard
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => navigate('/lobby')}
                >
                  Back to Lobby
                </Button>
              </div>
            </Card>
          ) : tickets.length === 0 ? (
            game?.status === 'LIVE' && nextRoundCountdown === null ? (
              <Card elevated className="p-6 md:p-8 text-center space-y-4 border-amber-500/30 max-w-md mx-auto shadow-card-elevated">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
                  <Flame className="w-7 h-7 animate-pulse" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xl font-black font-display text-arena-text">
                    Match In Progress
                  </h3>
                  <p className="text-xs text-arena-muted leading-relaxed">
                    Ball drawing has already started. Ticket entry is closed for this round to ensure fair play. You are spectating the live room in real time.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="md"
                    fullWidth
                    onClick={() => navigate('/lobby')}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Find Upcoming Games in Lobby
                  </Button>
                </div>
              </Card>
            ) : (
              <Card elevated className="p-6 md:p-8 text-center space-y-4 border-indigo-500/30 max-w-md mx-auto shadow-arena-glow">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-500 mx-auto shadow-arena-glow">
                  <Sparkles className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black font-display text-arena-text">
                    {nextRoundCountdown !== null
                      ? `Next Match in ${nextRoundCountdown}s — Get Your Cards!`
                      : 'Get Your Bingo Cards'}
                  </h3>
                  <p className="text-xs text-arena-muted">
                    Choose how many 5x5 certified tickets you want for this match.
                  </p>
                </div>

                {/* Ticket Count Selector (1-4) */}
                <div className="flex items-center justify-center gap-2.5 py-1">
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setSelectedTicketCount(count)}
                      className={`w-12 h-12 rounded-xl font-display font-black text-base transition-all cursor-pointer ${
                        selectedTicketCount === count
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-arena-glow scale-105 border border-indigo-300'
                          : 'glass-panel text-arena-muted hover:text-arena-text border border-arena-border hover:border-indigo-400/30'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>

                <div className="text-xs font-semibold text-arena-muted">
                  Total Entry Cost:{' '}
                  <strong className="text-emerald-500 font-mono text-sm">
                    {((game?.entryFee || 0) * selectedTicketCount).toLocaleString()} ETB
                  </strong>
                </div>

                <Button
                  variant="accent"
                  size="md"
                  isLoading={isJoining}
                  onClick={handleJoinGame}
                  className="max-w-xs mx-auto"
                  fullWidth
                >
                  Buy {selectedTicketCount} Ticket{selectedTicketCount > 1 ? 's' : ''} & Play Next Match
                </Button>
              </Card>
            )
          ) : (
            /* Active Interactive Cards Stage */
            <div className="space-y-3">
              {nextRoundCountdown !== null && (
                <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between gap-2 max-w-[400px] mx-auto animate-pop-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Card Locked in for Next Match</span>
                  </div>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">Starts in {nextRoundCountdown}s</span>
                </div>
              )}
              {/* In-Game Win Objective & Pattern Helper Strip */}
              <div className="max-w-[400px] mx-auto p-2.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-arena-surface to-purple-500/10 border border-arena-border flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-500 flex-shrink-0">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-wider text-arena-text flex items-center gap-1.5">
                      <span>Goal: {game?.pattern || 'CLASSIC'}</span>
                    </div>
                    <span className="text-[10px] text-arena-muted truncate block">
                      {game?.pattern === 'FOUR_CORNERS'
                        ? 'Daub all 4 outer corners to win'
                        : game?.pattern === 'X_PATTERN'
                        ? 'Complete both diagonals in an X shape'
                        : game?.pattern === 'FULL_HOUSE'
                        ? 'Cover all 25 spaces (Blackout)'
                        : 'Complete any 1 row, column, or diagonal'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPatternModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-600 dark:text-indigo-300 border border-indigo-400/30 transition-colors flex-shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Info className="w-3 h-3" />
                  Rules
                </button>
              </div>

              {/* Multi-Ticket Switcher & Auto-Daub Controls */}
              <div className="max-w-[400px] mx-auto flex items-center justify-between gap-3 p-2.5 rounded-2xl glass-panel border border-arena-border">
                {/* Ticket Switcher Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {tickets.map((t, idx) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTicketIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black font-display transition-all cursor-pointer ${
                        activeTicketIndex === idx
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-arena-glow'
                          : 'glass-panel text-arena-muted hover:text-arena-text'
                      }`}
                    >
                      Card #{idx + 1}
                    </button>
                  ))}
                </div>

                {/* Auto-Daub Toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={autoDaub}
                    onChange={(e) => setAutoDaub(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 bg-arena-surface border-arena-border focus:ring-indigo-500"
                  />
                  <span className="text-[11px] font-bold text-arena-muted uppercase tracking-wider font-display">
                    ⚡ Auto-Daub
                  </span>
                </label>
              </div>

              {/* Interactive 5x5 Card */}
              {activeTicket && (
                <BingoCard
                  key={activeTicket.id}
                  grid={activeTicket.grid}
                  ticketNumber={activeTicketIndex + 1}
                  markedPositions={activeMarks}
                  onToggleMark={(r, c) => toggleMark(activeTicket.id, r, c)}
                />
              )}

              {/* Big Golden "CLAIM BINGO!" Action Button */}
              <div className="max-w-[400px] mx-auto pt-1 flex flex-col items-center gap-2.5">
                <Button
                  variant="gold"
                  size="lg"
                  fullWidth
                  isLoading={isClaiming}
                  onClick={handleClaimBingo}
                  className="shadow-gold-glow animate-pulse-fast text-base font-black py-3.5"
                >
                  🏆 BINGO! CLAIM WIN
                </Button>

                {claimResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 w-full animate-pop-in ${
                      claimResult.isValid
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-300'
                    }`}
                  >
                    {claimResult.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    )}
                    <span>{claimResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Live Room Chat */}
        {isChatOpen && gameId && (
          <div className="lg:col-span-4 sticky top-24">
            <GameChat gameId={gameId} />
          </div>
        )}
      </div>

      {/* Pattern Winning Rules Modal */}
      <PatternRulesModal
        isOpen={isPatternModalOpen}
        onClose={() => setIsPatternModalOpen(false)}
        pattern={game?.pattern || 'CLASSIC'}
        speed={game?.speed}
        entryFee={game?.entryFee}
        prizePool={game?.prizePool}
      />

      {/* Voice Settings Modal */}
      <VoiceSettingsModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} />

      {/* Winner Celebration Modal */}
      <WinnerModal
        winner={winner}
        gameTitle={game?.title}
        gameCode={game?.code}
        onClose={() => setWinner(null)}
      />
    </div>
  );
};
