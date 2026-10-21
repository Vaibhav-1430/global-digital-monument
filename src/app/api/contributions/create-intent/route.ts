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
    const donorEmail = typeof body.donorEmail === 'string' ? body.donorEmail.trim() : undefined;

    // 2. Commercial Launch Safety Check for Production Mode
    if (isProduction && isCommercialLaunchRequested()) {
      const commercialReadiness = checkCommercialLaunchReadiness();
      if (!commercialReadiness.isReady) {
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
    }

    // 3. Create payment order intent
    const paymentIntent = await createPaymentOrder(contribution, donorEmail);

    // If Razorpay/Stripe was selected and secrets are missing, return 503
    if (!paymentIntent.isConfigured && paymentIntent.provider !== 'upi_qr') {
      return NextResponse.json(
        {
          success: false,
          isConfigured: false,
          error: paymentIntent.message || 'Payment provider is not yet configured in environment.',
        },
        { status: 503 }
      );
    }

    // 4. Create pending contribution record in database (or in-memory store)
    const dbResult = await createPendingContributionRecord({
      data: contribution,
      paymentProvider: paymentIntent.provider,
      paymentReference: paymentIntent.orderId,
      clientSecret: paymentIntent.clientSecret,
      donorEmail,
      isDemo: !isProduction,
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
        isDemo: !isProduction,
        orderId: paymentIntent.orderId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        provider: paymentIntent.provider,
        payeeVpa: paymentIntent.payeeVpa,
        payeeName: paymentIntent.payeeName,
        upiUri: paymentIntent.upiUri,
        isConfigured: paymentIntent.isConfigured,
        verificationNotice:
          paymentIntent.verificationNotice ||
          'Manual verification required. Your light will be activated on the globe after administrative verification.',
        keyId: paymentIntent.keyId,
        clientSecret: paymentIntent.clientSecret,
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
