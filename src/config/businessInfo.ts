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

export interface BusinessInfo {
  legalEntityName: string;
  supportEmail: string | null;
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
 * Retrieves the central business identity and trust configuration.
 * Never exposes secrets; uses safe public fallbacks and owner review flags.
 */
export function getBusinessInfo(): BusinessInfo {
  const isProduction = process.env.NODE_ENV === 'production';
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null;
  const legalEntityName =
    process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME?.trim() ||
    'Global Digital Monument Operator';
  const businessAddress =
    process.env.NEXT_PUBLIC_BUSINESS_ADDRESS?.trim() ||
    'Registered address pending owner confirmation';
  const governingJurisdiction =
    process.env.NEXT_PUBLIC_GOVERNING_JURISDICTION?.trim() ||
    'Jurisdiction pending owner confirmation';
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || null;
  const refundWindowDays = parseInt(
    process.env.NEXT_PUBLIC_REFUND_WINDOW_DAYS || '7',
    10
  );

  return {
    legalEntityName,
    supportEmail,
    businessAddress,
    governingJurisdiction,
    supportPhone,
    refundWindowDays: isNaN(refundWindowDays) ? 7 : refundWindowDays,
    isEmailConfigured: Boolean(supportEmail),
    isLegalEntityConfigured: Boolean(process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME),
    isAddressConfigured: Boolean(process.env.NEXT_PUBLIC_BUSINESS_ADDRESS),
    isJurisdictionConfigured: Boolean(
      process.env.NEXT_PUBLIC_GOVERNING_JURISDICTION
    ),
    isProduction,
    contributionLimits: {
      minimumAmount: 10,
      maximumAmount: 1000000,
      presetAmounts: [10, 25, 35, 55, 100],
      currency: 'INR',
    },
  };
}
