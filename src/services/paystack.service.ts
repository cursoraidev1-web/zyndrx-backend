import logger from '../utils/logger';

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    amount: number;
    currency: string;
    transaction_date: string;
    status: string;
    reference: string;
    domain: string;
    metadata: any;
    gateway_response: string;
    customer: {
      email: string;
      customer_code: string;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
  };
}

export class PaystackService {
  private static readonly PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
  private static readonly PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || '';
  private static readonly PAYSTACK_BASE_URL = 'https://api.paystack.co';

  /**
   * Initialize payment transaction
   */
  static async initializePayment(data: {
    email: string;
    amount: number; // Amount in kobo (multiply by 100)
    reference?: string;
    metadata?: Record<string, any>;
    callback_url?: string;
  }): Promise<PaystackInitializeResponse> {
    try {
      if (!this.PAYSTACK_SECRET_KEY) {
        throw new Error('Paystack secret key is not configured');
      }

      const response = await fetch(
        `${this.PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.email,
            amount: data.amount, // Amount in kobo
            reference: data.reference,
            metadata: data.metadata,
            callback_url: data.callback_url,
          }),
        }
      );

      const responseData = await response.json() as PaystackInitializeResponse;
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to initialize Paystack payment');
      }

      return responseData;
    } catch (error: any) {
      logger.error('Paystack initialization error', {
        error: error.message,
      });
      throw error instanceof Error ? error : new Error('Failed to initialize Paystack payment');
    }
  }

  /**
   * Verify payment transaction
   */
  static async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
    try {
      if (!this.PAYSTACK_SECRET_KEY) {
        throw new Error('Paystack secret key is not configured');
      }

      const response = await fetch(
        `${this.PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      const responseData = await response.json() as PaystackVerifyResponse;
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to verify Paystack payment');
      }

      return responseData;
    } catch (error: any) {
      logger.error('Paystack verification error', {
        error: error.message,
        reference,
      });
      throw error instanceof Error ? error : new Error('Failed to verify Paystack payment');
    }
  }

  /**
   * Get plan prices in kobo (multiply by 100)
   */
  static getPlanPrice(planType: 'pro' | 'enterprise'): number {
    const prices: Record<string, number> = {
      pro: 290000, // ₦2,900 in kobo (or adjust based on your pricing)
      enterprise: 990000, // ₦9,900 in kobo (or adjust based on your pricing)
    };
    return prices[planType] || 0;
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(
    payload: string | Buffer,
    signature: string
  ): boolean {
    try {
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', this.PAYSTACK_SECRET_KEY)
        .update(payload)
        .digest('hex');
      return hash === signature;
    } catch (error) {
      logger.error('Webhook signature verification error', { error });
      return false;
    }
  }

  /**
   * Get public key (for frontend)
   */
  static getPublicKey(): string {
    return this.PAYSTACK_PUBLIC_KEY;
  }
}

