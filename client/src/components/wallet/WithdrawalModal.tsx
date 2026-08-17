import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useWalletStore } from '../../stores/walletStore';
import { ShieldCheck, CheckCircle2, Building2, Smartphone, ArrowDownRight, Wallet, Sparkles } from 'lucide-react';

export interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ETHIOPIAN_PROVIDERS = [
  { id: 'Telebirr', name: 'Telebirr', type: 'mobile', hint: '09xxxxxxxx phone number' },
  { id: 'CBE Birr', name: 'CBE Birr', type: 'mobile', hint: '09xxxxxxxx phone number' },
  { id: 'Commercial Bank of Ethiopia', name: 'CBE (Bank Account)', type: 'bank', hint: '1000xxxxxxxx account' },
  { id: 'Bank of Abyssinia', name: 'Bank of Abyssinia', type: 'bank', hint: 'Account number' },
  { id: 'Awash Bank', name: 'Awash Bank', type: 'bank', hint: 'Account number' },
  { id: 'Dashen Bank', name: 'Dashen Bank', type: 'bank', hint: 'Account number' },
  { id: 'Wegagen Bank', name: 'Wegagen Bank', type: 'bank', hint: 'Account number' },
  { id: 'Hibret Bank', name: 'Hibret Bank', type: 'bank', hint: 'Account number' },
];

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ isOpen, onClose }) => {
  const { balance, withdraw, isProcessing } = useWalletStore();
  const [amount, setAmount] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('Telebirr');
  const [accountNumber, setAccountNumber] = useState<string>('0911223344');
  const [accountName, setAccountName] = useState<string>('Dagim Bekele');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const available = balance?.availableBalance || 0;
  const presets = [100, 500, 1000, 2500, 5000];

  const currentProviderObj = ETHIOPIAN_PROVIDERS.find((p) => p.id === selectedProvider) || ETHIOPIAN_PROVIDERS[0];

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseFloat(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setErrorMsg('Please enter a valid withdrawal amount');
      return;
    }
    if (withdrawAmount < 50) {
      setErrorMsg('Minimum withdrawal amount is 50 ETB');
      return;
    }
    if (withdrawAmount > available) {
      setErrorMsg(`Withdrawal amount cannot exceed available balance (${available.toLocaleString()} ETB)`);
      return;
    }
    if (!accountNumber.trim()) {
      setErrorMsg('Please enter your account or mobile money number');
      return;
    }
    if (!accountName.trim()) {
      setErrorMsg('Please enter account holder name');
      return;
    }

    setErrorMsg(null);
    try {
      await withdraw({
        amount: withdrawAmount,
        paymentMethod: selectedProvider,
        accountDetails: {
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
          bankOrProvider: selectedProvider,
        },
      });
      setSuccessMsg(`Payout request of ${withdrawAmount.toLocaleString()} ETB to ${selectedProvider} (${accountNumber}) processed successfully!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1600);
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Withdraw ETB Funds"
      description="Instant payouts powered by Chapa Transfers to Telebirr, CBE Birr & Ethiopian Banks"
    >
      <form onSubmit={handleWithdrawal} className="space-y-4 pt-2">
        {/* Chapa Transfer Banner */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 border border-emerald-500/30 flex items-start gap-2.5 shadow-sm">
          <Sparkles className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <strong className="text-arena-text block">Chapa Instant Payouts Active:</strong>
            <span className="text-arena-muted">
              Funds are dispatched via <strong>Chapa Transfer API</strong> directly to your selected recipient account.
            </span>
          </div>
        </div>

        {/* Available Balance Header */}
        <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-indigo-500" />
            <span className="text-xs text-arena-muted font-semibold">Available for Withdrawal:</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
              {available.toLocaleString()} ETB
            </span>
          </div>
        </div>

        {/* Quick Amount Presets */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-arena-muted uppercase tracking-wider font-display">
              Select Amount
            </label>
            <button
              type="button"
              onClick={() => setAmount(available.toString())}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Withdraw All ({available.toLocaleString()} ETB)
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1.5 mb-2">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset.toString())}
                className={`py-2 rounded-xl font-bold font-mono text-xs border transition-all cursor-pointer ${
                  amount === preset.toString()
                    ? 'bg-indigo-500 border-indigo-500 text-white shadow-arena-glow'
                    : 'bg-arena-surface border-arena-border text-arena-text hover:border-indigo-500/50'
                }`}
              >
                +{preset}
              </button>
            ))}
          </div>
          <Input
            label="Or Custom Amount (ETB)"
            type="number"
            min="50"
            max={available.toString()}
            placeholder="e.g. 1500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        {/* Provider Selection Grid */}
        <div>
          <label className="text-xs font-bold text-arena-muted uppercase tracking-wider block mb-1.5 font-display">
            Select Destination Provider / Bank
          </label>
          <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {ETHIOPIAN_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => setSelectedProvider(provider.id)}
                className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                  selectedProvider === provider.id
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-300 shadow-accent-glow'
                    : 'bg-arena-surface border-arena-border text-arena-muted hover:text-arena-text hover:border-arena-primary/30'
                }`}
              >
                {provider.type === 'mobile' ? (
                  <Smartphone className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Building2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                )}
                <div className="truncate">
                  <div className="text-[11px] font-bold text-arena-text truncate">{provider.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Account Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={currentProviderObj.type === 'mobile' ? 'Mobile Number' : 'Bank Account Number'}
            placeholder={currentProviderObj.hint}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            required
          />
          <Input
            label="Account Holder Full Name"
            placeholder="e.g. Dagim Bekele"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            required
          />
        </div>

        <div className="p-2.5 rounded-xl bg-arena-surface border border-arena-border flex items-center gap-2 text-[11px] text-arena-muted">
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>Double-entry ledger audited. Payout dispatched to registered {selectedProvider} recipient.</span>
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
          <Button variant="outline" size="md" type="button" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="md"
            type="submit"
            isLoading={isProcessing}
            rightIcon={<ArrowDownRight className="w-4 h-4" />}
          >
            Confirm Withdrawal
          </Button>
        </div>
      </form>
    </Modal>
  );
};
