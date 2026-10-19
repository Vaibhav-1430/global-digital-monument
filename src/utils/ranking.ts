import type { LightMarkerData } from '../types';

/**
 * Validates and normalizes an amount to a safe non-negative finite number.
 */
export function sanitizeAmount(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val) && !Number.isNaN(val)) {
    return Math.max(0, val);
  }
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace(/[^0-9.-]+/g, ''));
    if (Number.isFinite(parsed) && !Number.isNaN(parsed)) {
      return Math.max(0, parsed);
    }
  }
  return 0;
}

/**
 * Reusable ranking function for Global Digital Monument contributors.
 *
 * Rules:
 * 1. Rank by contribution amount, highest first.
 * 2. Deterministic tie-breaker:
 *    - Earlier contribution timestamp (using createdAt timestamp or id comparison)
 * 3. Handle missing or invalid amounts safely (defaulting to 0)
 * 4. Assign continuous 1-based ranks and mark top 3 contributors.
 */
export function rankContributors(markers: LightMarkerData[]): LightMarkerData[] {
  if (!Array.isArray(markers) || markers.length === 0) {
    return [];
  }

  const sorted = [...markers].sort((a, b) => {
    const amountA = sanitizeAmount(a.amount);
    const amountB = sanitizeAmount(b.amount);

    // Primary: Contribution amount descending
    if (amountB !== amountA) {
      return amountB - amountA;
    }

    // Secondary deterministic tie-breaker: Earlier contribution timestamp
    const timeA = a.createdAt ?? 0;
    const timeB = b.createdAt ?? 0;
    if (timeA !== timeB && timeA > 0 && timeB > 0) {
      return timeA - timeB; // Earlier timestamp wins tie
    }

    // Tertiary stable deterministic fallback: Stable string comparison on ID
    return (a.id || '').localeCompare(b.id || '');
  });

  return sorted.map((item, index) => ({
    ...item,
    rank: index + 1,
    isTopContributor: index < 3,
  }));
}

/**
 * Returns the #1 ranked contributor or null if none exist.
 */
export function getWorldLeader(markers: LightMarkerData[]): LightMarkerData | null {
  const ranked = rankContributors(markers);
  return ranked.length > 0 ? ranked[0] : null;
}
