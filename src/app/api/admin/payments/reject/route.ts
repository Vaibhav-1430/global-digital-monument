import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/adminAuth';
import { adminRejectPayment } from '@/lib/db/contributions';

import { getClientIp, checkRateLimit, getRateLimitHeaders } from '@/lib/security/rateLimiter';

/**
 * POST /api/admin/payments/reject
 *
 * Authoritative administrative endpoint to reject an unmatched or invalid payment.
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = await checkRateLimit(`admin-reject:${clientIp}`, {
      limit: 30,
      windowSeconds: 60,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many rejection requests. Please wait a minute.' },
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

    const body = await req.json();
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : 'Payment not found in bank statement';

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order reference is required.' },
        { status: 400, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const rejectResult = await adminRejectPayment({
      paymentReference: orderId,
      adminId: auth.adminId || 'admin_authorized',
      reason,
    });

    if (!rejectResult.success) {
      return NextResponse.json(
        { success: false, error: rejectResult.error || 'Failed to reject payment.' },
        { status: 400 }
      );
    }

    console.log(`[Admin Payment Audit] Order ${orderId} rejected by ${auth.adminId}: ${reason}`);

    return NextResponse.json({
      success: true,
      orderId,
      status: 'rejected',
    });
  } catch (err: any) {
    console.error('Unhandled error in admin payment rejection route:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error during payment rejection.' },
      { status: 500 }
    );
  }
}
