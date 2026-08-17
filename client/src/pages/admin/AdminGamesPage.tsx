import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import { AdminGameListItem } from '@bingo/shared';
import { Play, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';

export const AdminGamesPage: React.FC = () => {
  const [games, setGames] = useState<AdminGameListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGames = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ games: AdminGameListItem[]; total: number }>('/admin/games');
      setGames(res.games);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleForceStart = async (gameId: string) => {
    try {
      await api.post(`/admin/games/${gameId}/start`);
      fetchGames();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleCancelAndReset = async (gameId: string) => {
    const reason = prompt(
      'Cancel & Reset Room to WAITING:\nEnter cancellation reason (Any active player bets in this round will be refunded automatically):',
      'Administrator reset to waiting'
    );
    if (!reason) return;

    try {
      await api.post(`/admin/games/${gameId}/cancel`, { reason });
      alert('Room has been cancelled, active player bets refunded, and room reset to WAITING status.');
      fetchGames();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black font-display text-arena-text">Room & Game Operations</h1>
        <p className="text-xs text-arena-muted">Monitor live room lifecycles, force-start matches, and cancel/reset rooms to WAITING status</p>
      </div>

      <Card elevated className="overflow-x-auto p-0">
        <table className="w-full text-left text-xs">
          <thead className="bg-arena-elevated/60 text-[11px] font-bold text-arena-muted uppercase border-b border-arena-border">
            <tr>
              <th className="py-3.5 px-4">Room Details</th>
              <th className="py-3.5 px-4">Pattern Rule</th>
              <th className="py-3.5 px-4">Entry / Prize</th>
              <th className="py-3.5 px-4">Balls Drawn</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-arena-border/50">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-arena-muted">
                  Loading room operations...
                </td>
              </tr>
            ) : games.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-arena-muted">
                  No active game rooms found.
                </td>
              </tr>
            ) : (
              games.map((g) => (
                <tr key={g.id} className="hover:bg-arena-surface/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-arena-text">{g.title}</div>
                    <div className="text-[11px] font-mono text-arena-muted">#{g.code}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-400/30">
                      {g.pattern}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {g.entryFee} / <strong className="gradient-text-gold font-black">{g.prizePool.toLocaleString()} ETB</strong>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-arena-text">
                    {g.calledNumbersCount} / 75
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={g.status === 'LIVE' ? 'accent' : g.status === 'WAITING' ? 'primary' : 'neutral'} size="sm">
                      {g.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                    {g.status === 'WAITING' && (
                      <Button
                        variant="accent"
                        size="sm"
                        leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                        onClick={() => handleForceStart(g.id)}
                      >
                        Start Game
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                      onClick={() => handleCancelAndReset(g.id)}
                    >
                      {g.status === 'WAITING' ? 'Reset Room' : 'Cancel & Reset'}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
