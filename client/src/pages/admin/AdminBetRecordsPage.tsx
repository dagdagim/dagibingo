import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { AdminBetLedgerData, AdminBetRecord, BetOutcome } from '@bingo/shared';
import {
  Receipt,
  Trophy,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Coins,
  Shield,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';

export const AdminBetRecordsPage: React.FC = () => {
  const [data, setData] = useState<AdminBetLedgerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | BetOutcome>('ALL');

  useEffect(() => {
    const fetchBetRecords = async () => {
      try {
        setIsLoading(true);
        const res = await api.get<AdminBetLedgerData>('/admin/bet-records');
        setData(res);
      } catch (err) {
        console.error('Failed to load bet records:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBetRecords();
  }, []);

  const records = data?.records || [];
  const summary = data?.summary || {
    totalBetsCount: 0,
    totalBetsVolume: 0,
    totalPrizesPaid: 0,
    netHouseProfit: 0,
    totalPlayerWins: 0,
    totalPlayerLosses: 0,
    activeBetsCount: 0,
  };

  // Filter records based on search and outcome
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.gameCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.gameTitle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesOutcome = outcomeFilter === 'ALL' || r.outcome === outcomeFilter;
    return matchesSearch && matchesOutcome;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black font-display text-arena-text">
          Player Bets & Win / Loss Ledger
        </h1>
        <p className="text-xs text-arena-muted mt-0.5">
          Real-time record of all player bets collected into the admin wallet and prize payouts awarded to winners
        </p>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Bets Inflow */}
        <Card elevated className="p-4 flex items-center gap-3.5 border-indigo-500/20">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500 flex-shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-arena-muted block">
              TOTAL BETS INFLOW
            </span>
            <div className="text-xl font-black font-mono text-arena-text">
              {summary.totalBetsVolume.toLocaleString()} ETB
            </div>
            <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-0.5 mt-0.5">
              <ArrowDownRight className="w-3 h-3" /> Credited to Admin Wallet
            </span>
          </div>
        </Card>

        {/* Total Prizes Paid Out */}
        <Card elevated className="p-4 flex items-center gap-3.5 border-amber-500/20">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 flex-shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-arena-muted block">
              TOTAL PRIZES PAID OUT
            </span>
            <div className="text-xl font-black font-mono gradient-text-gold">
              {summary.totalPrizesPaid.toLocaleString()} ETB
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5 mt-0.5">
              <ArrowUpRight className="w-3 h-3" /> Paid to Game Winners
            </span>
          </div>
        </Card>

        {/* Net House Profit */}
        <Card elevated className="p-4 flex items-center gap-3.5 border-emerald-500/20">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-arena-muted block">
              NET HOUSE PROFIT (GGR)
            </span>
            <div className={`text-xl font-black font-mono ${summary.netHouseProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {summary.netHouseProfit >= 0 ? '+' : ''}
              {summary.netHouseProfit.toLocaleString()} ETB
            </div>
            <span className="text-[10px] text-arena-muted font-semibold block mt-0.5">
              Admin Net Retained Earnings
            </span>
          </div>
        </Card>

        {/* Win vs Loss Record */}
        <Card elevated className="p-4 flex items-center gap-3.5 border-purple-500/20">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-500 flex-shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-arena-muted block">
              PLAYER WIN / LOSS RATIO
            </span>
            <div className="text-xl font-black font-mono text-arena-text">
              <span className="text-emerald-500">{summary.totalPlayerWins}W</span>
              <span className="text-arena-muted mx-1">/</span>
              <span className="text-rose-500">{summary.totalPlayerLosses}L</span>
            </div>
            <span className="text-[10px] text-arena-muted font-semibold block mt-0.5">
              {summary.activeBetsCount} bets currently in play
            </span>
          </div>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-panel rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arena-muted" />
          <input
            type="text"
            placeholder="Search by player, email, or game code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-arena-surface border border-arena-border text-xs text-arena-text focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Outcome Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['ALL', 'WON', 'LOST', 'ACTIVE'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setOutcomeFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display transition-all cursor-pointer ${
                outcomeFilter === filter
                  ? 'bg-indigo-500 text-white shadow-xs'
                  : 'bg-arena-surface text-arena-muted hover:text-arena-text border border-arena-border'
              }`}
            >
              {filter === 'ALL'
                ? 'All Bets'
                : filter === 'WON'
                ? '🏆 Player Won'
                : filter === 'LOST'
                ? '❌ Player Lost'
                : '⏳ Active In-Play'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Ledger Table */}
      <Card elevated className="overflow-x-auto p-0">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-arena-elevated/60 text-[11px] font-black text-arena-muted uppercase border-b border-arena-border">
            <tr>
              <th className="py-3.5 px-4">Date & Time</th>
              <th className="py-3.5 px-4">Player</th>
              <th className="py-3.5 px-4">Game Arena</th>
              <th className="py-3.5 px-4">Tickets</th>
              <th className="py-3.5 px-4">Bet Amount</th>
              <th className="py-3.5 px-4">Outcome</th>
              <th className="py-3.5 px-4">Player Net</th>
              <th className="py-3.5 px-4">House Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-arena-border/50 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-arena-muted">
                  Loading financial bet records...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-arena-muted">
                  No betting or game records found matching your query.
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-arena-surface/50 transition-colors">
                  {/* Timestamp */}
                  <td className="py-3 px-4 text-arena-muted font-mono text-[11px] whitespace-nowrap">
                    {new Date(rec.timestamp).toLocaleString()}
                  </td>

                  {/* Player */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-arena-text">@{rec.username}</div>
                    <div className="text-[10px] text-arena-muted font-mono">{rec.email}</div>
                  </td>

                  {/* Game Arena */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-arena-text">{rec.gameTitle}</div>
                    <div className="flex items-center gap-1.5 text-[10px] text-arena-muted font-mono">
                      <span>#{rec.gameCode}</span>
                      <span>•</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">{rec.pattern}</span>
                    </div>
                  </td>

                  {/* Tickets */}
                  <td className="py-3 px-4 font-mono font-bold text-arena-text">
                    {rec.ticketsCount} card{rec.ticketsCount > 1 ? 's' : ''}
                  </td>

                  {/* Bet Amount */}
                  <td className="py-3 px-4 font-mono font-black text-arena-text whitespace-nowrap">
                    {rec.betAmount.toLocaleString()} ETB
                  </td>

                  {/* Outcome Badge */}
                  <td className="py-3 px-4">
                    {rec.outcome === 'WON' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-black">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        WON
                      </span>
                    ) : rec.outcome === 'LOST' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-[11px] font-bold">
                        <XCircle className="w-3 h-3 text-rose-500" />
                        LOST
                      </span>
                    ) : rec.outcome === 'CANCELLED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-400 border border-slate-500/30 text-[11px] font-bold">
                        REFUNDED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                        <Clock className="w-3 h-3 text-amber-500 animate-spin" />
                        IN PLAY
                      </span>
                    )}
                  </td>

                  {/* Player Net Profit/Loss */}
                  <td className="py-3 px-4 font-mono font-black whitespace-nowrap">
                    {rec.outcome === 'WON' ? (
                      <span className="text-emerald-500">
                        +{rec.netPlayerProfit.toLocaleString()} ETB
                      </span>
                    ) : rec.outcome === 'LOST' ? (
                      <span className="text-rose-500">
                        -{rec.betAmount.toLocaleString()} ETB
                      </span>
                    ) : (
                      <span className="text-arena-muted">0 ETB</span>
                    )}
                  </td>

                  {/* House Impact */}
                  <td className="py-3 px-4 font-mono font-black whitespace-nowrap">
                    {rec.houseRevenueImpact >= 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{rec.houseRevenueImpact.toLocaleString()} ETB
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        {rec.houseRevenueImpact.toLocaleString()} ETB
                      </span>
                    )}
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
