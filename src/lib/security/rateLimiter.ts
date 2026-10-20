import { NextRequest } from 'next/server';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
  store: 'memory' | 'upstash_redis';
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory sliding window store (per serverless worker / local process)
const memoryStore = new Map<string, RateLimitEntry>();

// Periodic cleanup of expired memory entries to prevent memory leaks
let lastCleanup = Date.now();
function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < 60000) return; // Cleanup at most once per minute
  lastCleanup = now;

  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Extracts the real client IP address safely from standard proxy headers.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  return '127.0.0.1';
}

/**
 * Checks rate limits for a given identifier (e.g. IP + route).
 *
 * Architecture:
 * 1. Primary Distributed Store: If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 *    are present, uses atomic HTTP REST increments across serverless instances.
 * 2. Fallback Store: In-memory sliding window per instance with automatic expiration.
 */
export async function checkRateLimit(
  key: string,
  options: { limit: number; windowSeconds: number }
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = options;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // 1. Check for distributed Upstash Redis configuration (Serverless-Safe Shared Cache)
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      // Execute multi-command pipeline: INCR key, EXPIRE key windowSeconds NX
      const res = await fetch(`${redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', `ratelimit:${key}`],
          ['EXPIRE', `ratelimit:${key}`, windowSeconds, 'NX'],
          ['TTL', `ratelimit:${key}`],
        ]),
      });

      if (res.ok) {
        const results = await res.json();
        const count = results[0]?.result || 1;
        const ttl = results[2]?.result || windowSeconds;
        const resetAt = now + (ttl > 0 ? ttl * 1000 : windowMs);
        const retryAfterSeconds = Math.max(1, ttl);
        const remaining = Math.max(0, limit - count);

        return {
          allowed: count <= limit,
          limit,
          remaining,
          resetAt,
          retryAfterSeconds,
          store: 'upstash_redis',
        };
      }
    } catch (err) {
      console.warn('Distributed rate limit check failed, falling back to in-memory:', err);
    }
  }

  // 2. Fallback: In-memory sliding window
  cleanupExpiredEntries();

  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetAt,
      retryAfterSeconds: windowSeconds,
      store: 'memory',
    };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

  return {
    allowed: entry.count <= limit,
    limit,
    remaining,
    resetAt: entry.resetAt,
    retryAfterSeconds,
    store: 'memory',
  };
}

/**
 * Generates standard rate limit headers for HTTP responses.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };

  if (!result.allowed) {
    headers['Retry-After'] = String(result.retryAfterSeconds);
  }

  return headers;
}
