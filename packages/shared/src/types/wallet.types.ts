export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'GAME_ENTRY'
  | 'PRIZE'
  | 'REFUND'
  | 'BONUS'
  | 'ADJUSTMENT';

export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REJECTED'
  | 'CANCELLED';

export interface WalletBalance {
  availableBalance: number;
  lockedBalance: number;
  bonusBalance: number;
  totalBalance: number;
  currency: string; // 'ETB'
  isDemo: boolean;
  updatedAt: string;
}

export interface WalletTransactionDTO {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  currency: string;
  status: TransactionStatus;
  referenceId?: string; // gameId, depositId, withdrawalId
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DepositRequest {
  amount: number;
  paymentMethod: string;
  idempotencyKey?: string;
}

export interface WithdrawalRequest {
  amount: number;
  paymentMethod: string;
  accountDetails: {
    accountNumber: string;
    accountName: string;
    bankOrProvider: string;
  };
}
