import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { api } from '../../services/api';
import { Trophy, Medal, Crown, Flame, Sparkles } from 'lucide-react';

interface LeaderboardUser {
  rank: number;
  userId: string;
  username: string;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  totalWinnings: number;
  highestWin: number;
  bestStreak: number;
}

export const LeaderboardPage: React.FC = () => {
  const [category, setCategory] = useState('MOST_WINS');
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        const data = await api.get<LeaderboardUser[]>(`/leaderboard?category=${category}`);
        setLeaderboard(data);
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, [category]);

  const categories = [
    { id: 'MOST_WINS', label: '👑 Most Wins' },
    { id: 'HIGHEST_PRIZE', label: '💰 Highest Prize' },
    { id: 'BEST_WIN_RATE', label: '🎯 Best Win Rate' },
    { id: 'MOST_GAMES', label: '⚡ Most Games' },
  ];

  const top3 = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <Badge variant="gold">Hall of Champions</Badge>
        <h1 className="text-3xl md:text-5xl font-black font-display text-arena-text tracking-tight">
          Arena Leaderboard
        </h1>
        <p className="text-xs sm:text-sm text-arena-muted">
          Global rankings of players ranked by authoritative server-validated Bingo victories.
        </p>
      </div>

      {/* Categories */}
      <div className="flex justify-center">
        <Tabs tabs={categories} activeTab={category} onChange={(id) => setCategory(id)} />
      </div>

      {/* 3D Podium Showcase */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 max-w-4xl mx-auto items-end">
          {/* 2nd place */}
          {top3[1] && (
            <Card elevated glow="cyan" className="p-6 text-center order-2 md:order-1 border-arena-border">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-500/20 border border-slate-400/40 flex items-center justify-center font-black text-2xl mb-3 shadow-md">
                🥈
              </div>
              <span className="text-[10px] font-black font-display text-arena-muted uppercase tracking-widest block">
                RANK #2
              </span>
              <h3 className="text-lg font-black font-display text-arena-text mt-1">{top3[1].username}</h3>
              <div className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400 mt-2">
                {top3[1].gamesWon} Wins
              </div>
              <div className="text-xs text-arena-muted mt-1">{top3[1].totalWinnings.toLocaleString()} ETB Won</div>
            </Card>
          )}

          {/* 1st place Champion */}
          {top3[0] && (
            <Card elevated glow="gold" className="p-8 text-center order-1 md:order-2 border-amber-400/60 shadow-gold-glow bg-gradient-to-b from-amber-500/15 via-arena-elevated to-arena-surface scale-105">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center font-black text-slate-950 text-3xl mb-3 shadow-gold-glow animate-float">
                👑
              </div>
              <span className="text-xs font-black font-display text-amber-700 dark:text-amber-400 uppercase tracking-widest block">
                ARENA CHAMPION #1
              </span>
              <h3 className="text-2xl font-black font-display text-arena-text mt-1">{top3[0].username}</h3>
              <div className="text-3xl md:text-4xl font-black font-mono gradient-text-gold mt-2">
                {top3[0].gamesWon} Wins
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300 font-bold mt-1">
                {top3[0].totalWinnings.toLocaleString()} ETB Total Payout
              </div>
            </Card>
          )}

          {/* 3rd place */}
          {top3[2] && (
            <Card elevated glow="pink" className="p-6 text-center order-3 border-arena-border">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-900/20 border border-amber-700/30 flex items-center justify-center font-black text-2xl mb-3 shadow-md">
                🥉
              </div>
              <span className="text-[10px] font-black font-display text-amber-700 dark:text-amber-500 uppercase tracking-widest block">
                RANK #3
              </span>
              <h3 className="text-lg font-black font-display text-arena-text mt-1">{top3[2].username}</h3>
              <div className="text-2xl font-black font-mono text-pink-600 dark:text-pink-400 mt-2">
                {top3[2].gamesWon} Wins
              </div>
              <div className="text-xs text-arena-muted mt-1">{top3[2].totalWinnings.toLocaleString()} ETB Won</div>
            </Card>
          )}
        </div>
      )}

      {/* Leaderboard Table */}
      <Card elevated className="p-6 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[11px] font-black font-display text-arena-muted uppercase border-b border-arena-border">
            <tr>
              <th className="pb-3 px-2">Rank</th>
              <th className="pb-3 px-2">Player</th>
              <th className="pb-3 px-2">Wins</th>
              <th className="pb-3 px-2">Win Rate</th>
              <th className="pb-3 px-2">Streak</th>
              <th className="pb-3 px-2">Total Demo Winnings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-arena-border/50">
            {leaderboard.map((u) => (
              <tr key={u.userId} className="hover:bg-arena-surface/50 transition-colors">
                <td className="py-3.5 px-2 font-mono font-black text-arena-text text-sm">#{u.rank}</td>
                <td className="py-3.5 px-2 font-bold text-arena-text flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs text-indigo-600 dark:text-indigo-300 font-black">
                    {u.username.substring(0, 2).toUpperCase()}
                  </div>
                  {u.username}
                </td>
                <td className="py-3.5 px-2 font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">{u.gamesWon}</td>
                <td className="py-3.5 px-2 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{u.winRate}%</td>
                <td className="py-3.5 px-2 font-mono text-amber-600 dark:text-amber-400 font-bold">{u.bestStreak} 🔥</td>
                <td className="py-3.5 px-2 font-mono font-black text-arena-text">
                  {u.totalWinnings.toLocaleString()} ETB
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
