import React, { useEffect, useState } from 'react';
import { useWalletStore } from '../../stores/walletStore';
import { WalletCard } from '../../components/wallet/WalletCard';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { DepositModal } from '../../components/wallet/DepositModal';
import { WithdrawalModal } from '../../components/wallet/WithdrawalModal';
import { History, ShieldCheck, ArrowDownRight, ArrowUpRight, Filter } from 'lucide-react';

export const WalletPage: React.FC = () => {
  const { transactions, fetchBalance, fetchTransactions } = useWalletStore();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, [fetchBalance, fetchTransactions]);

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'ALL') return true;
    return tx.type === filterType;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'accent';
      case 'PENDING': case 'PROCESSING': return 'warning';
      case 'FAILED': case 'REJECTED': case 'CANCELLED': return 'danger';
      default: return 'neutral';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-display">
            FINANCIAL CENTER
          </span>
          <span className="text-arena-border">•</span>
          <span className="text-xs text-arena-muted">Sandbox Double-Entry Ledger</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black font-display text-arena-text">Virtual Wallet & Ledger</h1>
      </div>

      {/* Main Balance Card */}
      <WalletCard />

      {/* Transaction History Section */}
      <Card elevated className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-arena-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black font-display text-arena-text">Transaction History</h3>
              <p className="text-xs text-arena-muted">Immutable cryptographically signed credit movements</p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {['ALL', 'DEPOSIT', 'WITHDRAWAL', 'GAME_ENTRY', 'PRIZE'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer ${
                  filterType === t
                    ? 'bg-indigo-500 text-white shadow-arena-glow'
                    : 'bg-arena-surface text-arena-muted hover:text-arena-text border border-arena-border'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-arena-muted">
              No transactions recorded in this category.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-black font-display text-arena-muted uppercase border-b border-arena-border">
                <tr>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Balance After</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-arena-border/50">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-arena-surface/50 transition-colors">
                    <td className="py-3.5">
                      <span className="font-bold font-mono text-arena-text px-2 py-1 rounded-md bg-arena-surface border border-arena-border">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3.5 max-w-xs truncate text-arena-muted">
                      {tx.description}
                    </td>
                    <td className="py-3.5 font-mono font-black text-sm">
                      <span
                        className={
                          tx.type === 'DEPOSIT' || tx.type === 'PRIZE' || tx.type === 'REFUND'
                            ? 'text-emerald-500'
                            : 'text-rose-500'
                        }
                      >
                        {tx.type === 'DEPOSIT' || tx.type === 'PRIZE' || tx.type === 'REFUND' ? '+' : '-'}
                        {tx.amount.toLocaleString()} {tx.currency}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono text-arena-text font-bold">
                      {tx.balanceAfter.toLocaleString()} {tx.currency}
                    </td>
                    <td className="py-3.5">
                      <Badge variant={getStatusBadgeVariant(tx.status)} size="sm">
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 text-arena-muted font-mono text-[11px]">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
      <WithdrawalModal isOpen={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} />
    </div>
  );
};
