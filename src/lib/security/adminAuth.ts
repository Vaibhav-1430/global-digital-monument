import { NextRequest } from 'next/server';
import crypto from 'crypto';

export interface AdminAuthResult {
  authorized: boolean;
  adminId?: string;
  role?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Validates administrative requests using timing-safe secret comparison.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Never trust client-supplied admin flags or query params.
 * - Extracts secret strictly from `Authorization: Bearer <key>` or `X-Admin-Key: <key>`.
 * - If `ADMIN_API_KEY` is unset or empty, all administrative operations are blocked.
 * - Uses SHA-256 digests with `crypto.timingSafeEqual` to avoid timing side-channels.
 */
export function verifyAdminAuth(req: NextRequest): AdminAuthResult {
  const adminKey = process.env.ADMIN_API_KEY || process.env.ADMIN_SECRET_KEY;

  if (!adminKey || adminKey.trim().length < 16) {
    return {
      authorized: false,
      error: 'Administrator API key is not configured or insufficient in server environment.',
      statusCode: 503,
    };
  }

  // Extract from Authorization header or X-Admin-Key
  const authHeader = req.headers.get('authorization') || '';
  let candidate = '';

  if (authHeader.startsWith('Bearer ')) {
    candidate = authHeader.slice(7).trim();
  } else {
    candidate = (req.headers.get('x-admin-key') || '').trim();
  }

  if (!candidate) {
    return {
      authorized: false,
      error: 'Missing administrator authorization credentials.',
      statusCode: 401,
    };
  }

  try {
    // Constant-time comparison using SHA-256 digest buffers
    const expectedHash = crypto.createHash('sha256').update(adminKey.trim()).digest();
    const candidateHash = crypto.createHash('sha256').update(candidate).digest();

    const isMatch = crypto.timingSafeEqual(expectedHash, candidateHash);

    if (!isMatch) {
      return {
        authorized: false,
        error: 'Invalid administrator credentials.',
        statusCode: 403,
      };
    }

    // Derive safe admin identifier without exposing secret
    const adminIdentifier = `admin_${crypto
      .createHash('sha256')
      .update(adminKey.trim())
      .digest('hex')
      .slice(0, 8)}`;

    return {
      authorized: true,
      adminId: adminIdentifier,
      role: 'superadmin',
    };
  } catch (err: any) {
    console.error('Error during admin auth verification:', err);
    return {
      authorized: false,
      error: 'Internal authorization error.',
      statusCode: 500,
    };
  }
}
