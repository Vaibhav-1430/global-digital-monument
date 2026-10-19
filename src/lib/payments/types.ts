/**
 * Global Digital Monument — Payment Provider Abstraction Types
 */

export interface PaymentOrderIntent {
  orderId: string;
  keyId?: string;
  amount: number;
  currency: string;
  clientSecret?: string;
  provider: 'razorpay' | 'stripe';
  isConfigured: boolean;
  message?: string;
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

