# Global Digital Monument — Trust & Legal Launch Checklist
**Status:** Pre-Launch Preparation (Phase 6C Complete)  
**Target:** Live Production Onboarding & Payment Gateway Approval  
**Date:** October 2026  

---

## 1. Owner Review & Confirmation Items (`OWNER REVIEW REQUIRED`)

The trust and legal section has been implemented with production-grade architecture, safe defaults, and zero fabricated credentials. Before activating real payments or submitting for commercial payment gateway onboarding, the site owner must confirm the following items:

| # | Item | Current Default / Placeholder | Required Owner Action | Config Method |
|---|---|---|---|---|
| **1** | **Customer Support Email** | `null` (shows dev warning or web form notice) | Provide an active, monitored customer support email inbox. | Set `NEXT_PUBLIC_SUPPORT_EMAIL` in `.env.local` |
| **2** | **Legal Operating Entity Name** | `Global Digital Monument Operator` | Confirm registered business name (e.g. registered LLP, Pvt. Ltd., Sole Proprietorship, or individual trade name). | Set `NEXT_PUBLIC_LEGAL_ENTITY_NAME` in `.env.local` |
| **3** | **Registered Business Address** | `Registered address pending owner confirmation` | Provide the official registered office or correspondence address for public disclosure. | Set `NEXT_PUBLIC_BUSINESS_ADDRESS` in `.env.local` |
| **4** | **Governing Law & Jurisdiction** | `Jurisdiction pending owner confirmation` | Confirm the legal jurisdiction for dispute resolution (e.g., *Courts of Bengaluru, Karnataka, India*). | Set `NEXT_PUBLIC_GOVERNING_JURISDICTION` in `.env.local` |
| **5** | **Customer Support Phone** *(Optional)* | `null` (not displayed) | Provide customer support phone number if required by your payment gateway aggregator. | Set `NEXT_PUBLIC_SUPPORT_PHONE` in `.env.local` |
| **6** | **Refund Review Window** | `7` calendar days | Review and confirm the formal refund consideration window for digital contributions. | Set `NEXT_PUBLIC_REFUND_WINDOW_DAYS` in `.env.local` |
| **7** | **Final Legal Approval** | Draft plain-language terms | Have legal counsel review Terms of Service and Privacy Policy for local compliance. | Source review in `src/app/terms/` & `src/app/privacy/` |

---

## 2. Environment Variables Summary (`.env.local`)

These variables are defined in `src/config/businessInfo.ts` and `.env.example`:

```bash
# ==============================================================================
# PUBLIC TRUST & LEGAL CONFIGURATION (Safe, non-secret owner configuration)
# ==============================================================================
# Customer support email for public display and contact
NEXT_PUBLIC_SUPPORT_EMAIL=support@example.com

# Legal operating entity name (Registered business or trade name)
NEXT_PUBLIC_LEGAL_ENTITY_NAME="Global Digital Monument Pvt. Ltd."

# Registered physical or correspondence address
NEXT_PUBLIC_BUSINESS_ADDRESS="123 Tech Park, Outer Ring Road, Bengaluru, Karnataka, 560103, India"

# Legal governing jurisdiction for Terms of Service
NEXT_PUBLIC_GOVERNING_JURISDICTION="Bengaluru, Karnataka, India"

# Optional customer support phone number
NEXT_PUBLIC_SUPPORT_PHONE="+91 80 1234 5678"

# Refund review request window in calendar days (Default: 7)
NEXT_PUBLIC_REFUND_WINDOW_DAYS=7
```

> **Security Rule:** Never put secrets or server API credentials (e.g. `RAZORPAY_KEY_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) into `NEXT_PUBLIC_*` variables. Only safe, public-facing strings may use `NEXT_PUBLIC_`.

---

## 3. Implemented Routes & Navigation Map

All trust and legal pages are directly accessible by URL and seamlessly linked across the platform:

1. **`/about`** — Project mission, 3D WebGL technology, non-profit disclosure, community principles.
2. **`/contact`** — Support email, operating hours, business entity details, secure inquiry form (`/api/contact`).
3. **`/contribution-policy`** — What a contribution covers, exact tiers (₹10 – ₹10,00,000 INR), digital delivery, non-property disclosures.
4. **`/refund-policy`** — Procedures for checkout cancellations, failed charges, duplicate charges, missing lights, and refund requests.
5. **`/terms`** — User eligibility, acceptable use, digital license, IP ownership, limitation of liability, dispute resolution.
6. **`/privacy`** — Data audit (names, coordinates, messages, donor email isolation, zero card/PIN storage), cookies, deletion rights.
7. **`/payment-support`** — Troubleshooting missing lights, duplicate debits, safety warnings against sharing PINs/OTPs.

### Navigation Entry Points
- **Site Footer (`SiteFooter.tsx`):** Fixed unobtrusive footer on `/` displaying total glowing lights count and links to all 7 pages.
- **Contribution Flow (`AddYourLightFlow.tsx`):** Step 4 Review includes direct links to `/contribution-policy` and `/payment-support`.
- **About Overlay Modal (`AboutOverlay.tsx`):** Includes quick navigation to `/about`, `/contribution-policy`, `/refund-policy`, and `/contact`.
- **Legal Header (`LegalPageLayout.tsx`):** Sticky top bar with brand link, "Return to Globe", and tab navigation across all 7 pages.

---

## 4. Payment Gateway (Razorpay) Onboarding Requirements

Payment aggregators require specific public policies on merchant websites prior to account activation:

- [x] **Clear Merchant Identity:** Operator name and address placeholders configurable via central config.
- [x] **Contact Information:** Contact page with email, inquiry form, and operating hours.
- [x] **Pricing & Currency:** Exact contribution tiers listed in INR on `/contribution-policy`.
- [x] **Terms & Conditions:** Accessible `/terms` covering digital service delivery.
- [x] **Privacy Policy:** Comprehensive `/privacy` stating that financial credentials are never stored.
- [x] **Refund & Cancellation Policy:** Explicit `/refund-policy` detailing failed and duplicate charge handling.
- [x] **No Charity Misrepresentation:** Explicit disclaimer on `/about` and `/contribution-policy` confirming the site is not a registered NGO/charity.

> **Important Reminder:** Having legal pages is a prerequisite, but does not alone guarantee payment aggregator approval. The owner must provide valid corporate/banking KYC documents directly to Razorpay.
