import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWalletStore } from '../../stores/walletStore';
import { WalletCard } from '../../components/wallet/WalletCard';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DepositModal } from '../../components/wallet/DepositModal';
import { WithdrawalModal } from '../../components/wallet/WithdrawalModal';
import { api } from '../../services/api';
import { History, ShieldCheck, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import { ChapaVerifyResponse } from '@bingo/shared';

export const WalletPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { transactions, fetchBalance, fetchTransactions } = useWalletStore();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [chapaBanner, setChapaBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchBalance();
    fetchTransactions();

    // Check if returning from Chapa Payment
    const searchParams = new URLSearchParams(location.search);
    const txRef = searchParams.get('tx_ref') || searchParams.get('trx_ref');
    const paymentStatus = searchParams.get('payment_status') || searchParams.get('status');

    if (txRef) {
      const verifyChapa = async () => {
        try {
          const res = await api.get<ChapaVerifyResponse>(`/wallet/chapa/verify/${txRef}`);
          if (res.isSuccess) {
            setChapaBanner({
              type: 'success',
              message: `🎉 Payment of ${res.amount.toLocaleString()} ${res.currency} via Chapa successfully verified and added to your wallet!`,
            });
            fetchBalance();
            fetchTransactions();
          } else {
            setChapaBanner({
              type: 'error',
              message: res.message || 'Payment verification returned unsuccessful status.',
            });
          }
        } catch (err) {
          setChapaBanner({
            type: 'error',
            message: (err as Error).message || 'Failed to verify payment with Chapa.',
          });
        } finally {
          // Clear query params cleanly
          navigate('/wallet', { replace: true });
        }
      };

      verifyChapa();
    }
  }, [fetchBalance, fetchTransactions, location.search, navigate]);

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
      {/* Chapa Verification Banner */}
      {chapaBanner && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-md animate-pop-in ${
            chapaBanner.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-bold">
            {chapaBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            )}
            <span>{chapaBanner.message}</span>
          </div>
          <button
            onClick={() => setChapaBanner(null)}
            className="p-1 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-display">
            FINANCIAL CENTER
          </span>
          <span className="text-arena-border">•</span>
          <span className="text-xs text-arena-muted">Chapa & Sandbox Ledger</span>
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
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(tx.status)} size="sm">
                          {tx.status}
                        </Badge>
                        {tx.status === 'PENDING' && tx.referenceId && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await api.get<ChapaVerifyResponse>(`/wallet/chapa/verify/${tx.referenceId}`);
                                if (res.isSuccess) {
                                  setChapaBanner({
                                    type: 'success',
                                    message: `🎉 Deposit of ${res.amount.toLocaleString()} ${res.currency} verified and credited!`,
                                  });
                                } else {
                                  setChapaBanner({
                                    type: 'error',
                                    message: res.message || 'Deposit verification is still pending on Chapa.',
                                  });
                                }
                                fetchBalance();
                                fetchTransactions();
                              } catch (err) {
                                setChapaBanner({
                                  type: 'error',
                                  message: (err as Error).message || 'Failed to verify transaction.',
                                });
                              }
                            }}
                            className="px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-bold text-emerald-600 dark:text-emerald-300 transition-all cursor-pointer flex items-center gap-1"
                            title="Verify and update wallet immediately"
                          >
                            <Sparkles className="w-3 h-3" />
                            Verify Now
                          </button>
                        )}
                      </div>
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
