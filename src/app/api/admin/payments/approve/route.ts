import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/adminAuth';
import { adminApprovePayment } from '@/lib/db/contributions';
import { broadcastConfirmedLight } from '@/lib/realtime/broadcast';

import { getClientIp, checkRateLimit, getRateLimitHeaders } from '@/lib/security/rateLimiter';

/**
 * POST /api/admin/payments/approve
 *
 * Authoritative administrative endpoint to approve a manual UPI payment.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Requires verified server-side administrator authorization.
 * - Enforces order matching and amount validation.
 * - Prevents duplicate approvals and duplicate light activation.
 * - Activates exactly one light upon first successful approval.
 * - Broadcasts confirmed light to all active client globes via SSE.
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = await checkRateLimit(`admin-approve:${clientIp}`, {
      limit: 30,
      windowSeconds: 60,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many approval requests. Please wait a minute.' },
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
    const expectedAmount = typeof body.expectedAmount === 'number' ? body.expectedAmount : undefined;
    const note = typeof body.note === 'string' ? body.note.trim() : undefined;
    const bankTransactionRef = typeof body.bankTransactionRef === 'string' ? body.bankTransactionRef.trim() : undefined;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order reference is required.' },
        { status: 400, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const approveResult = await adminApprovePayment({
      paymentReference: orderId,
      expectedAmount,
      expectedCurrency: 'INR',
      bankTransactionRef,
      adminId: auth.adminId || 'admin_authorized',
      note,
    });

    if (!approveResult.success || !approveResult.contribution) {
      return NextResponse.json(
        { success: false, error: approveResult.error || 'Failed to approve payment.' },
        { status: 400 }
      );
    }

    // Broadcast newly confirmed light via SSE only if this is a fresh confirmation
    if (!approveResult.alreadyConfirmed) {
      broadcastConfirmedLight(approveResult.contribution);
      console.log(`[Admin Payment Audit] Order ${orderId} approved by ${auth.adminId} for ₹${approveResult.contribution.amount}`);
    }

    return NextResponse.json({
      success: true,
      alreadyConfirmed: approveResult.alreadyConfirmed ?? false,
      contribution: approveResult.contribution,
    });
  } catch (err: any) {
    console.error('Unhandled error in admin payment approval route:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error during payment approval.' },
      { status: 500 }
    );
  }
}
