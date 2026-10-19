/**
 * Global Digital Monument — Server-side Input Validation & Sanitization
 */

export interface RawContributionInput {
  amount?: unknown;
  currency?: unknown;
  name?: unknown;
  message?: unknown;
  lat?: unknown;
  lng?: unknown;
  isApproximate?: unknown;
  isAnonymous?: unknown;
  city?: unknown;
  country?: unknown;
  photoUrl?: unknown;
}

export interface SanitizedContribution {
  amount: number;
  currency: string;
  name: string;
  message?: string;
  lat: number;
  lng: number;
  isApproximate: boolean;
  isAnonymous: boolean;
  city?: string;
  country: string;
  photoUrl?: string;
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedData?: SanitizedContribution;
  error?: string;
}

/**
 * Strips HTML tags and harmful characters from user-submitted text.
 */
export function sanitizeText(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  // Strip HTML tags & control characters
  const clean = input
    .replace(/<[^>]*>?/gm, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
  return clean.slice(0, maxLength);
}

/**
 * Validates and sanitizes all contribution inputs on the server.
 */
export function validateContributionInput(raw: RawContributionInput): ValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { isValid: false, error: 'Invalid contribution request payload.' };
  }

  // 1. Amount validation (Strict positive number in INR, min ₹10, max ₹1,000,000)
  const amountNum = typeof raw.amount === 'number' ? raw.amount : parseFloat(String(raw.amount || ''));
  if (
    !Number.isFinite(amountNum) ||
    Number.isNaN(amountNum) ||
    amountNum < 10 ||
    amountNum > 1000000 ||
    !Number.isInteger(amountNum)
  ) {
    return {
      isValid: false,
      error: 'Contribution amount must be an integer between ₹10 and ₹1,000,000.',
    };
  }

  // 2. Currency validation
  const currencyStr = typeof raw.currency === 'string' ? raw.currency.toUpperCase() : 'INR';
  if (currencyStr !== 'INR') {
    return { isValid: false, error: 'Only INR currency is currently accepted.' };
  }

  // 3. Geographic Coordinates validation (-90 <= lat <= 90, -180 <= lng <= 180)
  const latNum = typeof raw.lat === 'number' ? raw.lat : parseFloat(String(raw.lat || ''));
  const lngNum = typeof raw.lng === 'number' ? raw.lng : parseFloat(String(raw.lng || ''));

  if (!Number.isFinite(latNum) || Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
    return { isValid: false, error: 'Latitude must be a valid number between -90 and +90 degrees.' };
  }
  if (!Number.isFinite(lngNum) || Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    return { isValid: false, error: 'Longitude must be a valid number between -180 and +180 degrees.' };
  }

  // 4. Contributor preferences
  const isAnonymous = Boolean(raw.isAnonymous);
  const rawName = sanitizeText(raw.name, 60);
  const name = isAnonymous ? 'Anonymous' : (rawName || 'A Kind Soul');

  // 5. Dedication message
  const rawMessage = sanitizeText(raw.message, 240);
  const message = rawMessage.length > 0 ? rawMessage : undefined;

  // 6. Location metadata
  const city = sanitizeText(raw.city, 80) || undefined;
  const country = sanitizeText(raw.country, 80) || 'Global';
  const isApproximate = Boolean(raw.isApproximate);

  // 7. Optional photo preview URL (safe data url or https url)
  let photoUrl: string | undefined = undefined;
  if (typeof raw.photoUrl === 'string') {
    const trimmed = raw.photoUrl.trim();
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('https://')) {
      photoUrl = trimmed.slice(0, 1000000); // 1MB payload safeguard
    }
  }

  return {
    isValid: true,
    sanitizedData: {
      amount: Math.round(amountNum),
      currency: currencyStr,
      name,
      message,
      lat: Number(latNum.toFixed(6)),
      lng: Number(lngNum.toFixed(6)),
      isApproximate,
      isAnonymous,
      city,
      country,
      photoUrl,
    },
  };
}
