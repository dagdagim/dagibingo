import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useWalletStore } from '../../stores/walletStore';
import { ShieldAlert, CheckCircle2, Sparkles } from 'lucide-react';

export interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
  const { deposit, isProcessing } = useWalletStore();
  const [amount, setAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [provider, setProvider] = useState<string>('Telebirr Demo');
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
    try {
      await deposit({
        amount: finalAmount,
        paymentMethod: provider,
        idempotencyKey: `dep_${Date.now()}_${Math.random()}`,
      });
      setSuccessMsg(`Successfully credited ${finalAmount.toLocaleString()} ETB Demo credits!`);
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
      title="Deposit Demo Credits"
      description="Add virtual ETB credits to your test wallet for Bingo gameplay"
    >
      <form onSubmit={handleDeposit} className="space-y-5 pt-2">
        {/* Sandbox Notice Banner */}
        <div className="p-3 rounded-xl bg-arena-primary/10 border border-arena-primary/30 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-arena-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-arena-primary-light">
            <strong>Sandbox Mode Active:</strong> No real payments or charges occur. These are virtual ETB test credits.
          </p>
        </div>

        {/* Amount Presets */}
        <div>
          <label className="text-xs font-semibold text-arena-muted uppercase tracking-wider block mb-2">
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
                className={`py-2.5 rounded-xl font-bold font-mono text-sm border transition-all ${
                  amount === preset && !customAmount
                    ? 'bg-arena-primary border-arena-primary text-white shadow-arena-glow'
                    : 'bg-arena-elevated border-arena-border text-arena-text hover:border-arena-primary/50'
                }`}
              >
                +{preset}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <Input
          label="Or Custom Amount"
          type="number"
          min="10"
          placeholder="e.g. 2500"
          value={customAmount}
          onChange={(e) => {
            setCustomAmount(e.target.value);
            setAmount(0);
          }}
        />

        {/* Simulated Payment Provider */}
        <div>
          <label className="text-xs font-semibold text-arena-muted uppercase tracking-wider block mb-2">
            Mock Payment Provider
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['Telebirr Demo', 'CBE Birr Demo', 'Mock Card'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProvider(p)}
                className={`py-2 px-2 text-center rounded-xl text-xs font-semibold border transition-all ${
                  provider === p
                    ? 'bg-arena-elevated border-arena-accent text-arena-accent'
                    : 'bg-arena-surface border-arena-border text-arena-muted hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && <p className="text-xs text-arena-danger font-medium">{errorMsg}</p>}
        {successMsg && (
          <div className="p-3 rounded-xl bg-arena-accent/15 border border-arena-accent text-arena-accent text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {successMsg}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-arena-border">
          <Button variant="outline" size="md" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" size="md" type="submit" isLoading={isProcessing}>
            Add Demo Credits
          </Button>
        </div>
      </form>
    </Modal>
  );
};
