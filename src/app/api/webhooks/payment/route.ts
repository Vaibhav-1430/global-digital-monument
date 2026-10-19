import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpayWebhook, verifyStripeWebhook } from '@/lib/payments/verifier';
import {
  isWebhookEventProcessed,
  markWebhookEventProcessed,
  confirmContributionPayment,
  markContributionFailed,
} from '@/lib/db/contributions';
import { broadcastConfirmedLight } from '@/lib/realtime/broadcast';

/**
 * POST /api/webhooks/payment
 *
 * Secure webhook endpoint for Razorpay and Stripe payment confirmations.
 * Enforces cryptographic HMAC-SHA256 verification and idempotent processing.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // 1. Detect provider from headers
    const razorpaySignature = req.headers.get('x-razorpay-signature');
    const stripeSignature = req.headers.get('stripe-signature');

    let verificationResult;
    let providerName: 'razorpay' | 'stripe';

    if (razorpaySignature) {
      providerName = 'razorpay';
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
      verificationResult = verifyRazorpayWebhook(rawBody, razorpaySignature, secret);
    } else if (stripeSignature) {
      providerName = 'stripe';
      const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
      verificationResult = verifyStripeWebhook(rawBody, stripeSignature, secret);
    } else {
      return NextResponse.json(
        { success: false, error: 'Unrecognized payment provider webhook signature headers.' },
        { status: 400 }
      );
    }

    // 2. Reject invalid signatures
    if (!verificationResult.isValid || !verificationResult.eventId) {
      console.warn(`Webhook signature verification failed (${providerName}):`, verificationResult.error);
      return NextResponse.json(
        { success: false, error: verificationResult.error || 'Invalid signature' },
        { status: 400 }
      );
    }

    const { eventId, paymentReference, eventType } = verificationResult;

    // 3. Idempotency Check: Don't process duplicate webhook deliveries
    const isAlreadyProcessed = await isWebhookEventProcessed(eventId);
    if (isAlreadyProcessed) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        message: 'Webhook event was previously processed.',
      });
    }

    // 4. Process Payment Events (Success vs Failure)
    const isSuccessEvent =
      eventType === 'order.paid' ||
      eventType === 'payment.captured' ||
      eventType === 'payment_intent.succeeded';

    const isFailureEvent =
      eventType === 'payment.failed' ||
      eventType === 'payment_intent.payment_failed' ||
      eventType === 'order.cancelled';

    if (isSuccessEvent && paymentReference) {
      const confirmResult = await confirmContributionPayment({
        paymentReference,
        signature: razorpaySignature || stripeSignature || undefined,
        expectedAmount: verificationResult.amount,
        expectedCurrency: verificationResult.currency,
      });

      if (confirmResult.success && confirmResult.contribution && !confirmResult.alreadyConfirmed) {
        // Broadcast newly confirmed light to all active client globes
        broadcastConfirmedLight(confirmResult.contribution);
      }
    } else if (isFailureEvent && paymentReference) {
      await markContributionFailed(paymentReference, `Payment failure event: ${eventType}`);
    }

    // 5. Mark event as processed in idempotency table
    await markWebhookEventProcessed({
      eventId,
      provider: providerName,
      eventType: eventType || 'unknown',
      paymentReference,
    });

    return NextResponse.json({
      success: true,
      received: true,
      eventId,
    });
  } catch (err: any) {
    console.error('Unhandled error in webhook route:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Webhook processing failed.' },
      { status: 500 }
    );
  }
}
