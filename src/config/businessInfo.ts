/**
 * Global Digital Monument — Central Business & Trust Configuration
 *
 * Centralized, owner-supplied public business information, contact details,
 * and contribution limits. Designed with safe, non-secret public environment
 * variables and explicit development launch warnings.
 *
 * [OWNER REVIEW REQUIRED]: Legal entity name, registered address, and governing
 * jurisdiction must be verified by the site owner prior to production launch.
 */

export interface CommercialLaunchReadiness {
  isReady: boolean;
  missingRequirements: string[];
  details: {
    operatorTypeConfirmed: boolean;
    entityConfirmed: boolean;
    addressConfirmed: boolean;
    jurisdictionConfirmed: boolean;
    emailConfirmed: boolean;
    emailMonitoringConfirmed: boolean;
  };
}

export interface BusinessInfo {
  operatorType: 'individual';
  operatorName: string;
  legalEntityName: string;
  isRegisteredEntity: boolean;
  supportEmail: string | null;
  isEmailMonitoredConfirmed: boolean;
  businessAddress: string;
  governingJurisdiction: string;
  supportPhone: string | null;
  refundWindowDays: number;
  isEmailConfigured: boolean;
  isLegalEntityConfigured: boolean;
  isAddressConfigured: boolean;
  isJurisdictionConfigured: boolean;
  isProduction: boolean;
  contributionLimits: {
    minimumAmount: number;
    maximumAmount: number;
    presetAmounts: number[];
    currency: string;
  };
}

/**
 * Safely validates whether a public configuration variable contains
 * an actual meaningful value, rejecting undefined, null, whitespace, or placeholder strings.
 */
export function isValidConfiguredValue(val?: string | null): boolean {
  if (!val) return false;
  const trimmed = val.trim().toLowerCase();
  if (trimmed.length === 0) return false;
  const invalidPlaceholders = [
    'undefined',
    'null',
    'placeholder',
    'none',
    'n/a',
    'false',
    '0',
  ];
  if (invalidPlaceholders.includes(trimmed)) return false;
  if (trimmed.includes('pending') || trimmed.includes('unconfirmed')) return false;
  return true;
}

/**
 * Checks whether commercial live checkout was requested via environment variables.
 */
export function isCommercialLaunchRequested(): boolean {
  const val = process.env.COMMERCIAL_LAUNCH?.toLowerCase().trim();
  return val === 'true' || val === '1' || val === 'yes' || val === 'on';
}

/**
 * Retrieves the central business identity and trust configuration.
 * Never exposes secrets; uses owner-confirmed details and explicit unconfirmed flags.
 */
export function getBusinessInfo(): BusinessInfo {
  const isProduction = process.env.NODE_ENV === 'production';
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'printkaro.org@gmail.com';
  const isEmailMonitoredConfirmed =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL_MONITORED === 'true';

  // Owner confirmed: Individual project; public project/operator name is "Immortal".
  // Not an unverified registered entity.
  const operatorName =
    process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim() ||
    process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME?.trim() ||
    'Immortal';

  // Registered address: Not confirmed by owner
  const isAddressConfigured = isValidConfiguredValue(
    process.env.NEXT_PUBLIC_BUSINESS_ADDRESS
  );
  const businessAddress = isAddressConfigured
    ? (process.env.NEXT_PUBLIC_BUSINESS_ADDRESS as string).trim()
    : 'Unconfirmed (Pending owner verification prior to commercial launch)';

  // Governing jurisdiction: Not confirmed by owner
  const isJurisdictionConfigured = isValidConfiguredValue(
    process.env.NEXT_PUBLIC_GOVERNING_JURISDICTION
  );
  const governingJurisdiction = isJurisdictionConfigured
    ? (process.env.NEXT_PUBLIC_GOVERNING_JURISDICTION as string).trim()
    : 'Unconfirmed (Pending owner verification prior to commercial launch)';

  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || null;
  const refundWindowDays = parseInt(
    process.env.NEXT_PUBLIC_REFUND_WINDOW_DAYS || '7',
    10
  );

  return {
    operatorType: 'individual',
    operatorName,
    legalEntityName: operatorName,
    isRegisteredEntity: false,
    supportEmail,
    isEmailMonitoredConfirmed,
    businessAddress,
    governingJurisdiction,
    supportPhone,
    refundWindowDays: isNaN(refundWindowDays) ? 7 : refundWindowDays,
    isEmailConfigured: isValidConfiguredValue(supportEmail),
    isLegalEntityConfigured: Boolean(
      process.env.NEXT_PUBLIC_OPERATOR_NAME ||
        process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME
    ),
    isAddressConfigured,
    isJurisdictionConfigured,
    isProduction,
    contributionLimits: {
      minimumAmount: 10,
      maximumAmount: 1000000,
      presetAmounts: [10, 25, 35, 55, 100],
      currency: 'INR',
    },
  };
}

/**
 * Validates whether all mandatory statutory operator and legal identity fields
 * have been verified by the owner prior to activating commercial live checkout.
 */
export function checkCommercialLaunchReadiness(): CommercialLaunchReadiness {
  const info = getBusinessInfo();
  const missingRequirements: string[] = [];

  if (!info.isAddressConfigured) {
    missingRequirements.push(
      'Registered or physical business address (NEXT_PUBLIC_BUSINESS_ADDRESS)'
    );
  }

  if (!info.isJurisdictionConfigured) {
    missingRequirements.push(
      'Governing law and legal jurisdiction (NEXT_PUBLIC_GOVERNING_JURISDICTION)'
    );
  }

  if (!info.isEmailConfigured) {
    missingRequirements.push(
      'Public customer support email (NEXT_PUBLIC_SUPPORT_EMAIL)'
    );
  }

  if (!info.isEmailMonitoredConfirmed) {
    missingRequirements.push(
      'Owner confirmation of support email monitoring status and response SLA (NEXT_PUBLIC_SUPPORT_EMAIL_MONITORED)'
    );
  }

  return {
    isReady: missingRequirements.length === 0,
    missingRequirements,
    details: {
      operatorTypeConfirmed: true, // Confirmed: Individual project
      entityConfirmed: info.isRegisteredEntity, // False: Not a registered entity
      addressConfirmed: info.isAddressConfigured,
      jurisdictionConfirmed: info.isJurisdictionConfigured,
      emailConfirmed: info.isEmailConfigured,
      emailMonitoringConfirmed: info.isEmailMonitoredConfirmed,
    },
  };
}

/**
 * Throws a descriptive error if commercial live checkout is attempted
 * before mandatory statutory disclosures are confirmed by the owner.
 */
export function assertCommercialLaunchReadiness(): void {
  const readiness = checkCommercialLaunchReadiness();
  if (!readiness.isReady) {
    throw new Error(
      `Commercial live launch blocked: The following legal identity fields must be confirmed by the owner prior to live checkout: ${readiness.missingRequirements.join(
        ', '
      )}`
    );
  }
}
