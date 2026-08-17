import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useWalletStore } from '../../stores/walletStore';
import { DepositModal } from './DepositModal';
import { WithdrawalModal } from './WithdrawalModal';
import { Wallet, ArrowDownRight, ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react';

export const WalletCard: React.FC = () => {
  const { balance } = useWalletStore();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const available = balance?.availableBalance ?? 1000;

  return (
    <>
      <Card elevated className="relative overflow-hidden border-arena-border-light shadow-2xl">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-arena-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-arena-primary/15 border border-arena-primary/30 text-arena-primary-light">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-arena-muted uppercase tracking-wider">
                Virtual Gaming Wallet
              </span>
              <span className="px-2 py-0.5 rounded-full bg-arena-accent/15 border border-arena-accent/30 text-arena-accent text-[10px] font-black uppercase tracking-wider">
                DEMO SANDBOX
              </span>
            </div>

            <div className="text-3xl md:text-4xl lg:text-5xl font-black font-display text-arena-text tracking-tight">
              {available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-xl md:text-2xl font-bold text-arena-primary-light">ETB</span>
            </div>

            <div className="flex items-center gap-2 mt-2 text-xs text-arena-subtle">
              <ShieldCheck className="w-4 h-4 text-arena-accent" />
              <span>Virtual Credits (Sandbox Mode) • No real currency involved</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              leftIcon={<ArrowUpRight className="w-4 h-4" />}
              onClick={() => setIsWithdrawOpen(true)}
            >
              Withdraw Demo
            </Button>
            <Button
              variant="accent"
              size="md"
              leftIcon={<ArrowDownRight className="w-4 h-4" />}
              onClick={() => setIsDepositOpen(true)}
            >
              Deposit Demo Credits
            </Button>
          </div>
        </div>
      </Card>

      <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
      <WithdrawalModal isOpen={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} />
    </>
  );
};
