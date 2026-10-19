import { NextRequest, NextResponse } from 'next/server';
import { validateContributionInput } from '@/lib/validation/contribution';
import { createPaymentOrder } from '@/lib/payments/provider';
import { createPendingContributionRecord } from '@/lib/db/contributions';
import { isProductionMode } from '@/config/appMode';

/**
 * POST /api/contributions/create-intent
 *
 * Validates contribution details and initializes payment checkout intent.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Server-side validation
    const validation = validateContributionInput(body);
    if (!validation.isValid || !validation.sanitizedData) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid contribution input.' },
        { status: 400 }
      );
    }

    const contribution = validation.sanitizedData;
    const isProduction = isProductionMode();

    // 2. Demo mode handler
    if (!isProduction) {
      const demoId = `demo-light-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      return NextResponse.json({
        success: true,
        isDemo: true,
        message: 'Contribution intent generated in DEMO mode. No payment will be charged.',
        contribution: {
          id: demoId,
          ...contribution,
          timestamp: 'Just now',
          isDemo: true,
          createdAt: Date.now(),
        },
      });
    }

    // 3. Production mode handler — Initialize real checkout with payment provider
    const donorEmail = typeof body.donorEmail === 'string' ? body.donorEmail.trim() : undefined;
    const paymentIntent = await createPaymentOrder(contribution, donorEmail);

    if (!paymentIntent.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          isConfigured: false,
          error: paymentIntent.message || 'Payment provider is not yet configured in environment.',
        },
        { status: 503 }
      );
    }

    // 4. Create pending contribution in database
    const dbResult = await createPendingContributionRecord({
      data: contribution,
      paymentProvider: paymentIntent.provider,
      paymentReference: paymentIntent.orderId,
      clientSecret: paymentIntent.clientSecret,
      donorEmail,
      isDemo: false,
    });

    if (!dbResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to record pending contribution in database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isDemo: false,
      orderId: paymentIntent.orderId,
      keyId: paymentIntent.keyId,
      clientSecret: paymentIntent.clientSecret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      provider: paymentIntent.provider,
    });
  } catch (err: any) {
    console.error('Error in create-intent route:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
