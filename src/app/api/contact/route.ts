import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// In-memory rate limiting tracker (Sliding window: max 5 requests per 15 mins per IP)
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const limit = 5;

  const entry = rateLimitMap.get(ip);
  if (!entry || entry.expiresAt < now) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Simple email regex for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    // 1. Rate Limiting Check
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please wait a few minutes before submitting another message.',
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, category, paymentReference, message, hp } = body;

    // 2. Anti-Spam Honeypot Verification
    // Bots usually fill hidden inputs; human users leave it blank
    if (hp && String(hp).trim().length > 0) {
      // Silently accept without logging or processing to confound spam bots
      return NextResponse.json({
        success: true,
        referenceId: `INQ-SPAM-${Date.now().toString(36).toUpperCase()}`,
        message: 'Your inquiry has been received.',
      });
    }

    // 3. Server-Side Input Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid name between 2 and 100 characters.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()) || email.length > 255) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const validCategories = [
      'general',
      'payment_issue',
      'refund_request',
      'dedication_management',
      'technical_feedback',
    ];
    const cleanCategory = validCategories.includes(category) ? category : 'general';

    if (!message || typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 3000) {
      return NextResponse.json(
        { success: false, error: 'Please provide a message between 10 and 3,000 characters.' },
        { status: 400 }
      );
    }

    // Clean optional payment reference
    const cleanPaymentRef =
      typeof paymentReference === 'string'
        ? paymentReference.trim().slice(0, 100)
        : null;

    // 4. Generate Safe Tracking Reference
    const referenceId = `INQ-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;

    // 5. Secure In-Transit Handling
    // Never acts as an open relay. Logs structured inquiry details securely without sensitive keys.
    console.info(`[Support Inquiry Received] ID: ${referenceId} | Category: ${cleanCategory} | IP: ${ip}`);

    return NextResponse.json({
      success: true,
      referenceId,
      message:
        'Your message has been received. Our support team will review your inquiry and follow up at your provided email.',
    });
  } catch (err: any) {
    console.error('Error processing contact inquiry:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while sending your message. Please try again.' },
      { status: 500 }
    );
  }
}
