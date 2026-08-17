import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { GameRoomSummary } from '@bingo/shared';
import { History, Trophy, ArrowRight } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [games, setGames] = useState<GameRoomSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const data = await api.get<GameRoomSummary[]>('/games');
        setGames(data);
      } catch {
        // Ignore
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <History className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Match History
          </span>
        </div>
        <h1 className="text-3xl font-black font-display text-arena-text">Previous Games & Results</h1>
      </div>

      <Card elevated className="overflow-x-auto p-0">
        <table className="w-full text-left text-xs">
          <thead className="bg-arena-elevated/60 text-[11px] font-bold text-arena-muted uppercase border-b border-arena-border">
            <tr>
              <th className="py-3.5 px-4">Game Room</th>
              <th className="py-3.5 px-4">Pattern</th>
              <th className="py-3.5 px-4">Entry Fee</th>
              <th className="py-3.5 px-4">Prize Pool</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-arena-border/50">
            {games.map((g) => (
              <tr key={g.id} className="hover:bg-arena-surface/50 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-bold text-arena-text">{g.title}</div>
                  <div className="text-[11px] font-mono text-arena-muted">#{g.code}</div>
                </td>
                <td className="py-3.5 px-4">
                  <Badge variant="primary" size="sm">{g.pattern}</Badge>
                </td>
                <td className="py-3.5 px-4 font-mono">
                  {g.entryFee} ETB
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-arena-accent">
                  {g.prizePool.toLocaleString()} ETB
                </td>
                <td className="py-3.5 px-4">
                  <Badge variant={g.status === 'LIVE' ? 'accent' : 'neutral'} size="sm">
                    {g.status}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Link to={`/games/${g.id}`}>
                    <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      View Room
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
