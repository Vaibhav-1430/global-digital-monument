import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/adminAuth';
import { getPendingReviewContributions } from '@/lib/db/contributions';
import { getClientIp, checkRateLimit, getRateLimitHeaders } from '@/lib/security/rateLimiter';

/**
 * GET /api/admin/payments
 *
 * Secure administrative endpoint to inspect orders pending review or verification.
 * Protected by server-side timing-safe admin authentication and rate limiting.
 */
export async function GET(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = await checkRateLimit(`admin-get:${clientIp}`, {
      limit: 60,
      windowSeconds: 60,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many administrative requests. Please slow down.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const auth = verifyAdminAuth(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.statusCode || 401, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const result = await getPendingReviewContributions();
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch review queue.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      adminId: auth.adminId,
      count: result.items.length,
      orders: result.items,
    });
  } catch (err: any) {
    if (err?.digest === 'NEXT_PRERENDER_INTERRUPTED') {
      throw err;
    }
    console.error('Unhandled error in admin payments query:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
