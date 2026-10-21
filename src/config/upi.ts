/**
 * Global Digital Monument — UPI Payment Configuration & Helper
 *
 * Safe UPI configuration management and RFC/NPCI compliant UPI URI builder.
 * Never hardcodes personal UPI IDs.
 * Never exposes secrets to the browser.
 */

export interface UpiConfig {
  payeeVpa: string;
  payeeName: string;
  merchantCode?: string;
  isConfigured: boolean;
  isDemo: boolean;
}

/**
 * Validates whether a given string is a valid VPA / UPI ID format (e.g. name@bank).
 */
export function isValidVpa(vpa?: string | null): boolean {
  if (!vpa || typeof vpa !== 'string') return false;
  const trimmed = vpa.trim().toLowerCase();
  if (trimmed.length < 5 || trimmed.length > 50) return false;
  // Basic VPA format check: username@bank
  const vpaRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  if (!vpaRegex.test(trimmed)) return false;
  // Reject obvious placeholder values
  const placeholders = ['demo@upi', 'placeholder@upi', 'example@upi', 'test@upi'];
  if (placeholders.includes(trimmed)) return false;
  return true;
}

/**
 * Returns the configured UPI settings.
 * If not configured or running in demo mode, returns a clearly marked demo placeholder.
 */
export function getUpiConfig(): UpiConfig {
  const configuredVpa = process.env.UPI_PAYEE_VPA || process.env.NEXT_PUBLIC_UPI_PAYEE_VPA;
  const configuredName = process.env.UPI_PAYEE_NAME || process.env.NEXT_PUBLIC_UPI_PAYEE_NAME;
  const merchantCode = process.env.UPI_MERCHANT_CODE || undefined;

  const isConfigured = isValidVpa(configuredVpa);

  if (isConfigured && configuredVpa) {
    return {
      payeeVpa: configuredVpa.trim(),
      payeeName: (configuredName || 'WorldBeacon').trim(),
      merchantCode: merchantCode?.trim(),
      isConfigured: true,
      isDemo: false,
    };
  }

  // Safe demo / unconfigured placeholder
  return {
    payeeVpa: 'demo@upi',
    payeeName: 'WorldBeacon Demo (Non-Payable)',
    merchantCode: undefined,
    isConfigured: false,
    isDemo: true,
  };
}

export interface BuildUpiUriOptions {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  orderRef: string;
  note?: string;
  merchantCode?: string;
}

/**
 * Builds an RFC / NPCI compliant UPI Payment URI (`upi://pay?...`).
 */
export function buildUpiPaymentUri(options: BuildUpiUriOptions): string {
  const { payeeVpa, payeeName, amount, orderRef, note, merchantCode } = options;

  if (amount <= 0 || !Number.isFinite(amount)) {
    throw new Error('UPI amount must be a positive number.');
  }

  const params = new URLSearchParams();
  params.set('pa', payeeVpa.trim());
  params.set('pn', payeeName.trim());
  params.set('am', amount.toFixed(2));
  params.set('cu', 'INR');
  params.set('tr', orderRef.trim());
  params.set('tn', note ? note.trim().slice(0, 80) : `WorldBeacon Light ${orderRef.slice(0, 16)}`);

  if (merchantCode) {
    params.set('mc', merchantCode.trim());
  }

  return `upi://pay?${params.toString()}`;
}
