import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import {
  verifyRazorpayWebhook,
  verifyRazorpayCheckoutSignature,
  verifyStripeWebhook,
} from '../src/lib/payments/verifier.ts';
import {
  createPendingContributionRecord,
  confirmContributionPayment,
  markContributionFailed,
  mapDbRowToPublicMarker,
} from '../src/lib/db/contributions.ts';
import { getServiceSupabaseClient } from '../src/lib/db/supabase.ts';

// Safely load .env.local if present
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env.local');
  } catch {}
}

const mockKeySecret = 'rzp_test_secret_abc123xyz789';
const mockWebhookSecret = 'rzp_whsec_test_secret_456def';

// -----------------------------------------------------------------------------
// 1. RAZORPAY CHECKOUT SIGNATURE: VALIDATION & TAMPER DETECTION
// -----------------------------------------------------------------------------
test('Razorpay Checkout Signature — Validates HMAC-SHA256(order_id|payment_id, secret)', () => {
  const orderId = 'order_test_razorpay_001';
  const paymentId = 'pay_test_razorpay_999';

  const expectedPayload = `${orderId}|${paymentId}`;
  const validSignature = crypto
    .createHmac('sha256', mockKeySecret)
    .update(expectedPayload)
    .digest('hex');

  // 1. Valid signature passes
  const isValid = verifyRazorpayCheckoutSignature(
    orderId,
    paymentId,
    validSignature,
    mockKeySecret
  );
  assert.equal(isValid, true, 'Valid checkout signature must pass verification');

  // 2. Tampered signature fails
  const tamperedSig = validSignature.slice(0, -2) + 'aa';
  assert.equal(
    verifyRazorpayCheckoutSignature(orderId, paymentId, tamperedSig, mockKeySecret),
    false,
    'Tampered signature must fail verification'
  );

  // 3. Mismatched orderId fails
  assert.equal(
    verifyRazorpayCheckoutSignature('order_test_tampered_002', paymentId, validSignature, mockKeySecret),
    false,
    'Mismatched order ID must fail verification'
  );

  // 4. Mismatched paymentId fails
  assert.equal(
    verifyRazorpayCheckoutSignature(orderId, 'pay_test_tampered_888', validSignature, mockKeySecret),
    false,
    'Mismatched payment ID must fail verification'
  );

  // 5. Wrong secret fails
  assert.equal(
    verifyRazorpayCheckoutSignature(orderId, paymentId, validSignature, 'wrong_secret'),
    false,
    'Verification with wrong secret must fail'
  );

  // 6. Missing parameters fail safely without exceptions
  assert.equal(verifyRazorpayCheckoutSignature('', paymentId, validSignature, mockKeySecret), false);
  assert.equal(verifyRazorpayCheckoutSignature(orderId, '', validSignature, mockKeySecret), false);
  assert.equal(verifyRazorpayCheckoutSignature(orderId, paymentId, '', mockKeySecret), false);
});

// -----------------------------------------------------------------------------
// 2. RAZORPAY WEBHOOK: RAW BODY HMAC VERIFICATION & AMOUNT/CURRENCY TAMPERING
// -----------------------------------------------------------------------------
test('Razorpay Webhook — Validates raw payload HMAC, amount, and currency matching', () => {
  const payload = {
    event: 'order.paid',
    event_id: 'evt_rzp_test_101',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_101',
          order_id: 'order_test_101',
          amount: 250000, // 2500.00 INR in paisa
          currency: 'INR',
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', mockWebhookSecret)
    .update(rawBody)
    .digest('hex');

  // 1. Valid webhook passes
  const verified = verifyRazorpayWebhook(rawBody, signature, mockWebhookSecret);
  assert.equal(verified.isValid, true);
  assert.equal(verified.eventId, 'evt_rzp_test_101');
  assert.equal(verified.paymentReference, 'order_test_101');
  assert.equal(verified.amount, 2500);
  assert.equal(verified.currency, 'INR');

  // 2. Altered amount in body invalidates HMAC signature
  const alteredAmountPayload = rawBody.replace('250000', '10000');
  const alteredResult = verifyRazorpayWebhook(alteredAmountPayload, signature, mockWebhookSecret);
  assert.equal(alteredResult.isValid, false, 'Altered payload must invalidate webhook signature');

  // 3. Altered currency in body invalidates HMAC signature
  const alteredCurrencyPayload = rawBody.replace('"INR"', '"USD"');
  const alteredCurrencyResult = verifyRazorpayWebhook(alteredCurrencyPayload, signature, mockWebhookSecret);
  assert.equal(alteredCurrencyResult.isValid, false, 'Altered currency must invalidate webhook signature');
});

// -----------------------------------------------------------------------------
// 3. COMPLETE TEST-MODE CONFIRMATION & PERSISTENCE LIFECYCLE
// -----------------------------------------------------------------------------
test('Razorpay Test-Mode Lifecycle — Pending record -> Verified confirmation -> Idempotent re-check', async () => {
  const orderId = `order_test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const paymentId = `pay_test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const amount = 35; // ₹35

  // Step 1: Create pending record
  const createResult = await createPendingContributionRecord({
    data: {
      amount,
      currency: 'INR',
      name: 'Sandbox Verified User',
      lat: 13.0827,
      lng: 80.2707,
      isApproximate: false,
      isAnonymous: false,
      city: 'Chennai',
      country: 'India',
    },
    paymentProvider: 'razorpay',
    paymentReference: orderId,
    isDemo: true,
  });

  assert.equal(createResult.success, true, 'Pending record creation must succeed');
  const recordId = createResult.id;

  try {
    // Step 2: Confirm with valid signature and matching amount/currency
    const signature = crypto
      .createHmac('sha256', mockKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const confirmResult = await confirmContributionPayment({
      paymentReference: orderId,
      signature,
      expectedAmount: amount,
      expectedCurrency: 'INR',
    });

    assert.equal(confirmResult.success, true, 'Confirmation with valid signature and matching amount must succeed');
    assert.ok(confirmResult.contribution, 'Confirmed contribution object must be returned');
    assert.equal(confirmResult.contribution.amount, amount);
    assert.equal(confirmResult.contribution.name, 'Sandbox Verified User');

    // Step 3: Duplicate webhook delivery / duplicate verification (Idempotency)
    const duplicateResult = await confirmContributionPayment({
      paymentReference: orderId,
      signature,
      expectedAmount: amount,
      expectedCurrency: 'INR',
    });

    assert.equal(duplicateResult.success, true, 'Duplicate confirmation must succeed idempotently');
    assert.equal(duplicateResult.alreadyConfirmed, true, 'Duplicate must report alreadyConfirmed: true');
  } finally {
    // Targeted cleanup
    const supabase = getServiceSupabaseClient();
    if (supabase && recordId) {
      await supabase.from('contributions').delete().eq('id', recordId);
    }
  }
});

// -----------------------------------------------------------------------------
// 4. CANCELLED CHECKOUT & FAILED PAYMENT ISOLATION
// -----------------------------------------------------------------------------
test('Checkout Cancellation & Failure — Records remain unconfirmed and safe', async () => {
  const orderId = `order_test_fail_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const createResult = await createPendingContributionRecord({
    data: {
      amount: 100,
      currency: 'INR',
      name: 'Cancelled Checkout User',
      lat: 28.7041,
      lng: 77.1025,
      isApproximate: false,
      isAnonymous: false,
      city: 'Delhi',
      country: 'India',
    },
    paymentProvider: 'razorpay',
    paymentReference: orderId,
    isDemo: true,
  });

  assert.equal(createResult.success, true);
  const recordId = createResult.id;

  try {
    // 1. User cancels checkout modal (no signature produced):
    // Record in database remains pending, never confirmed.
    const supabase = getServiceSupabaseClient();
    if (supabase) {
      const { data: viewCheck } = await supabase
        .from('public_contributions')
        .select('id')
        .eq('id', recordId);
      assert.equal(
        viewCheck?.length || 0,
        0,
        'Cancelled/unconfirmed contribution must not appear in public view'
      );
    }

    // 2. Razorpay emits payment.failed:
    await markContributionFailed(orderId, 'Payment failed at bank gateway');

    // 3. Attempting to confirm a failed payment is rejected
    const badConfirm = await confirmContributionPayment({
      paymentReference: orderId,
      expectedAmount: 100,
      expectedCurrency: 'INR',
    });
    assert.equal(badConfirm.success, false);
    assert.match(badConfirm.error || '', /Cannot confirm contribution in 'failed' status/);
  } finally {
    const supabase = getServiceSupabaseClient();
    if (supabase && recordId) {
      await supabase.from('contributions').delete().eq('id', recordId);
    }
  }
});

// -----------------------------------------------------------------------------
// 5. SERVER SECRETS ISOLATION & NON-EXPOSURE
// -----------------------------------------------------------------------------
test('Security — Server secrets are never exposed in public markers or outputs', () => {
  const fullDatabaseRecord = {
    id: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
    amount: 1000,
    currency: 'INR',
    status: 'confirmed',
    is_anonymous: false,
    contributor_name: 'Test Contributor',
    message: 'Test message',
    latitude: 10.0,
    longitude: 20.0,
    city: 'Test City',
    country: 'Test Country',
    is_demo: false,
    // Sensitive server-only values:
    payment_provider: 'razorpay',
    payment_reference: 'order_secret_reference_123',
    payment_signature: 'razorpay_cryptographic_signature_value',
    client_secret: 'secret_client_key_value',
    donor_email: 'contributor@private-domain.org',
  };

  const publicData = mapDbRowToPublicMarker(fullDatabaseRecord);

  // Assert sensitive keys are completely absent
  const forbiddenKeys = [
    'payment_provider',
    'payment_reference',
    'payment_signature',
    'client_secret',
    'donor_email',
  ];

  for (const key of forbiddenKeys) {
    assert.equal(
      key in publicData,
      false,
      `Key '${key}' must never be exposed on public contribution objects`
    );
  }
});
