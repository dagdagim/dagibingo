import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DepositModal } from '../../components/wallet/DepositModal';
import { api } from '../../services/api';
import { GameRoomSummary } from '@bingo/shared';
import {
  Trophy,
  Gamepad2,
  Wallet,
  Flame,
  Plus,
  ArrowRight,
  TrendingUp,
  Percent,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export const UserDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { balance, fetchBalance } = useWalletStore();
  const [activeGames, setActiveGames] = useState<GameRoomSummary[]>([]);
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  useEffect(() => {
    fetchBalance();
    const fetchRooms = async () => {
      try {
        const data = await api.get<GameRoomSummary[]>('/games');
        setActiveGames(data.slice(0, 3));
      } catch {
        // Handled
      }
    };
    fetchRooms();
  }, [fetchBalance]);

  const stats = user?.stats || {
    gamesPlayed: 0,
    gamesWon: 0,
    winRate: 0,
    totalWinnings: 0,
    highestWin: 0,
    currentStreak: 0,
    bestStreak: 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Player Hero Welcome Card */}
      <div className="relative rounded-3xl p-6 md:p-8 glass-panel-elevated border border-indigo-500/30 overflow-hidden shadow-arena-glow">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-display font-black text-2xl text-white shadow-arena-glow flex-shrink-0">
              {user?.username?.substring(0, 2).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black font-display text-arena-text">
                  Welcome, {user?.username}!
                </h1>
                <Badge variant="accent">VERIFIED PLAYER</Badge>
              </div>
              <p className="text-xs text-arena-muted mt-1">
                Your Arena status is active • {stats.currentStreak > 0 ? `🔥 ${stats.currentStreak} Game Win Streak` : 'Ready for your next victory'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/lobby">
              <Button variant="accent" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Play Arena
              </Button>
            </Link>
            <Button
              variant="outline"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsDepositOpen(true)}
            >
              Deposit Virtual ETB
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card elevated glow="gold" className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-xs">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-arena-muted block">
              Total Winnings
            </span>
            <div className="text-xl font-black font-mono text-arena-text mt-0.5">
              {stats.totalWinnings.toLocaleString()} ETB
            </div>
            <span className="text-[10px] text-arena-muted">Best win: {stats.highestWin.toLocaleString()} ETB</span>
          </div>
        </Card>

        <Card elevated glow="accent" className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-xs">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-arena-muted block">
              Games Won
            </span>
            <div className="text-xl font-black font-mono text-arena-text mt-0.5">
              {stats.gamesWon}
            </div>
            <span className="text-[10px] text-arena-muted">{stats.gamesPlayed} matches played</span>
          </div>
        </Card>

        <Card elevated glow="primary" className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500 shadow-xs">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-arena-muted block">
              Win Rate
            </span>
            <div className="text-xl font-black font-mono text-arena-text mt-0.5">
              {stats.winRate}%
            </div>
            <span className="text-[10px] text-arena-muted">Overall accuracy</span>
          </div>
        </Card>

        <Card elevated glow="pink" className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-500 shadow-xs">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-arena-muted block">
              Best Win Streak
            </span>
            <div className="text-xl font-black font-mono text-arena-text mt-0.5">
              {stats.bestStreak} 🔥
            </div>
            <span className="text-[10px] text-arena-muted">Consecutive victories</span>
          </div>
        </Card>
      </div>

      {/* Quick Live Rooms Spotlight */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xl font-black font-display text-arena-text">Live Rooms Calling Now</h2>
          </div>
          <Link to="/lobby">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Explore Lobby
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activeGames.map((game) => (
            <Card key={game.id} elevated interactive glow="primary" className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={game.status === 'LIVE' ? 'accent' : 'primary'} dot={game.status === 'LIVE'}>
                    {game.status}
                  </Badge>
                  <span className="text-[11px] font-mono text-arena-muted font-bold">#{game.code}</span>
                </div>
                <h3 className="text-lg font-black font-display text-arena-text">{game.title}</h3>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{game.pattern}</span>

                <div className="my-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase block">Prize Pool</span>
                  <span className="text-lg font-black font-mono gradient-text-gold">{game.prizePool.toLocaleString()} ETB</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-arena-border">
                <div className="flex items-center justify-between text-xs text-arena-muted font-medium">
                  <span>Entry: <strong className="text-arena-text font-mono">{game.entryFee} ETB</strong></span>
                  <span>Players: <strong className="text-emerald-500 font-mono">{game.currentPlayers}/{game.maxPlayers}</strong></span>
                </div>
                <Link to={`/games/${game.id}`} className="block">
                  <Button variant="primary" size="sm" fullWidth rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Join Game
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
    </div>
  );
};
