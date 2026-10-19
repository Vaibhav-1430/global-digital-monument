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
    if (record.status === 'confirmed') {
      return { success: true, contribution: mapDbRowToPublicMarker(record), alreadyConfirmed: true };
    }
    if (record.status !== 'pending') {
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

  // Idempotency: If already confirmed, return current marker cleanly without error
  if (existing.status === 'confirmed') {
    return { success: true, contribution: mapDbRowToPublicMarker(existing), alreadyConfirmed: true };
  }

  // Reject transition if status is not pending (e.g. failed or cancelled)
  if (existing.status !== 'pending') {
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
