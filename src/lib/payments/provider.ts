import { PaymentOrderIntent } from './types';
import { SanitizedContribution } from '../validation/contribution';
import { isPaymentConfigured } from '@/config/appMode';
import {
  assertCommercialLaunchReadiness,
  isCommercialLaunchRequested,
} from '@/config/businessInfo';

/**
 * Creates a payment order intent with the configured provider (Razorpay / Stripe).
 *
 * If credentials are missing in the environment, returns an unconfigured status
 * without pretending a payment was initialized.
 */
export async function createPaymentOrder(
  contribution: SanitizedContribution,
  donorEmail?: string
): Promise<PaymentOrderIntent> {
  const provider = (process.env.PAYMENT_PROVIDER || 'razorpay') as 'razorpay' | 'stripe';
  const hasSecrets = isPaymentConfigured();

  // If real provider secrets are not provided, return unconfigured status with clear instructions
  if (!hasSecrets) {
    const reference = `sim_order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      orderId: reference,
      amount: contribution.amount,
      currency: contribution.currency,
      provider,
      isConfigured: false,
      message: `Payment gateway credentials for ${provider.toUpperCase()} are not yet configured in server environment. Set ${provider === 'razorpay' ? 'RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET' : 'STRIPE_SECRET_KEY'} in .env.local to enable real checkout.`,
    };
  }

  // 1. Razorpay Order Creation (Standard for INR)
  if (provider === 'razorpay') {
    const keyId = process.env.RAZORPAY_KEY_ID!;
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;

    // Safety guard: Live mode is strictly prohibited in current phase
    if (keyId.startsWith('rzp_live')) {
      throw new Error('Razorpay Live Mode is strictly disabled. Only Razorpay Test Mode (rzp_test_*) credentials are permitted.');
    }

    // Safety guard: Commercial live launch requires owner confirmation of operator and legal identity
    if (isCommercialLaunchRequested()) {
      assertCommercialLaunchReadiness();
    }

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

    try {
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          amount: Math.round(contribution.amount * 100), // Razorpay uses paisa
          currency: 'INR',
          receipt: `rcpt_${Date.now()}`,
          notes: {
            contributor_name: contribution.name,
            city: contribution.city || '',
            country: contribution.country,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Razorpay API error (${response.status}): ${errorBody}`);
      }

      const orderData = await response.json();
      return {
        orderId: orderData.id,
        keyId,
        amount: contribution.amount,
        currency: 'INR',
        provider: 'razorpay',
        isConfigured: true,
      };
    } catch (err: any) {
      console.error('Failed to create Razorpay order:', err);
      throw new Error(`Unable to initialize payment checkout with Razorpay: ${err.message}`);
    }
  }

  // 2. Stripe PaymentIntent Creation
  if (provider === 'stripe') {
    const secretKey = process.env.STRIPE_SECRET_KEY!;

    try {
      const bodyParams = new URLSearchParams({
        amount: String(Math.round(contribution.amount * 100)),
        currency: 'inr',
        'metadata[contributor_name]': contribution.name,
        'metadata[country]': contribution.country,
      });

      if (donorEmail) {
        bodyParams.set('receipt_email', donorEmail);
      }

      const response = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${secretKey}`,
        },
        body: bodyParams.toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Stripe API error (${response.status}): ${errorBody}`);
      }

      const intentData = await response.json();
      return {
        orderId: intentData.id,
        clientSecret: intentData.client_secret,
        amount: contribution.amount,
        currency: 'INR',
        provider: 'stripe',
        isConfigured: true,
      };
    } catch (err: any) {
      console.error('Failed to create Stripe PaymentIntent:', err);
      throw new Error(`Unable to initialize payment checkout with Stripe: ${err.message}`);
    }
  }

  throw new Error(`Unsupported payment provider: ${provider}`);
}
