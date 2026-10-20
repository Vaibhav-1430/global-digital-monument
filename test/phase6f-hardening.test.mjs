import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import {
  getClientIp,
  checkRateLimit,
  getRateLimitHeaders,
} from '../src/lib/security/rateLimiter.ts';
import {
  verifyRazorpayWebhook,
  verifyRazorpayCheckoutSignature,
} from '../src/lib/payments/verifier.ts';
import {
  createPendingContributionRecord,
  confirmContributionPayment,
  markContributionFailed,
} from '../src/lib/db/contributions.ts';
import { createPaymentOrder } from '../src/lib/payments/provider.ts';
import { getServiceSupabaseClient } from '../src/lib/db/supabase.ts';
import { getAppMode, isProductionMode } from '../src/config/appMode.ts';

// Safely load .env.local if present
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env.local');
  } catch {}
}

const mockKeySecret = 'rzp_test_secret_hardening_001';
const mockWebhookSecret = 'rzp_whsec_test_hardening_002';

// -----------------------------------------------------------------------------
// 1. RATE LIMITER & CLIENT IP EXTRACTION
// -----------------------------------------------------------------------------
test('Rate Limiter — Enforces threshold, returns correct headers, and extracts IP safely', async () => {
  // Test 1: getClientIp extracts correctly across different header conventions
  const mockReqForwarded = {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.195, 70.41.3.18' }),
  };
  assert.equal(getClientIp(mockReqForwarded), '203.0.113.195');

  const mockReqRealIp = {
    headers: new Headers({ 'x-real-ip': '198.51.100.42' }),
  };
  assert.equal(getClientIp(mockReqRealIp), '198.51.100.42');

  const mockReqCloudflare = {
    headers: new Headers({ 'cf-connecting-ip': '192.0.2.1' }),
  };
  assert.equal(getClientIp(mockReqCloudflare), '192.0.2.1');

  const mockReqFallback = {
    headers: new Headers({}),
  };
  assert.equal(getClientIp(mockReqFallback), '127.0.0.1');

  // Test 2: In-memory sliding window enforces threshold
  const testKey = `test-ip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const limit = 3;
  const windowSeconds = 60;

  // Requests 1, 2, 3 should be allowed
  const r1 = await checkRateLimit(testKey, { limit, windowSeconds });
  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 2);

  const r2 = await checkRateLimit(testKey, { limit, windowSeconds });
  assert.equal(r2.allowed, true);
  assert.equal(r2.remaining, 1);

  const r3 = await checkRateLimit(testKey, { limit, windowSeconds });
  assert.equal(r3.allowed, true);
  assert.equal(r3.remaining, 0);

  // Request 4 must be blocked
  const r4 = await checkRateLimit(testKey, { limit, windowSeconds });
  assert.equal(r4.allowed, false, 'Fourth request must be blocked when limit is 3');
  assert.equal(r4.remaining, 0);
  assert.ok(r4.retryAfterSeconds > 0, 'Retry-After must be greater than 0');

  // Test 3: Standard rate limit headers
  const headers = getRateLimitHeaders(r4);
  assert.equal(headers['X-RateLimit-Limit'], '3');
  assert.equal(headers['X-RateLimit-Remaining'], '0');
  assert.ok(headers['Retry-After']);
  assert.ok(headers['X-RateLimit-Reset']);
});

// -----------------------------------------------------------------------------
// 2. WEBHOOK EDGE CASES: MALFORMED SIGNATURES & PAYLOADS
// -----------------------------------------------------------------------------
test('Webhook Cryptography — Handles malformed payloads and signatures safely', () => {
  const validPayload = JSON.stringify({
    event: 'order.paid',
    payload: {
      order: {
        entity: {
          id: 'order_harden_001',
          amount: 50000,
          currency: 'INR',
        },
      },
    },
  });

  const validSig = crypto
    .createHmac('sha256', mockWebhookSecret)
    .update(validPayload)
    .digest('hex');

  // Case 1: Empty or null signature
  assert.equal(verifyRazorpayWebhook(validPayload, null, mockWebhookSecret).isValid, false);
  assert.equal(verifyRazorpayWebhook(validPayload, '', mockWebhookSecret).isValid, false);

  // Case 2: Wrong length signature (prevents timing attacks safely)
  assert.equal(verifyRazorpayWebhook(validPayload, 'short_sig', mockWebhookSecret).isValid, false);

  // Case 3: Completely invalid / malformed JSON body
  const malformedJson = '{ "event": "order.paid", invalid json content';
  const sigForMalformed = crypto
    .createHmac('sha256', mockWebhookSecret)
    .update(malformedJson)
    .digest('hex');
  const malformedResult = verifyRazorpayWebhook(malformedJson, sigForMalformed, mockWebhookSecret);
  assert.equal(malformedResult.isValid, false);
  assert.match(malformedResult.error || '', /Webhook verification failed/);

  // Case 4: Checkout signature with missing params
  assert.equal(verifyRazorpayCheckoutSignature('', 'pay_123', validSig, mockKeySecret), false);
  assert.equal(verifyRazorpayCheckoutSignature('order_123', '', validSig, mockKeySecret), false);
  assert.equal(verifyRazorpayCheckoutSignature('order_123', 'pay_123', '', mockKeySecret), false);
});

// -----------------------------------------------------------------------------
// 3. AMOUNT & CURRENCY MISMATCH TOLERANCE
// -----------------------------------------------------------------------------
test('Amount & Currency Verification — Rejects underpayment, overpayment, and currency tampering', async () => {
  const orderId = `order_harden_amt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const recordedAmount = 500; // ₹500

  const createResult = await createPendingContributionRecord({
    data: {
      amount: recordedAmount,
      currency: 'INR',
      name: 'Tamper Test User',
      lat: 19.0760,
      lng: 72.8777,
      isApproximate: false,
      isAnonymous: false,
      city: 'Mumbai',
      country: 'India',
    },
    paymentProvider: 'razorpay',
    paymentReference: orderId,
    isDemo: true,
  });

  assert.equal(createResult.success, true);
  const recordId = createResult.id;

  try {
    // Underpayment: Gateway claims ₹499.00
    const underpayResult = await confirmContributionPayment({
      paymentReference: orderId,
      expectedAmount: 499.00,
      expectedCurrency: 'INR',
    });
    assert.equal(underpayResult.success, false);
    assert.match(underpayResult.error || '', /Payment amount does not match recorded contribution/);

    // Minor fractional discrepancy: ₹500 vs ₹500.05 (beyond ₹0.01 tolerance)
    const fractionalMismatch = await confirmContributionPayment({
      paymentReference: orderId,
      expectedAmount: 500.05,
      expectedCurrency: 'INR',
    });
    assert.equal(fractionalMismatch.success, false);
    assert.match(fractionalMismatch.error || '', /Payment amount does not match recorded contribution/);

    // Currency mismatch: expected USD when recorded as INR
    const currencyMismatch = await confirmContributionPayment({
      paymentReference: orderId,
      expectedAmount: 500,
      expectedCurrency: 'USD',
    });
    assert.equal(currencyMismatch.success, false);
    assert.match(currencyMismatch.error || '', /Payment currency does not match recorded contribution/);
  } finally {
    const supabase = getServiceSupabaseClient();
    if (supabase && recordId) {
      await supabase.from('contributions').delete().eq('id', recordId);
    }
  }
});

// -----------------------------------------------------------------------------
// 4. OUT-OF-ORDER EVENT DEFENSE: CONFIRMED CANNOT BE MARKED FAILED
// -----------------------------------------------------------------------------
test('Out-of-Order Safety — markContributionFailed cannot overwrite an already confirmed record', async () => {
  const orderId = `order_harden_ooo_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const amount = 50;

  const createResult = await createPendingContributionRecord({
    data: {
      amount,
      currency: 'INR',
      name: 'Race Safety User',
      lat: 22.5726,
      lng: 88.3639,
      isApproximate: false,
      isAnonymous: false,
      city: 'Kolkata',
      country: 'India',
    },
    paymentProvider: 'razorpay',
    paymentReference: orderId,
    isDemo: true,
  });

  assert.equal(createResult.success, true);
  const recordId = createResult.id;

  try {
    // Confirm the record first (e.g. from fast client verify-checkout)
    const confirmResult = await confirmContributionPayment({
      paymentReference: orderId,
      expectedAmount: amount,
      expectedCurrency: 'INR',
    });
    assert.equal(confirmResult.success, true);

    // Delayed payment.failed webhook arrives afterwards:
    // markContributionFailed uses .eq('status', 'pending') so it cannot touch confirmed rows
    await markContributionFailed(orderId, 'Delayed late bank failure event');

    // Verify record in database is STILL 'confirmed'
    const supabase = getServiceSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from('contributions')
        .select('status')
        .eq('id', recordId)
        .single();

      assert.equal(
        data?.status,
        'confirmed',
        'Record status must remain confirmed despite delayed failure webhook'
      );
    }
  } finally {
    const supabase = getServiceSupabaseClient();
    if (supabase && recordId) {
      await supabase.from('contributions').delete().eq('id', recordId);
    }
  }
});

// -----------------------------------------------------------------------------
// 5. RAZORPAY LIVE MODE BLOCK TEST
// -----------------------------------------------------------------------------
test('Live Mode Safety Guard — createPaymentOrder strictly rejects Razorpay Live credentials', async () => {
  const originalKeyId = process.env.RAZORPAY_KEY_ID;
  const originalKeySecret = process.env.RAZORPAY_KEY_SECRET;
  const originalWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  try {
    // Temporarily mock live credentials
    process.env.RAZORPAY_KEY_ID = 'rzp_live_fakeLiveMerchantKey999';
    process.env.RAZORPAY_KEY_SECRET = 'fakeLiveSecretKey123';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'fakeWebhookSecret456';

    await assert.rejects(
      async () => {
        await createPaymentOrder({
          amount: 100,
          currency: 'INR',
          name: 'Live Mode Attempt',
          lat: 10,
          lng: 20,
          isApproximate: false,
          isAnonymous: false,
        });
      },
      (err) => {
        assert.match(err.message, /Razorpay Live Mode is strictly disabled/);
        return true;
      },
      'Must reject Razorpay Live credentials with clear error'
    );
  } finally {
    // Restore original test environment
    process.env.RAZORPAY_KEY_ID = originalKeyId;
    process.env.RAZORPAY_KEY_SECRET = originalKeySecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = originalWebhookSecret;
  }
});

// -----------------------------------------------------------------------------
// 6. NETLIFY PRODUCTION CONTEXT & DEPLOY PREVIEW ISOLATION TESTS
// -----------------------------------------------------------------------------
test('Netlify Context Isolation — Enforces demo mode unconditionally in production context', () => {
  const origContext = process.env.CONTEXT;
  const origNetlifyContext = process.env.NEXT_PUBLIC_NETLIFY_CONTEXT;
  const origAppMode = process.env.NEXT_PUBLIC_APP_MODE;

  try {
    // Case 1: Netlify production context forces 'demo' even if NEXT_PUBLIC_APP_MODE='production'
    process.env.CONTEXT = 'production';
    process.env.NEXT_PUBLIC_APP_MODE = 'production';
    assert.equal(getAppMode(), 'demo', 'Netlify CONTEXT="production" must override NEXT_PUBLIC_APP_MODE and force demo mode');
    assert.equal(isProductionMode(), false);

    // Case 2: Build-time inlined NEXT_PUBLIC_NETLIFY_CONTEXT forces 'demo'
    delete process.env.CONTEXT;
    process.env.NEXT_PUBLIC_NETLIFY_CONTEXT = 'production';
    process.env.NEXT_PUBLIC_APP_MODE = 'production';
    assert.equal(getAppMode(), 'demo', 'NEXT_PUBLIC_NETLIFY_CONTEXT="production" must force demo mode');

    // Case 3: Deploy Preview permits 'production' sandbox testing when configured
    process.env.CONTEXT = 'deploy-preview';
    delete process.env.NEXT_PUBLIC_NETLIFY_CONTEXT;
    process.env.NEXT_PUBLIC_APP_MODE = 'production';
    assert.equal(getAppMode(), 'production', 'Deploy preview context should permit sandbox test mode');
    assert.equal(isProductionMode(), true);

    // Case 4: Default fallback is always 'demo'
    delete process.env.CONTEXT;
    delete process.env.NEXT_PUBLIC_NETLIFY_CONTEXT;
    delete process.env.NEXT_PUBLIC_APP_MODE;
    assert.equal(getAppMode(), 'demo', 'Unconfigured environment must default safely to demo mode');
    assert.equal(isProductionMode(), false);
  } finally {
    process.env.CONTEXT = origContext;
    process.env.NEXT_PUBLIC_NETLIFY_CONTEXT = origNetlifyContext;
    process.env.NEXT_PUBLIC_APP_MODE = origAppMode;
  }
});

