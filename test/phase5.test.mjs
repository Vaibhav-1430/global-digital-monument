import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

// Import modules to test
import { validateContributionInput, sanitizeText } from '../src/lib/validation/contribution.ts';
import { rankContributors, getWorldLeader, sanitizeAmount } from '../src/utils/ranking.ts';
import { verifyRazorpayWebhook, verifyStripeWebhook } from '../src/lib/payments/verifier.ts';
import { mapDbRowToPublicMarker } from '../src/lib/db/contributions.ts';
import { getAppMode, isProductionMode } from '../src/config/appMode.ts';

// -----------------------------------------------------------------------------
// 1. AMOUNT VALIDATION
// -----------------------------------------------------------------------------
test('Amount Validation — Validates amounts within ₹10 to ₹1,000,000', () => {
  const valid1 = validateContributionInput({ amount: 10, lat: 20, lng: 77 });
  assert.equal(valid1.isValid, true);
  assert.equal(valid1.sanitizedData?.amount, 10);

  const valid2 = validateContributionInput({ amount: 25000, lat: 20, lng: 77 });
  assert.equal(valid2.isValid, true);
  assert.equal(valid2.sanitizedData?.amount, 25000);

  // Reject below ₹10
  const invalidLow = validateContributionInput({ amount: 9, lat: 20, lng: 77 });
  assert.equal(invalidLow.isValid, false);
  assert.match(invalidLow.error || '', /between ₹10 and ₹1,000,000/);

  // Reject negative
  const invalidNeg = validateContributionInput({ amount: -50, lat: 20, lng: 77 });
  assert.equal(invalidNeg.isValid, false);

  // Reject non-integer decimals
  const invalidDec = validateContributionInput({ amount: 25.5, lat: 20, lng: 77 });
  assert.equal(invalidDec.isValid, false);

  // Reject NaN / garbage
  const invalidNaN = validateContributionInput({ amount: 'invalid', lat: 20, lng: 77 });
  assert.equal(invalidNaN.isValid, false);
});

// -----------------------------------------------------------------------------
// 2. LOCATION VALIDATION
// -----------------------------------------------------------------------------
test('Location Validation — Enforces strict latitude & longitude bounds', () => {
  // Valid coordinates
  const valid = validateContributionInput({ amount: 25, lat: 28.6139, lng: 77.2090 });
  assert.equal(valid.isValid, true);
  assert.equal(valid.sanitizedData?.lat, 28.6139);
  assert.equal(valid.sanitizedData?.lng, 77.209);

  // Invalid latitude (> 90)
  const invalidLatHigh = validateContributionInput({ amount: 25, lat: 91.5, lng: 10 });
  assert.equal(invalidLatHigh.isValid, false);
  assert.match(invalidLatHigh.error || '', /Latitude must be a valid number/);

  // Invalid latitude (< -90)
  const invalidLatLow = validateContributionInput({ amount: 25, lat: -95, lng: 10 });
  assert.equal(invalidLatLow.isValid, false);

  // Invalid longitude (> 180)
  const invalidLngHigh = validateContributionInput({ amount: 25, lat: 10, lng: 181 });
  assert.equal(invalidLngHigh.isValid, false);
  assert.match(invalidLngHigh.error || '', /Longitude must be a valid number/);

  // Invalid longitude (< -180)
  const invalidLngLow = validateContributionInput({ amount: 25, lat: 10, lng: -185 });
  assert.equal(invalidLngLow.isValid, false);
});

// -----------------------------------------------------------------------------
// 3. TEXT SANITIZATION & ANONYMOUS PREFERENCES
// -----------------------------------------------------------------------------
test('Text Sanitization — Strips HTML and limits length', () => {
  const dirty = '<script>alert("xss")</script>Hello <b>World</b>';
  const clean = sanitizeText(dirty, 100);
  assert.equal(clean, 'alert("xss")Hello World');

  // Anonymous mode overrides contributor name
  const anon = validateContributionInput({
    amount: 50,
    lat: 10,
    lng: 20,
    name: 'Secret Billionaire',
    isAnonymous: true,
  });
  assert.equal(anon.sanitizedData?.name, 'Anonymous');
  assert.equal(anon.sanitizedData?.isAnonymous, true);
});

// -----------------------------------------------------------------------------
// 4. RANKING & DETERMINISTIC TIE-BREAKING
// -----------------------------------------------------------------------------
test('Ranking — Orders by amount DESC, with earlier timestamp as tie-breaker', () => {
  const list = [
    { id: 'b', name: 'User B', amount: 5000, lat: 0, lng: 0, country: 'India', isAnonymous: false, timestamp: '', createdAt: 2000 },
    { id: 'c', name: 'User C', amount: 10000, lat: 0, lng: 0, country: 'USA', isAnonymous: false, timestamp: '', createdAt: 3000 },
    { id: 'a', name: 'User A', amount: 5000, lat: 0, lng: 0, country: 'Japan', isAnonymous: false, timestamp: '', createdAt: 1000 }, // earlier createdAt wins tie with B
  ];

  const ranked = rankContributors(list);
  assert.equal(ranked[0].id, 'c'); // 10000 -> #1
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].id, 'a'); // 5000 (t=1000) -> #2
  assert.equal(ranked[1].rank, 2);
  assert.equal(ranked[2].id, 'b'); // 5000 (t=2000) -> #3
  assert.equal(ranked[2].rank, 3);

  // World leader helper returns #1
  const leader = getWorldLeader(list);
  assert.equal(leader?.id, 'c');
});

// -----------------------------------------------------------------------------
// 5. WEBHOOK SIGNATURE VERIFICATION (RAZORPAY)
// -----------------------------------------------------------------------------
test('Razorpay Webhook Verification — Validates HMAC SHA-256 and rejects tampering', () => {
  const secret = 'test_webhook_secret_12345';
  const payload = JSON.stringify({
    event: 'order.paid',
    payload: {
      payment: {
        entity: {
          id: 'pay_998877',
          order_id: 'order_112233',
          amount: 250000,
        },
      },
    },
  });

  // Generate authentic HMAC SHA256 signature
  const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // Verify authentic signature passes
  const resultValid = verifyRazorpayWebhook(payload, validSignature, secret);
  assert.equal(resultValid.isValid, true);
  assert.equal(resultValid.paymentReference, 'order_112233');
  assert.equal(resultValid.amount, 2500);

  // Verify tampered payload fails
  const tamperedPayload = payload.replace('order_112233', 'order_HACKED');
  const resultTampered = verifyRazorpayWebhook(tamperedPayload, validSignature, secret);
  assert.equal(resultTampered.isValid, false);

  // Verify wrong secret fails
  const resultWrongSecret = verifyRazorpayWebhook(payload, validSignature, 'wrong_secret');
  assert.equal(resultWrongSecret.isValid, false);
});

// -----------------------------------------------------------------------------
// 6. WEBHOOK SIGNATURE VERIFICATION (STRIPE)
// -----------------------------------------------------------------------------
test('Stripe Webhook Verification — Validates timestamped signature', () => {
  const secret = 'whsec_test_secret_abc';
  const payload = JSON.stringify({
    id: 'evt_stripe_123',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_999',
        amount: 5500,
      },
    },
  });

  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const validV1 = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  const stripeHeader = `t=${timestamp},v1=${validV1}`;

  const resultValid = verifyStripeWebhook(payload, stripeHeader, secret);
  assert.equal(resultValid.isValid, true);
  assert.equal(resultValid.eventId, 'evt_stripe_123');
  assert.equal(resultValid.paymentReference, 'pi_test_999');

  // Reject malformed signature header
  const resultBadHeader = verifyStripeWebhook(payload, 'garbage', secret);
  assert.equal(resultBadHeader.isValid, false);
});

// -----------------------------------------------------------------------------
// 7. PUBLIC DATA FILTERING & SECURITY (NO PAYMENT SECRETS LEAKED)
// -----------------------------------------------------------------------------
test('Public Data Filtering — Strips private transaction references and donor email', () => {
  const dbRow = {
    id: 'contrib-uuid-1234',
    amount: 1500,
    currency: 'INR',
    status: 'confirmed',
    is_anonymous: false,
    contributor_name: 'Jane Doe',
    message: 'For planet Earth',
    latitude: 37.7749,
    longitude: -122.4194,
    is_approximate: false,
    city: 'San Francisco',
    country: 'United States',
    is_demo: false,
    // SENSITIVE FIELDS THAT MUST NEVER LEAK:
    payment_provider: 'stripe',
    payment_reference: 'pi_SECRET_TRANSACTION_12345',
    payment_signature: 'sig_SECRET_HMAC_67890',
    client_secret: 'pi_secret_SECRET_CLIENT_KEY',
    donor_email: 'jane.doe.private@example.com',
    created_at: '2026-10-19T10:00:00Z',
    confirmed_at: '2026-10-19T10:05:00Z',
  };

  const publicMarker = mapDbRowToPublicMarker(dbRow);

  // Assert public properties exist
  assert.equal(publicMarker.id, 'contrib-uuid-1234');
  assert.equal(publicMarker.amount, 1500);
  assert.equal(publicMarker.name, 'Jane Doe');

  // STRICT SECURITY CHECK: Assert sensitive fields do NOT exist on public output
  assert.equal(publicMarker.payment_provider, undefined);
  assert.equal(publicMarker.payment_reference, undefined);
  assert.equal(publicMarker.payment_signature, undefined);
  assert.equal(publicMarker.client_secret, undefined);
  assert.equal(publicMarker.donor_email, undefined);
});

// -----------------------------------------------------------------------------
// 8. DEMO MODE ISOLATION
// -----------------------------------------------------------------------------
test('Demo Mode Isolation — Default app mode is demo and safe', () => {
  const mode = getAppMode();
  // By default without NEXT_PUBLIC_APP_MODE=production, it must safely resolve to demo
  assert.equal(mode, 'demo');
  assert.equal(isProductionMode(), false);
});

// -----------------------------------------------------------------------------
// 9. DEDUPLICATION LOGIC
// -----------------------------------------------------------------------------
test('Deduplication — Prevents duplicate marker IDs in collection', () => {
  const marker1 = { id: 'marker-1', name: 'User 1', amount: 100, lat: 0, lng: 0, country: 'India', isAnonymous: false, timestamp: '' };
  const marker2 = { id: 'marker-1', name: 'User 1 Duplicate', amount: 100, lat: 0, lng: 0, country: 'India', isAnonymous: false, timestamp: '' };

  const ids = new Set();
  const list = [];

  function addWithDedup(m) {
    if (ids.has(m.id)) return;
    ids.add(m.id);
    list.push(m);
  }

  addWithDedup(marker1);
  addWithDedup(marker2); // Duplicate id

  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'marker-1');
});
