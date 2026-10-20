/**
 * Global Digital Monument — Application Mode Configuration
 *
 * Provides safe, centralized runtime environment detection.
 */

export type AppMode = 'demo' | 'production';

/**
 * Returns the active application mode.
 * Defaults to 'demo' if unconfigured or if required production secrets are absent.
 */
export function getAppMode(): AppMode {
  // 1. Strict Netlify Production Context lock (checked via build-time or runtime env)
  const netlifyContext = (
    process.env.CONTEXT ||
    process.env.NEXT_PUBLIC_NETLIFY_CONTEXT ||
    ''
  ).toLowerCase();

  if (netlifyContext === 'production') {
    return 'demo';
  }

  // 2. Strict Production Hostname lock for browser execution
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname.toLowerCase();
    if (host === 'worldbeacon.netlify.app' || host === 'www.worldbeacon.netlify.app') {
      return 'demo';
    }
  }

  // 3. Fallback to explicit environment variable
  const envMode = process.env.NEXT_PUBLIC_APP_MODE?.toLowerCase();
  if (envMode === 'production') {
    return 'production';
  }
  return 'demo';
}

/**
 * Checks whether the application is running in production mode.
 */
export function isProductionMode(): boolean {
  return getAppMode() === 'production';
}

/**
 * Checks whether the server environment has real payment gateway secrets configured.
 */
export function isPaymentConfigured(): boolean {
  const provider = process.env.PAYMENT_PROVIDER || 'razorpay';
  if (provider === 'razorpay') {
    return !!(
      process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_WEBHOOK_SECRET
    );
  }
  if (provider === 'stripe') {
    return !!(
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET
    );
  }
  return false;
}

/**
 * Checks whether Supabase database credentials are configured.
 */
export function isDatabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}
