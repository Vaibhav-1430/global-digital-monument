import crypto from 'crypto';
import type { WebhookVerificationResult } from './types';

/**
 * Verifies Razorpay Webhook Signatures using HMAC SHA256 in constant time.
 */
export function verifyRazorpayWebhook(
  rawBody: string,
  signature: string | null,
  secret: string
): WebhookVerificationResult {
  if (!signature || !secret || !rawBody) {
    return { isValid: false, error: 'Missing webhook signature or secret.' };
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return { isValid: false, error: 'Invalid webhook signature.' };
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;
    const orderId = paymentEntity?.order_id || orderEntity?.id;
    const eventId =
      payload.event_id ||
      payload.id ||
      paymentEntity?.id ||
      orderEntity?.id ||
      (orderId ? `rzp-${orderId}` : `rzp-event-${Date.now()}`);
    const rawAmount = paymentEntity?.amount ?? orderEntity?.amount;
    const currency = (paymentEntity?.currency || orderEntity?.currency || 'INR').toUpperCase();

    return {
      isValid: true,
      eventId,
      paymentReference: orderId,
      eventType,
      amount: rawAmount !== undefined ? rawAmount / 100 : undefined,
      currency,
    };
  } catch (err: any) {
    return { isValid: false, error: `Webhook verification failed: ${err.message}` };
  }
}

/**
 * Verifies Stripe Webhook Signatures using HMAC SHA256 in constant time.
 */
export function verifyStripeWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): WebhookVerificationResult {
  if (!signatureHeader || !secret || !rawBody) {
    return { isValid: false, error: 'Missing Stripe signature or secret.' };
  }

  try {
    // Parse Stripe signature header format: "t=1492774577,v1=5257a869e7ecebeda32affa62cd490b136...[,v0=...]"
    const parts = signatureHeader.split(',').reduce((acc: Record<string, string>, item) => {
      const [key, val] = item.split('=');
      if (key && val) acc[key.trim()] = val.trim();
      return acc;
    }, {});

    const timestamp = parts['t'];
    const v1Signature = parts['v1'];

    if (!timestamp || !v1Signature) {
      return { isValid: false, error: 'Malformed Stripe signature header.' };
    }

    // Enforce timestamp freshness (5 minutes tolerance against replay attacks)
    const timestampNum = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    const tolerance = 300;
    if (Number.isNaN(timestampNum) || Math.abs(now - timestampNum) > tolerance) {
      return { isValid: false, error: 'Stripe signature timestamp is outside tolerance.' };
    }

    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    const sigBuffer = Buffer.from(v1Signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return { isValid: false, error: 'Invalid Stripe signature.' };
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id;
    const eventType = event.type;
    const paymentIntent = event.data?.object;
    const paymentReference = paymentIntent?.id;
    const currency = (paymentIntent?.currency || 'INR').toUpperCase();

    return {
      isValid: true,
      eventId,
      paymentReference,
      eventType,
      amount: paymentIntent?.amount ? paymentIntent.amount / 100 : undefined,
      currency,
    };
  } catch (err: any) {
    return { isValid: false, error: `Stripe webhook verification error: ${err.message}` };
  }
}

/**
 * Verifies Razorpay Checkout Payment Signatures returned by the client modal:
 * HMAC_SHA256(order_id + "|" + payment_id, key_secret)
 */
export function verifyRazorpayCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!orderId || !paymentId || !signature || !secret) {
    return false;
  }

  try {
    const payload = `${orderId}|${paymentId}`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
