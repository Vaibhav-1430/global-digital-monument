/**
 * Global Digital Monument — Payment Provider Abstraction Types
 */

export type PaymentProvider = 'upi_qr' | 'razorpay' | 'stripe';

export interface PaymentOrderIntent {
  orderId: string;
  keyId?: string;
  amount: number;
  currency: string;
  clientSecret?: string;
  provider: PaymentProvider;
  isConfigured: boolean;
  message?: string;
  payeeVpa?: string;
  payeeName?: string;
  upiUri?: string;
  verificationNotice?: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  eventId?: string;
  paymentReference?: string;
  eventType?: string;
  amount?: number;
  currency?: string;
  error?: string;
}

