import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useWalletStore } from '../../stores/walletStore';
import { api } from '../../services/api';
import { ShieldAlert, CheckCircle2, Sparkles, CreditCard, ArrowRight, ExternalLink } from 'lucide-react';
import { ChapaInitializeResponse } from '@bingo/shared';

export interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
  const { deposit, isProcessing } = useWalletStore();
  const [amount, setAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [provider, setProvider] = useState<string>('CHAPA');
  const [isChapaLoading, setIsChapaLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const presets = [100, 500, 1000, 5000];

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = customAmount ? parseFloat(customAmount) : amount;
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setErrorMsg('Please select or enter a valid deposit amount');
      return;
    }

    setErrorMsg(null);

    // Chapa Real/Test Gateway Flow
    if (provider === 'CHAPA') {
      try {
        setIsChapaLoading(true);
        const res = await api.post<ChapaInitializeResponse>('/wallet/chapa/initialize', {
          amount: finalAmount,
          returnUrl: `${window.location.origin}/wallet?payment_status=success`,
        });

        if (res?.checkoutUrl) {
          setSuccessMsg('Redirecting to Chapa payment portal...');
          window.location.href = res.checkoutUrl;
          return;
        } else {
          throw new Error('Chapa checkout URL was not received');
        }
      } catch (err) {
        setErrorMsg((err as Error).message || 'Failed to initialize Chapa payment');
        setIsChapaLoading(false);
      }
      return;
    }

    // Instant Sandbox Mock Flow
    try {
      await deposit({
        amount: finalAmount,
        paymentMethod: provider,
        idempotencyKey: `dep_${Date.now()}_${Math.random()}`,
      });
      setSuccessMsg(`Successfully credited ${finalAmount.toLocaleString()} ETB to your wallet!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1400);
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deposit ETB Credits"
      description="Select your preferred payment method to add ETB credits to your Dagi Bingo wallet"
    >
      <form onSubmit={handleDeposit} className="space-y-5 pt-2">
        {/* Chapa Spotlight Notice Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 border border-emerald-500/30 flex items-start gap-2.5 shadow-sm">
          <Sparkles className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <strong className="text-arena-text block">Chapa Payment Gateway Active:</strong>
            <span className="text-arena-muted">
              Pay securely via <strong>Telebirr, CBE Birr, Awash Bank</strong> or <strong>Debit/Credit Cards</strong>.
            </span>
          </div>
        </div>

        {/* Amount Presets */}
        <div>
          <label className="text-xs font-bold text-arena-muted uppercase tracking-wider block mb-2 font-display">
            Select Preset Amount (ETB)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAmount(preset);
                  setCustomAmount('');
                }}
                className={`py-2.5 rounded-xl font-bold font-mono text-sm border transition-all cursor-pointer ${
                  amount === preset && !customAmount
                    ? 'bg-indigo-500 border-indigo-500 text-white shadow-arena-glow'
                    : 'bg-arena-surface border-arena-border text-arena-text hover:border-indigo-500/50'
                }`}
              >
                +{preset}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <Input
          label="Or Custom Amount (ETB)"
          type="number"
          min="1"
          placeholder="e.g. 2500"
          value={customAmount}
          onChange={(e) => {
            setCustomAmount(e.target.value);
            setAmount(0);
          }}
        />

        {/* Payment Provider Selection */}
        <div>
          <label className="text-xs font-bold text-arena-muted uppercase tracking-wider block mb-2 font-display">
            Payment Gateway & Provider
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Chapa Primary Option */}
            <button
              type="button"
              onClick={() => setProvider('CHAPA')}
              className={`p-3 text-left rounded-2xl border transition-all cursor-pointer flex items-center justify-between col-span-1 sm:col-span-2 ${
                provider === 'CHAPA'
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-300 shadow-accent-glow'
                  : 'bg-arena-surface border-arena-border text-arena-muted hover:border-emerald-500/40 hover:text-arena-text'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-sm">
                  ⚡
                </div>
                <div>
                  <div className="text-xs font-black text-arena-text flex items-center gap-1.5">
                    <span>Chapa Payment Gateway</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[9px] font-mono font-bold uppercase">
                      Recommended
                    </span>
                  </div>
                  <div className="text-[11px] text-arena-muted">Telebirr • CBE Birr • Awash • Cards</div>
                </div>
              </div>
              <CreditCard className="w-4 h-4 text-emerald-500" />
            </button>

            {/* Instant Demo/Sandbox Fallbacks */}
            {['Telebirr Demo Sandbox', 'CBE Birr Demo Sandbox'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProvider(p)}
                className={`p-2.5 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  provider === p
                    ? 'bg-indigo-500/15 border-indigo-500 text-indigo-600 dark:text-indigo-300'
                    : 'bg-arena-surface border-arena-border text-arena-muted hover:text-arena-text'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-semibold">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {successMsg}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-arena-border">
          <Button variant="outline" size="md" type="button" onClick={onClose} disabled={isChapaLoading || isProcessing}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="md"
            type="submit"
            isLoading={isChapaLoading || isProcessing}
            rightIcon={provider === 'CHAPA' ? <ExternalLink className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          >
            {provider === 'CHAPA' ? 'Proceed to Chapa Checkout' : 'Add Demo Credits'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
