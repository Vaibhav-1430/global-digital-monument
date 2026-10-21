import { NextRequest, NextResponse } from 'next/server';
import { submitPaymentVerification } from '@/lib/db/contributions';
import { getClientIp, checkRateLimit, getRateLimitHeaders } from '@/lib/security/rateLimiter';
import { sanitizeText } from '@/lib/validation/contribution';

/**
 * POST /api/contributions/submit-verification
 *
 * Receives visitor's "I've Paid" submission with an optional claimed transaction reference / UTR.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - This endpoint ONLY records a verification claim and sets status = 'verification_submitted'.
 * - It NEVER authoritatively verifies payment or activates a light.
 * - Claimed UTR is treated as an untrusted visitor claim for administrative review only.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting (max 10 submissions per 5 minutes per IP)
    const clientIp = getClientIp(req);
    const rateLimit = await checkRateLimit(`submit-verif:${clientIp}`, {
      limit: 10,
      windowSeconds: 300,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many verification attempts. Please wait a few minutes before trying again.',
        },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await req.json();
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const rawRef = typeof body.transactionRef === 'string' ? body.transactionRef : '';

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order reference is required.' },
        { status: 400, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Sanitize claimed transaction reference / UTR (alphanumeric and hyphens, max 60 chars)
    const claimedTransactionRef = sanitizeText(rawRef, 60) || undefined;

    // 2. Submit verification request to database / store
    const result = await submitPaymentVerification({
      paymentReference: orderId,
      claimedTransactionRef,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to submit verification request.' },
        { status: 400, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    return NextResponse.json(
      {
        success: true,
        status: 'verification_submitted',
        orderId,
        claimedTransactionRef,
        message:
          'Payment verification request submitted successfully. It is now awaiting administrative review against bank records.',
      },
      { headers: getRateLimitHeaders(rateLimit) }
    );
  } catch (err: any) {
    console.error('Error in submit-verification route:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
