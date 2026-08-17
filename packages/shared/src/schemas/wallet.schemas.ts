import { z } from 'zod';

export const depositSchema = z.object({
  amount: z.number().min(10, 'Minimum deposit is 10 ETB').max(100000, 'Maximum deposit is 100,000 ETB'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  idempotencyKey: z.string().optional(),
});

export const withdrawalSchema = z.object({
  amount: z.number().min(50, 'Minimum withdrawal is 50 ETB').max(50000, 'Maximum withdrawal is 50,000 ETB'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  accountDetails: z.object({
    accountNumber: z.string().min(6, 'Valid account or mobile number required'),
    accountName: z.string().min(2, 'Account holder name required'),
    bankOrProvider: z.string().min(2, 'Bank or provider name required'),
  }),
});

export type DepositInput = z.infer<typeof depositSchema>;
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;
