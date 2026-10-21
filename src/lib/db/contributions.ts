import { randomUUID } from 'crypto';
import { getServiceSupabaseClient } from './supabase';
import type { SanitizedContribution } from '../validation/contribution';
import type { LightMarkerData } from '../../types';
import { INITIAL_LIGHT_MARKERS } from '../../data/demoData';

// In-memory fallback store for development & demo mode when Supabase is not configured
const inMemoryStore = {
  contributions: new Map<string, any>(),
  processedEvents: new Set<string>(),
};

/**
 * Maps database contribution row to the public LightMarkerData interface.
 * Excludes private payment references, signatures, and donor emails.
 */
export function mapDbRowToPublicMarker(row: any): LightMarkerData {
  return {
    id: row.id,
    name: row.is_anonymous ? 'Anonymous' : (row.contributor_name || 'A Kind Soul'),
    isAnonymous: Boolean(row.is_anonymous),
    amount: Number(row.amount),
    city: row.city || undefined,
    country: row.country || 'Global',
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    message: row.message || undefined,
    timestamp: row.confirmed_at
      ? new Date(row.confirmed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : 'Recently',
    photoUrl: row.photo_url || undefined,
    isDemo: Boolean(row.is_demo),
    isApproximate: Boolean(row.is_approximate),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export interface FetchContributionsResult {
  contributions: LightMarkerData[];
  source: 'database' | 'seed_fallback';
  isDatabaseConnected: boolean;
  isEmpty?: boolean;
  dbError?: string;
}

/**
 * Fetches confirmed public contributions from the database.
 * Returns clear diagnostic metadata (source, connection status)
 * so database errors or missing credentials are never presented as proof of persistence.
 */
export async function fetchPublicContributions(): Promise<FetchContributionsResult> {
  const supabase = getServiceSupabaseClient();

  if (!supabase) {
    return {
      contributions: INITIAL_LIGHT_MARKERS,
      source: 'seed_fallback',
      isDatabaseConnected: false,
      dbError: 'Supabase credentials not configured in environment.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('public_contributions')
      .select('*')
      .order('amount', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database query error on public_contributions:', error.message);
      return {
        contributions: INITIAL_LIGHT_MARKERS,
        source: 'seed_fallback',
        isDatabaseConnected: false,
        dbError: error.message,
      };
    }

    if (!data || data.length === 0) {
      // Database is connected and query succeeded, but 0 confirmed contributions exist yet.
      return {
        contributions: INITIAL_LIGHT_MARKERS,
        source: 'seed_fallback',
        isDatabaseConnected: true,
        isEmpty: true,
      };
    }

    return {
      contributions: data.map(mapDbRowToPublicMarker),
      source: 'database',
      isDatabaseConnected: true,
      isEmpty: false,
    };
  } catch (err: any) {
    console.error('Error fetching public contributions from Supabase:', err);
    return {
      contributions: INITIAL_LIGHT_MARKERS,
      source: 'seed_fallback',
      isDatabaseConnected: false,
      dbError: err?.message || 'Unexpected database query error.',
    };
  }
}

/**
 * Creates a pending contribution record awaiting verified payment webhook confirmation.
 */
export async function createPendingContributionRecord(params: {
  data: SanitizedContribution;
  paymentProvider: string;
  paymentReference: string;
  clientSecret?: string;
  donorEmail?: string;
  isDemo?: boolean;
}): Promise<{ id: string; success: boolean; error?: string }> {
  const supabase = getServiceSupabaseClient();
  const id = randomUUID();

  const record = {
    id,
    amount: params.data.amount,
    currency: params.data.currency,
    status: 'pending',
    is_anonymous: params.data.isAnonymous,
    contributor_name: params.data.name,
    message: params.data.message || null,
    photo_url: params.data.photoUrl || null,
    latitude: params.data.lat,
    longitude: params.data.lng,
    is_approximate: params.data.isApproximate,
    city: params.data.city || null,
    country: params.data.country,
    is_demo: Boolean(params.isDemo),
    payment_provider: params.paymentProvider,
    payment_reference: params.paymentReference,
    client_secret: params.clientSecret || null,
    donor_email: params.donorEmail || null,
    created_at: new Date().toISOString(),
  };

  if (!supabase) {
    // Store in local in-memory store for test/demo mode
    if (inMemoryStore.contributions.has(params.paymentReference)) {
      return { id, success: false, error: 'Duplicate payment reference.' };
    }
    inMemoryStore.contributions.set(params.paymentReference, record);
    return { id, success: true };
  }

  const { error } = await supabase.from('contributions').insert([record]);
  if (error) {
    console.error('Failed to create pending contribution record:', error);
    return { id, success: false, error: error.message };
  }

  return { id, success: true };
}

/**
 * Visitor submits verification claim ("I've Paid").
 * Transitions status from 'pending' to 'verification_submitted'.
 * CRITICAL SAFETY: Never verifies payment or activates a light.
 */
export async function submitPaymentVerification(params: {
  paymentReference: string;
  claimedTransactionRef?: string;
}): Promise<{ success: boolean; status?: string; error?: string }> {
  const supabase = getServiceSupabaseClient();
  const cleanRef = params.claimedTransactionRef?.trim() || null;

  if (!supabase) {
    const record = inMemoryStore.contributions.get(params.paymentReference);
    if (!record) {
      return { success: false, error: 'Order not found for payment reference.' };
    }
    if (record.status === 'confirmed' || record.status === 'verified') {
      return { success: true, status: record.status };
    }
    if (record.status !== 'pending' && record.status !== 'verification_submitted') {
      return { success: false, error: `Cannot submit verification for order in '${record.status}' status.` };
    }
    record.status = 'verification_submitted';
    record.claimed_transaction_ref = cleanRef;
    record.verification_submitted_at = new Date().toISOString();
    return { success: true, status: 'verification_submitted' };
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('contributions')
    .select('id, status')
    .eq('payment_reference', params.paymentReference)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { success: false, error: fetchErr?.message || 'Order not found for payment reference.' };
  }

  if (existing.status === 'confirmed' || existing.status === 'verified') {
    return { success: true, status: existing.status };
  }

  if (existing.status !== 'pending' && existing.status !== 'verification_submitted') {
    return { success: false, error: `Cannot submit verification for order in '${existing.status}' status.` };
  }

  const { error } = await supabase
    .from('contributions')
    .update({
      status: 'verification_submitted',
      claimed_transaction_ref: cleanRef,
      verification_submitted_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, status: 'verification_submitted' };
}

/**
 * Authorised administrative approval of a pending or submitted payment.
 * Requires administrator ID and independently confirmed receipt.
 * Enforces amount matching and prevents duplicate approvals.
 */
export async function adminApprovePayment(params: {
  paymentReference: string;
  expectedAmount?: number;
  expectedCurrency?: string;
  bankTransactionRef?: string;
  adminId: string;
  note?: string;
}): Promise<{ success: boolean; contribution?: LightMarkerData; error?: string; alreadyConfirmed?: boolean }> {
  const supabase = getServiceSupabaseClient();

  if (!supabase) {
    const record = inMemoryStore.contributions.get(params.paymentReference);
    if (!record) {
      return { success: false, error: 'Contribution not found for payment reference.' };
    }
    if (record.status === 'verified' || record.status === 'confirmed') {
      return { success: true, contribution: mapDbRowToPublicMarker(record), alreadyConfirmed: true };
    }
    if (record.status !== 'pending' && record.status !== 'verification_submitted') {
      return { success: false, error: `Cannot approve contribution in '${record.status}' status.` };
    }
    if (params.expectedAmount !== undefined && Math.abs(Number(record.amount) - params.expectedAmount) >= 0.01) {
      return { success: false, error: 'Payment amount does not match recorded contribution.' };
    }
    if (params.expectedCurrency && record.currency?.toUpperCase() !== params.expectedCurrency.toUpperCase()) {
      return { success: false, error: 'Payment currency does not match recorded contribution.' };
    }

    // Replay protection: Prevent the same bank transaction reference from approving multiple orders
    const txnRefToCheck = params.bankTransactionRef?.trim() || record.claimed_transaction_ref?.trim();
    if (txnRefToCheck) {
      for (const [key, other] of inMemoryStore.contributions.entries()) {
        if (
          key !== params.paymentReference &&
          (other.status === 'verified' || other.status === 'confirmed') &&
          other.claimed_transaction_ref &&
          other.claimed_transaction_ref.toLowerCase() === txnRefToCheck.toLowerCase()
        ) {
          return {
            success: false,
            error: `Bank transaction reference '${txnRefToCheck}' has already been verified for another contribution. Replay rejected.`,
          };
        }
      }
    }

    record.status = 'verified';
    record.confirmed_at = new Date().toISOString();
    record.reviewed_by = params.adminId;
    record.reviewed_at = new Date().toISOString();
    record.review_note = params.note || null;
    if (txnRefToCheck) {
      record.claimed_transaction_ref = txnRefToCheck.toUpperCase();
    }
    return { success: true, contribution: mapDbRowToPublicMarker(record) };
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('contributions')
    .select('*')
    .eq('payment_reference', params.paymentReference)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { success: false, error: fetchErr?.message || 'Contribution not found for payment reference.' };
  }

  if (existing.status === 'verified' || existing.status === 'confirmed') {
    return { success: true, contribution: mapDbRowToPublicMarker(existing), alreadyConfirmed: true };
  }

  if (existing.status !== 'pending' && existing.status !== 'verification_submitted') {
    return { success: false, error: `Cannot approve contribution in '${existing.status}' status.` };
  }

  if (params.expectedAmount !== undefined && Math.abs(Number(existing.amount) - params.expectedAmount) >= 0.01) {
    return { success: false, error: 'Payment amount does not match recorded contribution.' };
  }

  if (params.expectedCurrency && existing.currency?.toUpperCase() !== params.expectedCurrency.toUpperCase()) {
    return { success: false, error: 'Payment currency does not match recorded contribution.' };
  }

  // Replay protection: check database for duplicate verified transaction reference
  const rawTxnRef = params.bankTransactionRef?.trim() || existing.claimed_transaction_ref?.trim();
  const txnRefToCheck = rawTxnRef ? rawTxnRef.toUpperCase() : undefined;
  if (txnRefToCheck) {
    const { data: duplicateTxn } = await supabase
      .from('contributions')
      .select('payment_reference')
      .neq('id', existing.id)
      .in('status', ['confirmed', 'verified'])
      .ilike('claimed_transaction_ref', txnRefToCheck)
      .maybeSingle();

    if (duplicateTxn) {
      return {
        success: false,
        error: `Bank transaction reference '${txnRefToCheck}' has already been verified for order ${duplicateTxn.payment_reference}. Replay rejected.`,
      };
    }
  }

  // Atomic conditional update preventing concurrent approval race conditions
  const { data, error } = await supabase
    .from('contributions')
    .update({
      status: 'verified',
      confirmed_at: new Date().toISOString(),
      reviewed_by: params.adminId,
      reviewed_at: new Date().toISOString(),
      review_note: params.note || null,
      claimed_transaction_ref: txnRefToCheck || (existing.claimed_transaction_ref ? existing.claimed_transaction_ref.toUpperCase() : null),
    })
    .eq('id', existing.id)
    .in('status', ['pending', 'verification_submitted'])
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === '23505' || error.message?.includes('idx_contributions_verified_txn_ref')) {
      return {
        success: false,
        error: `Bank transaction reference '${txnRefToCheck}' has already been verified for another contribution. Replay rejected.`,
      };
    }
    return { success: false, error: error.message || 'Update failed' };
  }

  if (!data) {
    // If 0 rows updated, verify if already approved concurrently
    const { data: current } = await supabase
      .from('contributions')
      .select('*')
      .eq('id', existing.id)
      .single();

    if (current && (current.status === 'verified' || current.status === 'confirmed')) {
      return { success: true, contribution: mapDbRowToPublicMarker(current), alreadyConfirmed: true };
    }
    return { success: false, error: 'Payment status changed concurrently.' };
  }

  return { success: true, contribution: mapDbRowToPublicMarker(data) };
}

/**
 * Authorised administrative rejection of an unmatched, invalid, or duplicate payment.
 */
export async function adminRejectPayment(params: {
  paymentReference: string;
  adminId: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceSupabaseClient();

  if (!supabase) {
    const record = inMemoryStore.contributions.get(params.paymentReference);
    if (!record) {
      return { success: false, error: 'Contribution not found for payment reference.' };
    }
    if (record.status === 'verified' || record.status === 'confirmed') {
      return { success: false, error: 'Cannot reject an already verified payment.' };
    }
    record.status = 'rejected';
    record.reviewed_by = params.adminId;
    record.reviewed_at = new Date().toISOString();
    record.review_note = params.reason || null;
    return { success: true };
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('contributions')
    .select('id, status')
    .eq('payment_reference', params.paymentReference)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { success: false, error: fetchErr?.message || 'Contribution not found for payment reference.' };
  }

  if (existing.status === 'verified' || existing.status === 'confirmed') {
    return { success: false, error: 'Cannot reject an already verified payment.' };
  }

  const { error } = await supabase
    .from('contributions')
    .update({
      status: 'rejected',
      reviewed_by: params.adminId,
      reviewed_at: new Date().toISOString(),
      review_note: params.reason || null,
    })
    .eq('id', existing.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export interface ReviewContributionItem {
  id: string;
  paymentReference: string;
  amount: number;
  currency: string;
  status: string;
  contributorName: string;
  isAnonymous: boolean;
  message?: string;
  claimedTransactionRef?: string;
  verificationSubmittedAt?: string;
  createdAt: string;
  isDemo: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

/**
 * Fetches all pending or verification-submitted payments for administrator review.
 */
export async function getPendingReviewContributions(): Promise<{
  success: boolean;
  items: ReviewContributionItem[];
  error?: string;
}> {
  const supabase = getServiceSupabaseClient();

  if (!supabase) {
    const items: ReviewContributionItem[] = Array.from(inMemoryStore.contributions.values())
      .filter((r) => r.status === 'pending' || r.status === 'verification_submitted')
      .map((r) => ({
        id: r.id,
        paymentReference: r.payment_reference,
        amount: Number(r.amount),
        currency: r.currency || 'INR',
        status: r.status,
        contributorName: r.is_anonymous ? 'Anonymous' : (r.contributor_name || 'A Kind Soul'),
        isAnonymous: Boolean(r.is_anonymous),
        message: r.message || undefined,
        claimedTransactionRef: r.claimed_transaction_ref || undefined,
        verificationSubmittedAt: r.verification_submitted_at || undefined,
        createdAt: r.created_at,
        isDemo: Boolean(r.is_demo),
        reviewedBy: r.reviewed_by || undefined,
        reviewedAt: r.reviewed_at || undefined,
        reviewNote: r.review_note || undefined,
      }));
    return { success: true, items };
  }

  const { data, error } = await supabase
    .from('contributions')
    .select('*')
    .in('status', ['pending', 'verification_submitted'])
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, items: [], error: error.message };
  }

  const items: ReviewContributionItem[] = (data || []).map((r) => ({
    id: r.id,
    paymentReference: r.payment_reference,
    amount: Number(r.amount),
    currency: r.currency || 'INR',
    status: r.status,
    contributorName: r.is_anonymous ? 'Anonymous' : (r.contributor_name || 'A Kind Soul'),
    isAnonymous: Boolean(r.is_anonymous),
    message: r.message || undefined,
    claimedTransactionRef: r.claimed_transaction_ref || undefined,
    verificationSubmittedAt: r.verification_submitted_at || undefined,
    createdAt: r.created_at,
    isDemo: Boolean(r.is_demo),
    reviewedBy: r.reviewed_by || undefined,
    reviewedAt: r.reviewed_at || undefined,
    reviewNote: r.review_note || undefined,
  }));

  return { success: true, items };
}

/**
 * Resets in-memory store for isolated unit testing.
 */
export function resetInMemoryStoreForTesting(): void {
  inMemoryStore.contributions.clear();
  inMemoryStore.processedEvents.clear();
}

/**
 * Confirms a pending contribution upon verified payment webhook receipt.
 * Validates amount, currency, and pending status before transitioning to 'confirmed'.
 */
export async function confirmContributionPayment(params: {
  paymentReference: string;
  signature?: string;
  expectedAmount?: number;
  expectedCurrency?: string;
}): Promise<{ success: boolean; contribution?: LightMarkerData; error?: string; alreadyConfirmed?: boolean }> {
  const supabase = getServiceSupabaseClient();

  if (!supabase) {
    // In-memory fallback
    const record = inMemoryStore.contributions.get(params.paymentReference);
    if (!record) {
      return { success: false, error: 'Contribution not found for payment reference.' };
    }
    if (record.status === 'confirmed' || record.status === 'verified') {
      return { success: true, contribution: mapDbRowToPublicMarker(record), alreadyConfirmed: true };
    }
    if (record.status !== 'pending' && record.status !== 'verification_submitted') {
      return { success: false, error: `Cannot confirm contribution in '${record.status}' status.` };
    }
    if (params.expectedAmount !== undefined && Math.abs(Number(record.amount) - params.expectedAmount) >= 0.01) {
      return { success: false, error: 'Payment amount does not match recorded contribution.' };
    }
    if (params.expectedCurrency && record.currency?.toUpperCase() !== params.expectedCurrency.toUpperCase()) {
      return { success: false, error: 'Payment currency does not match recorded contribution.' };
    }
    record.status = 'confirmed';
    record.confirmed_at = new Date().toISOString();
    record.payment_signature = params.signature;
    return { success: true, contribution: mapDbRowToPublicMarker(record) };
  }

  // 1. Fetch current record to verify pending status and amount/currency matching
  const { data: existing, error: fetchErr } = await supabase
    .from('contributions')
    .select('*')
    .eq('payment_reference', params.paymentReference)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { success: false, error: fetchErr?.message || 'Contribution not found for payment reference.' };
  }

  // Idempotency: If already confirmed or verified, return current marker cleanly without error
  if (existing.status === 'confirmed' || existing.status === 'verified') {
    return { success: true, contribution: mapDbRowToPublicMarker(existing), alreadyConfirmed: true };
  }

  // Reject transition if status is not pending or verification_submitted
  if (existing.status !== 'pending' && existing.status !== 'verification_submitted') {
    return { success: false, error: `Cannot confirm contribution in '${existing.status}' status.` };
  }

  // Validate amount matching to prevent underpayment exploitation
  if (params.expectedAmount !== undefined && Math.abs(Number(existing.amount) - params.expectedAmount) >= 0.01) {
    console.error(`Amount mismatch for ${params.paymentReference}: expected ₹${params.expectedAmount}, database has ₹${existing.amount}`);
    return { success: false, error: 'Payment amount does not match recorded contribution.' };
  }

  // Validate currency matching
  if (params.expectedCurrency && existing.currency?.toUpperCase() !== params.expectedCurrency.toUpperCase()) {
    console.error(`Currency mismatch for ${params.paymentReference}: expected ${params.expectedCurrency}, database has ${existing.currency}`);
    return { success: false, error: 'Payment currency does not match recorded contribution.' };
  }

  // 2. Update contribution status to confirmed
  const { data, error } = await supabase
    .from('contributions')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      payment_signature: params.signature || null,
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (error || !data) {
    console.error('Failed to confirm contribution in database:', error);
    return { success: false, error: error?.message || 'Update failed' };
  }

  return { success: true, contribution: mapDbRowToPublicMarker(data) };
}

/**
 * Marks a contribution as failed upon payment failure notification.
 */
export async function markContributionFailed(paymentReference: string, reason?: string): Promise<void> {
  const supabase = getServiceSupabaseClient();
  if (!supabase) {
    const record = inMemoryStore.contributions.get(paymentReference);
    if (record && record.status === 'pending') {
      record.status = 'failed';
      record.failed_reason = reason;
    }
    return;
  }

  await supabase
    .from('contributions')
    .update({
      status: 'failed',
    })
    .eq('payment_reference', paymentReference)
    .eq('status', 'pending');
}

/**
 * Checks whether a webhook event has already been processed (Idempotency).
 */
export async function isWebhookEventProcessed(eventId: string): Promise<boolean> {
  const supabase = getServiceSupabaseClient();
  if (!supabase) {
    return inMemoryStore.processedEvents.has(eventId);
  }

  const { data } = await supabase
    .from('processed_webhook_events')
    .select('event_id')
    .eq('event_id', eventId)
    .single();

  return !!data;
}

/**
 * Records a processed webhook event to ensure duplicate delivery idempotency.
 */
export async function markWebhookEventProcessed(params: {
  eventId: string;
  provider: string;
  eventType: string;
  paymentReference?: string;
  payloadHash?: string;
}): Promise<void> {
  const supabase = getServiceSupabaseClient();
  if (!supabase) {
    inMemoryStore.processedEvents.add(params.eventId);
    return;
  }

  await supabase.from('processed_webhook_events').insert([
    {
      event_id: params.eventId,
      provider: params.provider,
      event_type: params.eventType,
      payment_reference: params.paymentReference || null,
      payload_hash: params.payloadHash || null,
      processed_at: new Date().toISOString(),
    },
  ]);
}
