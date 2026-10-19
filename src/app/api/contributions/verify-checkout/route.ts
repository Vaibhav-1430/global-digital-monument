import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpayCheckoutSignature } from '@/lib/payments/verifier';
import { confirmContributionPayment } from '@/lib/db/contributions';
import { broadcastConfirmedLight } from '@/lib/realtime/broadcast';

/**
 * POST /api/contributions/verify-checkout
 *
 * Server-side cryptographic verification of Razorpay checkout callback signatures.
 * Treats browser callbacks as strictly untrusted until validated against RAZORPAY_KEY_SECRET.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, paymentId, signature } = body;

    // 1. Validate payload fields
    if (
      typeof orderId !== 'string' ||
      typeof paymentId !== 'string' ||
      typeof signature !== 'string' ||
      !orderId.trim() ||
      !paymentId.trim() ||
      !signature.trim()
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing or malformed checkout verification parameters.' },
        { status: 400 }
      );
    }

    // 2. Ensure server secret is configured
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json(
        { success: false, error: 'Payment gateway secret not configured in server environment.' },
        { status: 503 }
      );
    }

    // 3. Cryptographically verify signature in constant time
    const isValidSignature = verifyRazorpayCheckoutSignature(
      orderId.trim(),
      paymentId.trim(),
      signature.trim(),
      keySecret
    );

    if (!isValidSignature) {
      console.warn(`Untrusted checkout callback rejected: invalid signature for order ${orderId}`);
      return NextResponse.json(
        { success: false, error: 'Invalid checkout payment signature.' },
        { status: 400 }
      );
    }

    // 4. Authoritatively transition pending contribution to confirmed in database
    const confirmResult = await confirmContributionPayment({
      paymentReference: orderId.trim(),
      signature: signature.trim(),
    });

    if (!confirmResult.success || !confirmResult.contribution) {
      return NextResponse.json(
        { success: false, error: confirmResult.error || 'Failed to confirm contribution record.' },
        { status: 400 }
      );
    }

    // 5. Broadcast newly confirmed light via real-time stream if not already broadcast
    if (!confirmResult.alreadyConfirmed) {
      broadcastConfirmedLight(confirmResult.contribution);
    }

    return NextResponse.json({
      success: true,
      contribution: confirmResult.contribution,
    });
  } catch (err: any) {
    console.error('Unhandled error in verify-checkout route:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error during checkout verification.' },
      { status: 500 }
    );
  }
}
