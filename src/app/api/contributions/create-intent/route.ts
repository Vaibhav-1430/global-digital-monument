import { NextRequest, NextResponse } from 'next/server';
import { validateContributionInput } from '@/lib/validation/contribution';
import { createPaymentOrder } from '@/lib/payments/provider';
import { createPendingContributionRecord } from '@/lib/db/contributions';
import { isProductionMode } from '@/config/appMode';
import {
  checkCommercialLaunchReadiness,
  isCommercialLaunchRequested,
} from '@/config/businessInfo';
import { getClientIp, checkRateLimit, getRateLimitHeaders } from '@/lib/security/rateLimiter';

/**
 * POST /api/contributions/create-intent
 *
 * Validates contribution details and initializes payment checkout intent.
 */
export async function POST(req: NextRequest) {
  try {
    // 0. Abuse Protection & Serverless-Safe Rate Limiting
    const clientIp = getClientIp(req);
    const rateLimit = await checkRateLimit(`intent:${clientIp}`, {
      limit: 15, // Allow max 15 intent creations per 5 minutes per IP
      windowSeconds: 300,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many contribution attempts. Please wait a few minutes before trying again.',
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        }
      );
    }

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
      return NextResponse.json(
        {
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
        },
        { headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // 3. Commercial Launch Safety Check & Production handler
    const commercialReadiness = checkCommercialLaunchReadiness();
    if (isCommercialLaunchRequested() && !commercialReadiness.isReady) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Commercial live checkout is disabled pending owner confirmation of mandatory legal and operator identity details.',
          missingRequirements: commercialReadiness.missingRequirements,
        },
        { status: 403, headers: getRateLimitHeaders(rateLimit) }
      );
    }

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

    return NextResponse.json(
      {
        success: true,
        isDemo: false,
        isCommercialLaunchReady: commercialReadiness.isReady,
        orderId: paymentIntent.orderId,
        keyId: paymentIntent.keyId,
        clientSecret: paymentIntent.clientSecret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        provider: paymentIntent.provider,
      },
      { headers: getRateLimitHeaders(rateLimit) }
    );
  } catch (err: any) {
    console.error('Error in create-intent route:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
