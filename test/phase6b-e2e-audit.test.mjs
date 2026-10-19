import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import { validateContributionInput } from '../src/lib/validation/contribution.ts';
import { verifyRazorpayWebhook, verifyStripeWebhook } from '../src/lib/payments/verifier.ts';
import {
  createPendingContributionRecord,
  confirmContributionPayment,
  markContributionFailed,
  mapDbRowToPublicMarker,
} from '../src/lib/db/contributions.ts';
import { rankContributors, getWorldLeader } from '../src/utils/ranking.ts';
import { getServiceSupabaseClient } from '../src/lib/db/supabase.ts';

// Safely load .env.local if present
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env.local');
  } catch {}
}

// UUID validation regex (RFC 4122)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// -----------------------------------------------------------------------------
// 1. UUID GENERATION FOR DATABASE COMPLIANCE
// -----------------------------------------------------------------------------
test('UUID Generation — createPendingContributionRecord generates PostgreSQL-compliant UUID', async () => {
  const sampleData = {
    amount: 100,
    currency: 'INR',
    name: 'Audit Contributor',
    lat: 19.0760,
    lng: 72.8777,
    isApproximate: false,
    isAnonymous: false,
    city: 'Mumbai',
    country: 'India',
  };

  const ref = `test_uuid_ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const result = await createPendingContributionRecord({
    data: sampleData,
    paymentProvider: 'razorpay',
    paymentReference: ref,
    isDemo: true,
  });

  assert.equal(result.success, true);
  assert.ok(result.id, 'Record must have an ID');
  assert.match(
    result.id,
    UUID_REGEX,
    `Record ID '${result.id}' must be a valid UUID for PostgreSQL schema compatibility`
  );

  // Clean up if created in Supabase
  const supabase = getServiceSupabaseClient();
  if (supabase) {
    await supabase.from('contributions').delete().eq('id', result.id);
  }
});

// -----------------------------------------------------------------------------
// 2. WEBHOOK SIGNATURE VERIFICATION & TAMPER DETECTION (RAZORPAY)
// -----------------------------------------------------------------------------
test('Razorpay Webhook — Enforces HMAC-SHA256 verification and extracts payment metadata', () => {
  const secret = 'rzp_sec_test_audit_987';
  const payloadObj = {
    event: 'order.paid',
    event_id: 'evt_rzp_unique_001',
    payload: {
      payment: {
        entity: {
          id: 'pay_rzp_998877',
          order_id: 'order_test_445566',
          amount: 50000, // 500.00 INR in paisa
          currency: 'INR',
        },
      },
    },
  };
  const rawBody = JSON.stringify(payloadObj);
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // 1. Valid signature
  const valid = verifyRazorpayWebhook(rawBody, signature, secret);
  assert.equal(valid.isValid, true);
  assert.equal(valid.paymentReference, 'order_test_445566');
  assert.equal(valid.amount, 500);
  assert.equal(valid.currency, 'INR');
  assert.equal(valid.eventId, 'evt_rzp_unique_001');

  // 2. Tampered amount in body
  const tampered = rawBody.replace('50000', '1000');
  const invalidTampered = verifyRazorpayWebhook(tampered, signature, secret);
  assert.equal(invalidTampered.isValid, false);

  // 3. Forged signature
  const forged = verifyRazorpayWebhook(rawBody, 'deadbeef00112233', secret);
  assert.equal(forged.isValid, false);
});

// -----------------------------------------------------------------------------
// 3. STRIPE WEBHOOK TIMESTAMP TOLERANCE & REPLAY PROTECTION
// -----------------------------------------------------------------------------
test('Stripe Webhook — Enforces timestamp freshness tolerance (< 300s) to prevent replay attacks', () => {
  const secret = 'whsec_stripe_test_audit_123';
  const payload = JSON.stringify({
    id: 'evt_stripe_audit_01',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_stripe_audit_99',
        amount: 3500, // 35.00 INR
        currency: 'inr',
      },
    },
  });

  const nowSec = Math.floor(Date.now() / 1000);

  // 1. Fresh timestamp (< 5s old) -> PASS
  const freshHeader = `t=${nowSec},v1=${crypto.createHmac('sha256', secret).update(`${nowSec}.${payload}`).digest('hex')}`;
  const validResult = verifyStripeWebhook(payload, freshHeader, secret);
  assert.equal(validResult.isValid, true);
  assert.equal(validResult.amount, 35);
  assert.equal(validResult.currency, 'INR');

  // 2. Stale timestamp (10 minutes old = 600s) -> REJECT
  const staleTimestamp = nowSec - 600;
  const staleHeader = `t=${staleTimestamp},v1=${crypto.createHmac('sha256', secret).update(`${staleTimestamp}.${payload}`).digest('hex')}`;
  const staleResult = verifyStripeWebhook(payload, staleHeader, secret);
  assert.equal(staleResult.isValid, false);
  assert.match(staleResult.error || '', /outside tolerance/);
});

// -----------------------------------------------------------------------------
// 4. AMOUNT & CURRENCY INTEGRITY CHECK ON PAYMENT CONFIRMATION
// -----------------------------------------------------------------------------
test('Payment Confirmation — Rejects underpayment or currency tampering', async () => {
  const ref = `test_audit_amount_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const sampleData = {
    amount: 500,
    currency: 'INR',
    name: 'Security Test Contributor',
    lat: 12.9716,
    lng: 77.5946,
    isApproximate: false,
    isAnonymous: false,
    city: 'Bengaluru',
    country: 'India',
  };

  const createRes = await createPendingContributionRecord({
    data: sampleData,
    paymentProvider: 'razorpay',
    paymentReference: ref,
    isDemo: true,
  });
  assert.equal(createRes.success, true);

  try {
    // 1. Attempt confirmation with UNDERPAYMENT (e.g. ₹50 instead of ₹500)
    const underpaid = await confirmContributionPayment({
      paymentReference: ref,
      expectedAmount: 50, // Mismatched!
      expectedCurrency: 'INR',
    });
    assert.equal(underpaid.success, false);
    assert.match(underpaid.error || '', /does not match/);

    // 2. Attempt confirmation with MISMATCHED CURRENCY
    const wrongCurrency = await confirmContributionPayment({
      paymentReference: ref,
      expectedAmount: 500,
      expectedCurrency: 'USD', // Mismatched!
    });
    assert.equal(wrongCurrency.success, false);
    assert.match(wrongCurrency.error || '', /currency does not match/);

    // 3. Authentic confirmation with exact amount & currency -> PASS
    const validConfirm = await confirmContributionPayment({
      paymentReference: ref,
      expectedAmount: 500,
      expectedCurrency: 'INR',
      signature: 'test_verified_sig',
    });
    assert.equal(validConfirm.success, true);
    assert.equal(validConfirm.contribution?.amount, 500);

    // 4. Idempotent duplicate re-confirmation -> cleanly returns without error
    const duplicateConfirm = await confirmContributionPayment({
      paymentReference: ref,
      expectedAmount: 500,
      expectedCurrency: 'INR',
    });
    assert.equal(duplicateConfirm.success, true);
    assert.equal(duplicateConfirm.alreadyConfirmed, true);
  } finally {
    const supabase = getServiceSupabaseClient();
    if (supabase && createRes.id) {
      await supabase.from('contributions').delete().eq('id', createRes.id);
    }
  }
});

// -----------------------------------------------------------------------------
// 5. PAYMENT FAILURE TERMINATION
// -----------------------------------------------------------------------------
test('Payment Failure — Failed payment terminates contribution and prevents confirmation', async () => {
  const ref = `test_audit_fail_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const sampleData = {
    amount: 100,
    currency: 'INR',
    name: 'Failure Test Contributor',
    lat: 22.5726,
    lng: 88.3639,
    isApproximate: false,
    isAnonymous: false,
    city: 'Kolkata',
    country: 'India',
  };

  const createRes = await createPendingContributionRecord({
    data: sampleData,
    paymentProvider: 'razorpay',
    paymentReference: ref,
    isDemo: true,
  });

  try {
    // Mark payment as failed (e.g. from payment.failed webhook)
    await markContributionFailed(ref, 'Payment declined by issuer');

    // Attempting to confirm a failed record must be rejected
    const confirmAttempt = await confirmContributionPayment({
      paymentReference: ref,
      expectedAmount: 100,
      expectedCurrency: 'INR',
    });
    assert.equal(confirmAttempt.success, false);
    assert.match(confirmAttempt.error || '', /Cannot confirm contribution in 'failed' status/);
  } finally {
    const supabase = getServiceSupabaseClient();
    if (supabase && createRes.id) {
      await supabase.from('contributions').delete().eq('id', createRes.id);
    }
  }
});

// -----------------------------------------------------------------------------
// 6. PUBLIC DATA FILTERING & PII SANITIZATION
// -----------------------------------------------------------------------------
test('Data Sanitization — Public marker mapping strips all gateway secrets, donor emails, and signatures', () => {
  const rawDatabaseRow = {
    id: 'a8098c1a-f86e-11da-bd1a-00112444be1e',
    amount: '250.00',
    currency: 'INR',
    status: 'confirmed',
    is_anonymous: false,
    contributor_name: 'Dr. Jane Doe',
    message: 'To humanity',
    photo_url: 'https://example.com/avatar.jpg',
    latitude: '34.0522',
    longitude: '-118.2437',
    is_approximate: false,
    city: 'Los Angeles',
    country: 'United States',
    is_demo: false,
    // Sensitive fields that MUST NEVER reach public marker:
    payment_provider: 'stripe',
    payment_reference: 'pi_3MtwBwLkdIwHu7ix28a3tqPa',
    payment_signature: 'whsec_super_secret_sig',
    client_secret: 'pi_3MtwBwLkdIwHu7ix28a3tqPa_secret_x918237',
    donor_email: 'jane.doe.confidential@example.com',
    created_at: '2026-10-19T10:00:00.000Z',
    confirmed_at: '2026-10-19T10:02:00.000Z',
  };

  const publicMarker = mapDbRowToPublicMarker(rawDatabaseRow);

  // Verified safe fields
  assert.equal(publicMarker.id, rawDatabaseRow.id);
  assert.equal(publicMarker.amount, 250);
  assert.equal(publicMarker.name, 'Dr. Jane Doe');
  assert.equal(publicMarker.city, 'Los Angeles');
  assert.equal(publicMarker.country, 'United States');

  // Verify NO sensitive properties exist on the public object
  assert.equal('payment_provider' in publicMarker, false);
  assert.equal('payment_reference' in publicMarker, false);
  assert.equal('payment_signature' in publicMarker, false);
  assert.equal('client_secret' in publicMarker, false);
  assert.equal('donor_email' in publicMarker, false);
});

// -----------------------------------------------------------------------------
// 7. DETERMINISTIC RANKING & WORLD LEADER TAKEOVER
// -----------------------------------------------------------------------------
test('Deterministic Ranking — Strict amount DESC, timestamp ASC tie-breaker, and ID fallback', () => {
  const markers = [
    { id: 'item-2', name: 'User 2', amount: 5000, lat: 0, lng: 0, country: 'India', isAnonymous: false, timestamp: '', createdAt: 2000 },
    { id: 'item-1', name: 'User 1', amount: 5000, lat: 0, lng: 0, country: 'USA', isAnonymous: false, timestamp: '', createdAt: 1000 }, // Wins tie: earlier timestamp
    { id: 'item-3', name: 'User 3', amount: 15000, lat: 0, lng: 0, country: 'Japan', isAnonymous: false, timestamp: '', createdAt: 3000 }, // Overall #1
    { id: 'item-4', name: 'User 4', amount: 5000, lat: 0, lng: 0, country: 'France', isAnonymous: false, timestamp: '', createdAt: 2000 }, // Same amount and timestamp as User 2: breaks by ID
  ];

  const ranked = rankContributors(markers);

  assert.equal(ranked[0].id, 'item-3'); // ₹15,000 -> Rank 1
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[0].isTopContributor, true);

  assert.equal(ranked[1].id, 'item-1'); // ₹5,000, createdAt 1000 -> Rank 2
  assert.equal(ranked[1].rank, 2);

  assert.equal(ranked[2].id, 'item-2'); // ₹5,000, createdAt 2000, 'item-2' < 'item-4' -> Rank 3
  assert.equal(ranked[2].rank, 3);
  assert.equal(ranked[2].isTopContributor, true);

  assert.equal(ranked[3].id, 'item-4'); // Rank 4
  assert.equal(ranked[3].rank, 4);
  assert.equal(ranked[3].isTopContributor, false);

  const leader = getWorldLeader(markers);
  assert.equal(leader?.id, 'item-3');
});
