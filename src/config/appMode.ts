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
