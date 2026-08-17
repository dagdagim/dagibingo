import { IPaymentProvider, DepositResult, WithdrawalResult } from './PaymentProvider';
import { v4 as uuidv4 } from 'uuid';

export class MockPaymentProvider implements IPaymentProvider {
  public name = 'MOCK_SANDBOX_ETB';
  public isDemo = true;

  public async createDeposit(params: {
    userId: string;
    amount: number;
    currency: string;
    idempotencyKey?: string;
  }): Promise<DepositResult> {
    const reference = `MOCK_DEP_${uuidv4().substring(0, 10).toUpperCase()}`;

    return {
      transactionId: uuidv4(),
      status: 'COMPLETED', // Instant completion in sandbox mode
      amount: params.amount,
      currency: params.currency || 'ETB',
      providerReference: reference,
    };
  }

  public async verifyDeposit(providerReference: string): Promise<DepositResult> {
    return {
      transactionId: uuidv4(),
      status: 'COMPLETED',
      amount: 100,
      currency: 'ETB',
      providerReference,
    };
  }

  public async createWithdrawal(params: {
    userId: string;
    amount: number;
    currency: string;
    accountDetails: {
      accountNumber: string;
      accountName: string;
      bankOrProvider: string;
    };
  }): Promise<WithdrawalResult> {
    const reference = `MOCK_WDL_${uuidv4().substring(0, 10).toUpperCase()}`;

    return {
      transactionId: uuidv4(),
      status: 'COMPLETED', // Simulated instant sandbox payout
      amount: params.amount,
      currency: params.currency || 'ETB',
      providerReference: reference,
    };
  }

  public async verifyWithdrawal(providerReference: string): Promise<WithdrawalResult> {
    return {
      transactionId: uuidv4(),
      status: 'COMPLETED',
      amount: 50,
      currency: 'ETB',
      providerReference,
    };
  }
}
