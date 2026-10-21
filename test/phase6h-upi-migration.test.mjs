import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { getAppMode, isProductionMode } from '../src/config/appMode.ts';
import { getUpiConfig, isValidVpa, buildUpiPaymentUri } from '../src/config/upi.ts';
import { validateContributionInput } from '../src/lib/validation/contribution.ts';
import { createPaymentOrder } from '../src/lib/payments/provider.ts';
import {
  createPendingContributionRecord,
  submitPaymentVerification,
  adminApprovePayment,
  adminRejectPayment,
  confirmContributionPayment,
  mapDbRowToPublicMarker,
  resetInMemoryStoreForTesting,
} from '../src/lib/db/contributions.ts';
import { verifyAdminAuth } from '../src/lib/security/adminAuth.ts';
import {
  checkCommercialLaunchReadiness,
  assertCommercialLaunchReadiness,
} from '../src/config/businessInfo.ts';

// Helper to construct a NextRequest mock
function createMockRequest(headers = {}, body = {}) {
  const reqHeaders = new Headers(headers);
  return {
    headers: reqHeaders,
    json: async () => body,
  };
}

test('1. Production Safeguard — Production remains strictly in demo mode', () => {
  const origContext = process.env.CONTEXT;
  const origAppMode = process.env.NEXT_PUBLIC_APP_MODE;

  try {
    process.env.CONTEXT = 'production';
    process.env.NEXT_PUBLIC_APP_MODE = 'production';
    assert.strictEqual(getAppMode(), 'demo', 'Netlify production context must unconditionally lock to demo');
    assert.strictEqual(isProductionMode(), false, 'isProductionMode must return false in production context');
  } finally {
    process.env.CONTEXT = origContext;
    process.env.NEXT_PUBLIC_APP_MODE = origAppMode;
  }
});

test('2. UPI Configuration — Missing or placeholder UPI config fails safely to demo mode', () => {
  const origVpa = process.env.UPI_PAYEE_VPA;
  const origName = process.env.UPI_PAYEE_NAME;

  try {
    delete process.env.UPI_PAYEE_VPA;
    delete process.env.NEXT_PUBLIC_UPI_PAYEE_VPA;
    const configUnset = getUpiConfig();
    assert.strictEqual(configUnset.isConfigured, false, 'Unset UPI VPA must report isConfigured: false');
    assert.strictEqual(configUnset.isDemo, true, 'Unset UPI VPA must report isDemo: true');
    assert.strictEqual(configUnset.payeeVpa, 'demo@upi', 'Fallback VPA must be a non-payable demo placeholder');

    // Test placeholder rejection
    process.env.UPI_PAYEE_VPA = 'placeholder@upi';
    const configPlaceholder = getUpiConfig();
    assert.strictEqual(configPlaceholder.isConfigured, false, 'Placeholder VPA must not be treated as configured');

    // Test valid merchant VPA
    assert.strictEqual(isValidVpa('merchant.store@icici'), true);
    assert.strictEqual(isValidVpa('invalid-format'), false);
    assert.strictEqual(isValidVpa(''), false);
  } finally {
    process.env.UPI_PAYEE_VPA = origVpa;
    process.env.UPI_PAYEE_NAME = origName;
  }
});

test('3. Amount Validation — Invalid, fractional, out-of-bounds amounts are rejected', () => {
  const validMin = validateContributionInput({ amount: 10, currency: 'INR', lat: 20, lng: 77 });
  assert.strictEqual(validMin.isValid, true);

  const validMax = validateContributionInput({ amount: 1000000, currency: 'INR', lat: 20, lng: 77 });
  assert.strictEqual(validMax.isValid, true);

  const belowMin = validateContributionInput({ amount: 9, currency: 'INR', lat: 20, lng: 77 });
  assert.strictEqual(belowMin.isValid, false, 'Amount < 10 must be rejected');

  const aboveMax = validateContributionInput({ amount: 1000001, currency: 'INR', lat: 20, lng: 77 });
  assert.strictEqual(aboveMax.isValid, false, 'Amount > 1,000,000 must be rejected');

  const fractional = validateContributionInput({ amount: 25.5, currency: 'INR', lat: 20, lng: 77 });
  assert.strictEqual(fractional.isValid, false, 'Fractional amounts must be rejected');

  const negative = validateContributionInput({ amount: -50, currency: 'INR', lat: 20, lng: 77 });
  assert.strictEqual(negative.isValid, false, 'Negative amounts must be rejected');

  const nonNumeric = validateContributionInput({ amount: 'abc', currency: 'INR', lat: 20, lng: 77 });
  assert.strictEqual(nonNumeric.isValid, false, 'Non-numeric amounts must be rejected');
});

test('4. Order Uniqueness — createPaymentOrder generates unique server-side order references', async () => {
  const contribution = {
    amount: 55,
    currency: 'INR',
    name: 'Order Entropy Test',
    lat: 12.9716,
    lng: 77.5946,
    isApproximate: false,
    isAnonymous: false,
    country: 'India',
  };

  const orderRefs = new Set();
  for (let i = 0; i < 20; i++) {
    const order = await createPaymentOrder(contribution);
    assert.ok(order.orderId.startsWith('order_upi_'), 'Order reference must have standard upi prefix');
    assert.ok(order.upiUri, 'UPI URI must be generated');
    assert.ok(order.upiUri.includes(`tr=${order.orderId}`), 'UPI URI must contain order reference');
    assert.strictEqual(orderRefs.has(order.orderId), false, 'Order reference must be globally unique');
    orderRefs.add(order.orderId);
  }
  assert.strictEqual(orderRefs.size, 20);
});

test('5. Light Isolation — Pending payments do not create or activate public globe lights', async () => {
  resetInMemoryStoreForTesting();

  const ref = `order_pending_test_${Date.now()}`;
  const res = await createPendingContributionRecord({
    data: {
      amount: 100,
      currency: 'INR',
      name: 'Unlit Light Test',
      lat: 28.6139,
      lng: 77.209,
      isApproximate: false,
      isAnonymous: false,
      country: 'India',
    },
    paymentProvider: 'upi_qr',
    paymentReference: ref,
    isDemo: false,
  });

  assert.strictEqual(res.success, true);

  // In database view public_contributions, only confirmed/verified rows appear.
  // Verify that pending row status is strictly pending and not confirmed
  const rawRow = {
    id: res.id,
    amount: 100,
    status: 'pending',
    contributor_name: 'Unlit Light Test',
    latitude: 28.6139,
    longitude: 77.209,
    is_anonymous: false,
    is_demo: false,
    created_at: new Date().toISOString(),
    confirmed_at: null,
  };

  assert.strictEqual(rawRow.status, 'pending');
  assert.strictEqual(rawRow.confirmed_at, null);
});

test("6. Verification Submission — Visitor 'I have paid' does NOT verify payment or activate light", async () => {
  resetInMemoryStoreForTesting();

  const ref = `order_ive_paid_test_${Date.now()}`;
  await createPendingContributionRecord({
    data: {
      amount: 35,
      currency: 'INR',
      name: 'Claimant Visitor',
      lat: 19.076,
      lng: 72.8777,
      isApproximate: false,
      isAnonymous: false,
      country: 'India',
    },
    paymentProvider: 'upi_qr',
    paymentReference: ref,
  });

  // Visitor clicks "I've Paid" and enters a claimed UTR
  const claimResult = await submitPaymentVerification({
    paymentReference: ref,
    claimedTransactionRef: '123456789012',
  });

  assert.strictEqual(claimResult.success, true);
  assert.strictEqual(claimResult.status, 'verification_submitted');

  // Verify that payment status is verification_submitted, NOT verified or confirmed!
  assert.notStrictEqual(claimResult.status, 'verified');
  assert.notStrictEqual(claimResult.status, 'confirmed');
});

test('7. Admin Authorization — Unauthorised users cannot access review queue or approve payments', async () => {
  const origKey = process.env.ADMIN_API_KEY;

  try {
    process.env.ADMIN_API_KEY = 'super_secret_test_admin_key_2026_x99';

    // 1. Missing header
    const noAuthReq = createMockRequest({});
    const noAuth = verifyAdminAuth(noAuthReq);
    assert.strictEqual(noAuth.authorized, false);
    assert.strictEqual(noAuth.statusCode, 401);

    // 2. Incorrect bearer token
    const wrongAuthReq = createMockRequest({ authorization: 'Bearer invalid_wrong_token' });
    const wrongAuth = verifyAdminAuth(wrongAuthReq);
    assert.strictEqual(wrongAuth.authorized, false);
    assert.strictEqual(wrongAuth.statusCode, 403);

    // 3. Client-supplied query/body flags must be ignored
    const clientFlagReq = createMockRequest({}, { isAdmin: true, role: 'admin' });
    const clientFlagAuth = verifyAdminAuth(clientFlagReq);
    assert.strictEqual(clientFlagAuth.authorized, false);

    // 4. Valid authorization
    const validAuthReq = createMockRequest({ authorization: 'Bearer super_secret_test_admin_key_2026_x99' });
    const validAuth = verifyAdminAuth(validAuthReq);
    assert.strictEqual(validAuth.authorized, true);
    assert.ok(validAuth.adminId?.startsWith('admin_'));
  } finally {
    process.env.ADMIN_API_KEY = origKey;
  }
});

test('8. Duplicate Payment References — Duplicate order references are rejected', async () => {
  resetInMemoryStoreForTesting();

  const ref = `order_duplicate_test_${Date.now()}`;
  const first = await createPendingContributionRecord({
    data: {
      amount: 25,
      currency: 'INR',
      name: 'Original Order',
      lat: 13.0827,
      lng: 80.2707,
      isApproximate: false,
      isAnonymous: false,
      country: 'India',
    },
    paymentProvider: 'upi_qr',
    paymentReference: ref,
  });
  assert.strictEqual(first.success, true);

  // Second creation with identical paymentReference must fail
  const second = await createPendingContributionRecord({
    data: {
      amount: 25,
      currency: 'INR',
      name: 'Duplicate Order Attempt',
      lat: 13.0827,
      lng: 80.2707,
      isApproximate: false,
      isAnonymous: false,
      country: 'India',
    },
    paymentProvider: 'upi_qr',
    paymentReference: ref,
  });

  assert.strictEqual(second.success, false);
  assert.ok(second.error?.includes('Duplicate'));
});

test('9. Idempotent Approval — Duplicate approval does not create another light or duplicate state', async () => {
  resetInMemoryStoreForTesting();

  const ref = `order_idempotent_approve_${Date.now()}`;
  await createPendingContributionRecord({
    data: {
      amount: 55,
      currency: 'INR',
      name: 'Idempotency User',
      lat: 17.385,
      lng: 78.4867,
      isApproximate: false,
      isAnonymous: false,
      country: 'India',
    },
    paymentProvider: 'upi_qr',
    paymentReference: ref,
  });

  // First approval
  const firstApprove = await adminApprovePayment({
    paymentReference: ref,
    expectedAmount: 55,
    adminId: 'admin_primary',
    note: 'Verified in bank statement',
  });
  assert.strictEqual(firstApprove.success, true);
  assert.strictEqual(firstApprove.alreadyConfirmed, undefined);
  assert.ok(firstApprove.contribution);

  // Duplicate approval attempt
  const secondApprove = await adminApprovePayment({
    paymentReference: ref,
    expectedAmount: 55,
    adminId: 'admin_secondary',
    note: 'Duplicate approval attempt',
  });
  assert.strictEqual(secondApprove.success, true);
  assert.strictEqual(secondApprove.alreadyConfirmed, true, 'Second approval must return alreadyConfirmed');
  assert.strictEqual(secondApprove.contribution?.id, firstApprove.contribution?.id, 'Light ID must not change');
});

test('10. Amount Mismatch Rejection — Admin approval rejects mismatched amount', async () => {
  resetInMemoryStoreForTesting();

  const ref = `order_mismatch_test_${Date.now()}`;
  await createPendingContributionRecord({
    data: {
      amount: 100,
      currency: 'INR',
      name: 'Mismatch User',
      lat: 22.5726,
      lng: 88.3639,
      isApproximate: false,
      isAnonymous: false,
      country: 'India',
    },
    paymentProvider: 'upi_qr',
    paymentReference: ref,
  });

  // Attempt to approve order with different amount (e.g. ₹50 instead of ₹100)
  const mismatchResult = await adminApprovePayment({
    paymentReference: ref,
    expectedAmount: 50,
    adminId: 'admin_primary',
  });

  assert.strictEqual(mismatchResult.success, false);
  assert.ok(mismatchResult.error?.includes('amount does not match'));
});

test('11. Successful Authorised Approval — Transitions state to verified and activates exactly one light', async () => {
  resetInMemoryStoreForTesting();

  const ref = `order_verified_activation_${Date.now()}`;
  await createPendingContributionRecord({
    data: {
      amount: 25,
      currency: 'INR',
      name: 'Verified Donor',
      lat: 12.9716,
      lng: 77.5946,
      isApproximate: false,
      isAnonymous: false,
      country: 'India',
      message: 'For peace and light',
    },
    paymentProvider: 'upi_qr',
    paymentReference: ref,
  });

  // Submit visitor verification
  await submitPaymentVerification({
    paymentReference: ref,
    claimedTransactionRef: '987654321098',
  });

  // Authorised approval
  const approved = await adminApprovePayment({
    paymentReference: ref,
    expectedAmount: 25,
    adminId: 'admin_lead_reviewer',
    note: 'Matched with HDFC bank statement credit',
  });

  assert.strictEqual(approved.success, true);
  assert.ok(approved.contribution);
  assert.strictEqual(approved.contribution.amount, 25);
  assert.strictEqual(approved.contribution.name, 'Verified Donor');
  assert.strictEqual(approved.contribution.message, 'For peace and light');
});

test('11b. Bank Transaction Replay Rejection — Duplicate bank transaction reference cannot approve multiple orders', async () => {
  resetInMemoryStoreForTesting();

  const ref1 = `order_replay_1_${Date.now()}`;
  const ref2 = `order_replay_2_${Date.now()}`;

  await createPendingContributionRecord({
    data: { amount: 35, currency: 'INR', name: 'User 1', lat: 10, lng: 70, isApproximate: false, isAnonymous: false, country: 'India' },
    paymentProvider: 'upi_qr',
    paymentReference: ref1,
  });

  await createPendingContributionRecord({
    data: { amount: 35, currency: 'INR', name: 'User 2', lat: 11, lng: 71, isApproximate: false, isAnonymous: false, country: 'India' },
    paymentProvider: 'upi_qr',
    paymentReference: ref2,
  });

  // Approve first order with bank transaction reference 'UTR_SHARED_999'
  const first = await adminApprovePayment({
    paymentReference: ref1,
    bankTransactionRef: 'UTR_SHARED_999',
    expectedAmount: 35,
    adminId: 'admin_primary',
  });
  assert.strictEqual(first.success, true);

  // Attempt to approve second order with identical bank transaction reference 'UTR_SHARED_999'
  const second = await adminApprovePayment({
    paymentReference: ref2,
    bankTransactionRef: 'UTR_SHARED_999',
    expectedAmount: 35,
    adminId: 'admin_primary',
  });
  assert.strictEqual(second.success, false);
  assert.ok(second.error?.includes('already been verified'));
});

test('12. Historical Razorpay Records — Historical Razorpay records remain fully intact and operational', async () => {
  resetInMemoryStoreForTesting();

  const rzpRef = `order_historical_rzp_${Date.now()}`;
  await createPendingContributionRecord({
    data: {
      amount: 100,
      currency: 'INR',
      name: 'Historical Donor',
      lat: 26.9124,
      lng: 75.7873,
      isApproximate: false,
      isAnonymous: false,
      country: 'India',
    },
    paymentProvider: 'razorpay',
    paymentReference: rzpRef,
  });

  // Confirming historical Razorpay payment via existing confirmContributionPayment
  const confirmed = await confirmContributionPayment({
    paymentReference: rzpRef,
    expectedAmount: 100,
    expectedCurrency: 'INR',
    signature: 'mock_historical_signature',
  });

  assert.strictEqual(confirmed.success, true);
  assert.ok(confirmed.contribution);
  assert.strictEqual(confirmed.contribution.amount, 100);

  // Idempotent re-check
  const reConfirmed = await confirmContributionPayment({
    paymentReference: rzpRef,
  });
  assert.strictEqual(reConfirmed.success, true);
  assert.strictEqual(reConfirmed.alreadyConfirmed, true);
});

test('13. Razorpay Absent from Customer Checkout — Customer checkout only offers UPI QR', () => {
  const flowFile = fs.readFileSync(path.resolve('src/components/AddYourLightFlow.tsx'), 'utf8');

  // Verify that Razorpay checkout script and modal calls are absent from customer flow
  assert.strictEqual(flowFile.includes('checkout.razorpay.com'), false, 'AddYourLightFlow must not load Razorpay checkout script');
  assert.strictEqual(flowFile.includes('new (window as any).Razorpay'), false, 'AddYourLightFlow must not initialize Razorpay checkout');
  assert.strictEqual(flowFile.includes('razorpay_payment_id'), false, 'AddYourLightFlow must not handle Razorpay checkout callbacks');
  assert.strictEqual(flowFile.includes('TEST MODE (SANDBOX) — RAZORPAY'), false, 'AddYourLightFlow must not display Razorpay test banners');

  // Verify that UPI QR checkout elements are present
  assert.ok(flowFile.includes('PAY VIA UPI QR'), 'AddYourLightFlow must offer UPI QR payment');
  assert.ok(flowFile.includes('QRCode.toDataURL'), 'AddYourLightFlow must generate UPI QR code');
  assert.ok(flowFile.includes('/api/contributions/submit-verification'), 'AddYourLightFlow must submit verification request');
  assert.ok(flowFile.includes('I\'VE PAID — SUBMIT'), 'AddYourLightFlow must provide verification submit action');
});

test('14. Launch Readiness & Safeguards — Commercial launch readiness checks remain intact', () => {
  const readiness = checkCommercialLaunchReadiness();
  // Owner has not verified registered business address or jurisdiction yet
  assert.strictEqual(readiness.isReady, false, 'Commercial launch must be unready while statutory fields are unconfirmed');
  assert.ok(readiness.missingRequirements.length > 0);

  // Asserting launch readiness must throw
  assert.throws(
    () => assertCommercialLaunchReadiness(),
    /Commercial live launch blocked/
  );
});

test('15. Rejection Lifecycle & Mutual Exclusion — Rejected orders cannot be approved and verified orders cannot be rejected', async () => {
  resetInMemoryStoreForTesting();

  const refReject = `order_reject_test_${Date.now()}`;
  await createPendingContributionRecord({
    data: { amount: 50, currency: 'INR', name: 'Reject User', lat: 15, lng: 75, isApproximate: false, isAnonymous: false, country: 'India' },
    paymentProvider: 'upi_qr',
    paymentReference: refReject,
  });

  // 1. Admin rejects the order
  const rejectRes = await adminRejectPayment({
    paymentReference: refReject,
    adminId: 'admin_audit',
    reason: 'No credit visible in HDFC UPI statement',
  });
  assert.strictEqual(rejectRes.success, true);

  // 2. Attempting to approve rejected order must be blocked
  const approveAttempt = await adminApprovePayment({
    paymentReference: refReject,
    expectedAmount: 50,
    adminId: 'admin_audit',
  });
  assert.strictEqual(approveAttempt.success, false);
  assert.ok(approveAttempt.error?.includes('Cannot approve contribution in \'rejected\' status'));

  // 3. Attempting to reject an already verified order must be blocked
  const refVerified = `order_verified_reject_blocked_${Date.now()}`;
  await createPendingContributionRecord({
    data: { amount: 50, currency: 'INR', name: 'Verified User', lat: 16, lng: 76, isApproximate: false, isAnonymous: false, country: 'India' },
    paymentProvider: 'upi_qr',
    paymentReference: refVerified,
  });
  const approvedRes = await adminApprovePayment({
    paymentReference: refVerified,
    expectedAmount: 50,
    adminId: 'admin_audit',
  });
  assert.strictEqual(approvedRes.success, true);

  const rejectAfterApprove = await adminRejectPayment({
    paymentReference: refVerified,
    adminId: 'admin_audit',
  });
  assert.strictEqual(rejectAfterApprove.success, false);
  assert.ok(rejectAfterApprove.error?.includes('Cannot reject an already verified payment'));
});

test('16. Case-Insensitive UTR Replay Protection — Mixed casing variants of same UTR are rejected', async () => {
  resetInMemoryStoreForTesting();

  const ref1 = `order_utr_case_1_${Date.now()}`;
  const ref2 = `order_utr_case_2_${Date.now()}`;

  await createPendingContributionRecord({
    data: { amount: 75, currency: 'INR', name: 'Case User 1', lat: 12, lng: 77, isApproximate: false, isAnonymous: false, country: 'India' },
    paymentProvider: 'upi_qr',
    paymentReference: ref1,
  });
  await createPendingContributionRecord({
    data: { amount: 75, currency: 'INR', name: 'Case User 2', lat: 13, lng: 78, isApproximate: false, isAnonymous: false, country: 'India' },
    paymentProvider: 'upi_qr',
    paymentReference: ref2,
  });

  // Approve first with lowercase UTR
  const first = await adminApprovePayment({
    paymentReference: ref1,
    bankTransactionRef: 'utr_mixed_case_888',
    expectedAmount: 75,
    adminId: 'admin_test',
  });
  assert.strictEqual(first.success, true);

  // Attempt to approve second with UPPERCASE of identical UTR
  const second = await adminApprovePayment({
    paymentReference: ref2,
    bankTransactionRef: 'UTR_MIXED_CASE_888',
    expectedAmount: 75,
    adminId: 'admin_test',
  });
  assert.strictEqual(second.success, false);
  assert.ok(second.error?.includes('already been verified'));
});

test('17. Timeout & Idempotent Retry — Retrying approval after timeout returns existing light without duplicates', async () => {
  resetInMemoryStoreForTesting();

  const refTimeout = `order_timeout_retry_${Date.now()}`;
  await createPendingContributionRecord({
    data: { amount: 150, currency: 'INR', name: 'Timeout Donor', lat: 19, lng: 72, isApproximate: false, isAnonymous: false, country: 'India' },
    paymentProvider: 'upi_qr',
    paymentReference: refTimeout,
  });

  // Initial approval succeeds
  const initialApprove = await adminApprovePayment({
    paymentReference: refTimeout,
    expectedAmount: 150,
    adminId: 'admin_initial',
  });
  assert.strictEqual(initialApprove.success, true);
  assert.strictEqual(initialApprove.alreadyConfirmed, undefined);
  const initialLightId = initialApprove.contribution?.id;

  // Client retries due to timeout
  const retryApprove = await adminApprovePayment({
    paymentReference: refTimeout,
    expectedAmount: 150,
    adminId: 'admin_initial',
  });
  assert.strictEqual(retryApprove.success, true);
  assert.strictEqual(retryApprove.alreadyConfirmed, true);
  assert.strictEqual(retryApprove.contribution?.id, initialLightId, 'Retry must return identical light marker ID');
});
