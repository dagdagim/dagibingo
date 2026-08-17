import { env } from '../config/environment';
import { logger } from '../utils/logger';
import { BadRequestError } from '../utils/errors';

export interface ChapaInitializeParams {
  amount: number;
  currency?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  txRef: string;
  callbackUrl?: string;
  returnUrl?: string;
  title?: string;
  description?: string;
}

export interface ChapaInitializeResult {
  checkoutUrl: string;
  txRef: string;
  raw: any;
}

export interface ChapaVerifyResult {
  isSuccess: boolean;
  status: string;
  amount: number;
  currency: string;
  txRef: string;
  reference?: string;
  paymentMethod?: string;
  raw: any;
}

export class ChapaPaymentProvider {
  private readonly secretKey: string;
  private readonly apiUrl: string;

  constructor() {
    this.secretKey = env.CHAPA_SECRET_KEY;
    this.apiUrl = env.CHAPA_API_URL.replace(/\/$/, '');
  }

  /**
   * Initializes a payment checkout session on Chapa
   */
  public async initializeTransaction(params: ChapaInitializeParams): Promise<ChapaInitializeResult> {
    const endpoint = `${this.apiUrl}/transaction/initialize`;

    const payload: Record<string, any> = {
      amount: params.amount.toString(),
      currency: params.currency || 'ETB',
      email: params.email && params.email.includes('@') ? params.email : 'customer@dagibingo.com',
      first_name: params.firstName || 'Dagi',
      last_name: params.lastName || 'Player',
      tx_ref: params.txRef,
      callback_url: params.callbackUrl || `http://localhost:5000/api/wallet/chapa/webhook`,
      return_url: params.returnUrl || `${env.CLIENT_URL}/wallet?tx_ref=${params.txRef}&payment_status=success`,
    };

    if (params.phone) {
      payload.phone_number = params.phone;
    }

    if (params.title || params.description) {
      payload.customization = {
        title: (params.title || 'DAGI BINGO').substring(0, 16),
        description: (params.description || `Deposit ${params.amount} ETB to Dagi Bingo`).substring(0, 100),
      };
    }

    logger.info(`[Chapa] Initializing transaction for tx_ref: ${params.txRef}, amount: ${params.amount} ETB`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        const errorMsg = typeof data.message === 'object' ? JSON.stringify(data.message) : (data.message || `Chapa initialization failed with HTTP ${response.status}`);
        logger.error(`[Chapa] Error initializing transaction: ${errorMsg}`, data);
        throw new BadRequestError(`Payment gateway error: ${errorMsg}`);
      }

      logger.info(`[Chapa] Transaction initialized successfully for tx_ref: ${params.txRef}`);

      return {
        checkoutUrl: data.data.checkout_url,
        txRef: params.txRef,
        raw: data,
      };
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      logger.error(`[Chapa] Network/API exception initializing transaction: ${(error as Error).message}`);
      throw new BadRequestError(`Could not connect to Chapa payment gateway: ${(error as Error).message}`);
    }
  }

  /**
   * Verifies a transaction on Chapa using its tx_ref
   */
  public async verifyTransaction(txRef: string): Promise<ChapaVerifyResult> {
    const endpoint = `${this.apiUrl}/transaction/verify/${encodeURIComponent(txRef)}`;

    logger.info(`[Chapa] Verifying transaction on Chapa: ${txRef}`);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        const msg = data.message || `Chapa verification failed with HTTP ${response.status}`;
        logger.warn(`[Chapa] Verification returned non-success for ${txRef}: ${msg}`);
        return {
          isSuccess: false,
          status: 'FAILED',
          amount: 0,
          currency: 'ETB',
          txRef,
          raw: data,
        };
      }

      const txData = data.data;
      const chapaStatus = (txData?.status || '').toLowerCase();
      const isPaid = chapaStatus === 'success' || chapaStatus === 'completed';
      const isFailed = chapaStatus === 'failed' || chapaStatus.includes('cancel');

      let resolvedStatus = 'PENDING';
      if (isPaid) resolvedStatus = 'COMPLETED';
      else if (isFailed) resolvedStatus = 'FAILED';

      logger.info(`[Chapa] Verified tx_ref: ${txRef} -> chapaStatus: ${chapaStatus}, isPaid: ${isPaid}, resolvedStatus: ${resolvedStatus}, amount: ${txData?.amount} ${txData?.currency}`);

      return {
        isSuccess: isPaid,
        status: resolvedStatus,
        amount: Number(txData?.amount || 0),
        currency: txData?.currency || 'ETB',
        txRef: txData?.tx_ref || txRef,
        reference: txData?.reference,
        paymentMethod: txData?.method || 'Chapa (Telebirr/CBE)',
        raw: data,
      };
    } catch (error) {
      logger.error(`[Chapa] Network/API exception verifying transaction: ${(error as Error).message}`);
      throw new BadRequestError(`Could not verify payment with Chapa: ${(error as Error).message}`);
    }
  }
}
