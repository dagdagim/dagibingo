export interface DepositResult {
  transactionId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  amount: number;
  currency: string;
  providerReference: string;
  redirectUrl?: string;
}

export interface WithdrawalResult {
  transactionId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED';
  amount: number;
  currency: string;
  providerReference: string;
}

export interface IPaymentProvider {
  name: string;
  isDemo: boolean;
  createDeposit(params: {
    userId: string;
    amount: number;
    currency: string;
    idempotencyKey?: string;
  }): Promise<DepositResult>;

  verifyDeposit(providerReference: string): Promise<DepositResult>;

  createWithdrawal(params: {
    userId: string;
    amount: number;
    currency: string;
    accountDetails: {
      accountNumber: string;
      accountName: string;
      bankOrProvider: string;
    };
  }): Promise<WithdrawalResult>;

  verifyWithdrawal(providerReference: string): Promise<WithdrawalResult>;
}
