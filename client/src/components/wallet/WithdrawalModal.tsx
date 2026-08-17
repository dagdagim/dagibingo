import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useWalletStore } from '../../stores/walletStore';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ isOpen, onClose }) => {
  const { balance, withdraw, isProcessing } = useWalletStore();
  const [amount, setAmount] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('0911223344');
  const [accountName, setAccountName] = useState<string>('Alex Tadesse');
  const [bankOrProvider, setBankOrProvider] = useState<string>('Telebirr');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const available = balance?.availableBalance || 0;

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseFloat(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setErrorMsg('Please enter a valid withdrawal amount');
      return;
    }
    if (withdrawAmount > available) {
      setErrorMsg(`Withdrawal amount cannot exceed available balance (${available.toLocaleString()} ETB)`);
      return;
    }

    setErrorMsg(null);
    try {
      await withdraw({
        amount: withdrawAmount,
        paymentMethod: `${bankOrProvider} Sandbox`,
        accountDetails: {
          accountNumber,
          accountName,
          bankOrProvider,
        },
      });
      setSuccessMsg(`Simulated payout of ${withdrawAmount.toLocaleString()} ETB Demo completed!`);
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
      title="Simulated Demo Withdrawal"
      description="Simulate a payout from your demo balance to an account"
    >
      <form onSubmit={handleWithdrawal} className="space-y-4 pt-2">
        <div className="p-3 rounded-xl bg-arena-elevated border border-arena-border flex items-center justify-between">
          <span className="text-xs text-arena-muted font-medium">Available to Withdraw:</span>
          <span className="text-sm font-bold font-mono text-arena-accent">
            {available.toLocaleString()} ETB DEMO
          </span>
        </div>

        <Input
          label="Withdrawal Amount (ETB)"
          type="number"
          placeholder="e.g. 500"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Provider / Bank"
            value={bankOrProvider}
            onChange={(e) => setBankOrProvider(e.target.value)}
            required
          />
          <Input
            label="Account / Phone Number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            required
          />
        </div>

        <Input
          label="Account Holder Name"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          required
        />

        <div className="flex items-center gap-2 text-[11px] text-arena-subtle">
          <ShieldCheck className="w-4 h-4 text-arena-accent flex-shrink-0" />
          <span>Demo withdrawal processed instantly in sandbox environment.</span>
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
          <Button variant="primary" size="md" type="submit" isLoading={isProcessing}>
            Request Demo Payout
          </Button>
        </div>
      </form>
    </Modal>
  );
};
