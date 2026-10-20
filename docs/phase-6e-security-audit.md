# Global Digital Monument — Phase 6E Security Audit Report
**Scope:** Razorpay Test-Mode Integration, Server Cryptography & Database Integrity  
**Target Environment:** Netlify Serverless Runtime (Next.js 16.4.2 App Router)  
**Database:** Supabase Managed PostgreSQL (Row Level Security Enforced)  
**Payment Gateway:** Razorpay Sandbox / Test Mode (INR Default)  
**Mode Constraint:** Production remains strictly `NEXT_PUBLIC_APP_MODE=demo`  
**Date:** October 2026  

---

## 1. Executive Summary

This security audit inspects the Global Digital Monument Razorpay test-mode payment integration, server-side cryptographic signature verifiers, webhook handling, Supabase database access controls, idempotency mechanisms, and secret isolation.

**Release-Readiness Verdict:**  
**APPROVED FOR DEPLOYED SANDBOX VERIFICATION ONLY.**  
Live payments and production credentials remain **strictly disabled**. `NEXT_PUBLIC_APP_MODE=demo` is enforced as the active default in all production environments. Deploy Preview environments may run `NEXT_PUBLIC_APP_MODE=production` solely to exercise the Razorpay checkout code path using **Razorpay TEST credentials only**.

---

## 2. Security Findings & Risk Analysis

| ID | Category | Finding Description | Severity | Relevant Code Location | Status |
|---|---|---|---|---|---|
| **SEC-01** | **Cryptographic Verification** | Checkout callback signature verification uses constant-time comparison over `HMAC-SHA256(order_id\|payment_id, RAZORPAY_KEY_SECRET)`. Browser callbacks are treated as strictly untrusted until verified on the server. | **Critical** | [`src/lib/payments/verifier.ts:L134-L162`](file:///d:/Projects/Something/src/lib/payments/verifier.ts#L134-L162) | **Verified Safe** |
| **SEC-02** | **Webhook Cryptography** | Webhook verification calculates HMAC-SHA256 over exact unparsed raw request body (`await req.text()`) against `RAZORPAY_WEBHOOK_SECRET` with timing-safe comparison (`crypto.timingSafeEqual`). | **Critical** | [`src/lib/payments/verifier.ts:L7-L50`](file:///d:/Projects/Something/src/lib/payments/verifier.ts#L7-L50) | **Verified Safe** |
| **SEC-03** | **Demo Mode Isolation** | When `NEXT_PUBLIC_APP_MODE=demo`, `/api/contributions/create-intent` returns simulated local markers without initializing Razorpay orders or writing to database. The Razorpay checkout script and modal are never loaded. | **Critical** | [`src/app/api/contributions/create-intent/route.ts:L28-L43`](file:///d:/Projects/Something/src/app/api/contributions/create-intent/route.ts#L28-L43), [`src/components/AddYourLightFlow.tsx:L242-L251`](file:///d:/Projects/Something/src/components/AddYourLightFlow.tsx#L242-L251) | **Verified Safe** |
| **SEC-04** | **Amount & Currency Tampering** | Server rejects payment confirmations if the captured amount or currency from the payment provider does not match the contribution intent recorded in the database. | **High** | [`src/lib/db/contributions.ts:L215-L225`](file:///d:/Projects/Something/src/lib/db/contributions.ts#L215-L225) | **Verified Safe** |
| **SEC-05** | **Webhook Idempotency & Replay Defense** | Duplicate webhook events from gateway retries are checked against `public.processed_webhook_events`. Already confirmed contributions return `alreadyConfirmed: true` without double-crediting or duplicate records. | **High** | [`src/app/api/webhooks/payment/route.ts:L54-L62`](file:///d:/Projects/Something/src/app/api/webhooks/payment/route.ts#L54-L62), [`src/lib/db/contributions.ts:L205-L208`](file:///d:/Projects/Something/src/lib/db/contributions.ts#L205-L208) | **Verified Safe** |
| **SEC-06** | **Race Condition Immunity** | Whichever arrives first between the client checkout verification and background webhook transitions the record from `pending` to `confirmed`. The later event exits idempotently. Neither can duplicate markers or inflate totals. | **Medium** | [`src/lib/db/contributions.ts:L205-L208`](file:///d:/Projects/Something/src/lib/db/contributions.ts#L205-L208) | **Verified Safe** |
| **SEC-07** | **Secret Isolation & RLS** | Server secrets (`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) are never exposed to browser bundles. Database Row Level Security (RLS) is active; public view `public_contributions` omits all payment references, signatures, and donor emails. | **Medium** | [`supabase/migrations/20261019000000_production_contributions_schema.sql:L84-L132`](file:///d:/Projects/Something/supabase/migrations/20261019000000_production_contributions_schema.sql#L84-L132) | **Verified Safe** |
| **SEC-08** | **Delayed Failure Event Safety** | Out-of-order `payment.failed` webhooks arriving after successful confirmation cannot overwrite an already `confirmed` status because updates require `status = 'pending'`. | **Low** | [`src/lib/db/contributions.ts:L261-L268`](file:///d:/Projects/Something/src/lib/db/contributions.ts#L261-L268) | **Verified Safe** |
| **SEC-09** | **Sensitive Data Logging** | Inspected all `console.` log statements across API routes and libraries. No API keys, secret hashes, authentication headers, donor emails, or customer payment credentials are logged. | **Low** | All API route handlers & libraries | **Verified Safe** |
| **SEC-10** | **Rate Limiting on Order Creation** | `/api/contact` has sliding window rate limiting (5 req/15 min). `/api/contributions/create-intent` currently relies on input validation (limits, coordinate ranges, integer check). Under high-volume bot traffic in production, IP-based rate limiting on order creation will be beneficial. | **Low** | [`src/app/api/contributions/create-intent/route.ts`](file:///d:/Projects/Something/src/app/api/contributions/create-intent/route.ts) | **Acceptable for Sandbox** |

---

## 3. In-Depth Component Inspections

### 3.1 Order Creation & Intent Generation
- **Endpoint:** `POST /api/contributions/create-intent`
- **Validation:** Strict server-side validation via `validateContributionInput`:
  - Amount: integer check, strictly between ₹10 and ₹1,000,000 INR.
  - Currency: strictly `INR`.
  - Coordinates: `-90 <= lat <= 90`, `-180 <= lng <= 180`, rounded to 6 decimal places.
  - Dedication sanitization: strips all HTML tags and control characters, enforces 240 char ceiling.
  - Name sanitization: 60 char ceiling; defaults to `'Anonymous'` if `isAnonymous = true`.
- **Database Insertion:** Pending records are inserted with `status = 'pending'`, unique RFC 4122 UUID, and unique `payment_reference`.
- **Secret Isolation:** Only `orderId` and public `keyId` are returned to the client. `RAZORPAY_KEY_SECRET` is never returned.

### 3.2 Checkout Signature Verification
- **Endpoint:** `POST /api/contributions/verify-checkout`
- **Algorithm:**
  $$\text{Expected} = \text{HMAC-SHA256}(\text{order\_id} \mathbin{\Vert} \text{payment\_id},\, \text{RAZORPAY\_KEY\_SECRET})$$
- **Comparison:** Performed using `crypto.timingSafeEqual` after buffer length verification, preventing timing attacks.
- **Untrusted Input Defense:** The client cannot supply a `status` field. Status is only updated by the server upon passing HMAC verification.
- **Amount Verification:** The order was created on Razorpay with an explicit amount and currency. Razorpay signs the checkout payload only when the exact order is paid. The database confirms against the unique `payment_reference` matching the verified `order_id`.

### 3.3 Webhook Signature & Idempotency
- **Endpoint:** `POST /api/webhooks/payment`
- **Body Handling:** Reads unparsed body using `await req.text()`. Does not parse JSON before calculating HMAC.
- **Signature Header:** Reads `x-razorpay-signature` and compares against `HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)`.
- **Payload Extraction:** Extracts `orderId`, `amount`, and `currency` from both `payload.payment.entity` and `payload.order.entity` (supporting both `order.paid` and `payment.captured` event structures).
- **Idempotency Store:** Checks `public.processed_webhook_events`. Duplicate events return `{ success: true, alreadyProcessed: true }` with HTTP 200 without duplicate processing.
- **Underpayment / Currency Tampering Defense:** Validates:
  ```ts
  if (params.expectedAmount !== undefined && Math.abs(Number(existing.amount) - params.expectedAmount) >= 0.01) {
    return { success: false, error: 'Payment amount does not match recorded contribution.' };
  }
  ```

### 3.4 Out-of-Order & Delayed Event Safety
- **Scenario A (Verify-Checkout Before Webhook):** Client callback confirms record first (`status = 'confirmed'`). Webhook arrives later, detects `status === 'confirmed'`, returns `alreadyConfirmed: true`, and records event in idempotency table.
- **Scenario B (Webhook Before Verify-Checkout):** Webhook confirms record first. Browser callback verifies signature, finds record already `confirmed`, and returns HTTP 200 with confirmed marker.
- **Scenario C (Payment Failure After Success):** Out-of-order `payment.failed` event arrives after confirmation. `markContributionFailed` includes `.eq('status', 'pending')`, so it matches 0 rows and cannot corrupt the confirmed status.
- **Scenario D (Retry After Failure):** If a user experiences a payment failure, the frontend resets submission state and initiates a new `create-intent` request, generating a distinct, independent `order_id`.

### 3.5 Database RLS & Public Access Controls
- `ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;`
- Anonymous client access is restricted exclusively to `SELECT` on `status = 'confirmed'`.
- All `INSERT`, `UPDATE`, and `DELETE` operations are restricted to `service_role`.
- `public_contributions` view excludes:
  - `payment_provider`
  - `payment_reference`
  - `payment_signature`
  - `client_secret`
  - `donor_email`
- Display names for anonymous contributors are permanently masked at the view level (`CASE WHEN is_anonymous = true THEN 'Anonymous' ELSE contributor_name END`).

---

## 4. Environment Variables Audit

| Variable Name | Client-Exposed? | Expected Value | Security Status |
|---|---|---|---|
| `NEXT_PUBLIC_APP_MODE` | Yes | `demo` (production) | **Safe Default.** Keeps live payments disabled. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Project URL | **Safe.** Public domain endpoint. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | JWT Anon Key | **Safe.** Public key restricted by RLS policies. |
| `SUPABASE_SERVICE_ROLE_KEY` | **NO (Server Only)** | JWT Service Role Key | **Protected.** Read only in `src/lib/db/supabase.ts`. |
| `PAYMENT_PROVIDER` | **NO (Server Only)** | `razorpay` | **Safe.** Provider selector string. |
| `RAZORPAY_KEY_ID` | Yes (via API) | `rzp_test_...` | **Safe.** Public merchant key ID for checkout initialization. |
| `RAZORPAY_KEY_SECRET` | **NO (Server Only)** | Private test secret | **Protected.** Never exposed in client code or responses. |
| `RAZORPAY_WEBHOOK_SECRET` | **NO (Server Only)** | Webhook secret | **Protected.** Never exposed in client code or responses. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Yes | `printkaro.org@gmail.com` | **Safe.** Public contact address. |
| `NEXT_PUBLIC_LEGAL_ENTITY_NAME` | Yes | `Immortal` | **Safe.** Public entity name. |

---

## 5. Verification Test Results

### 1. Automated Test Suite (`npm test`)
```
✔ Amount Validation — Validates amounts within ₹10 to ₹1,000,000 (0.84ms)
✔ Location Validation — Enforces strict latitude & longitude bounds (0.17ms)
✔ Text Sanitization — Strips HTML and limits length (0.14ms)
✔ Ranking — Orders by amount DESC, with earlier timestamp as tie-breaker (0.24ms)
✔ Razorpay Webhook Verification — Validates HMAC SHA-256 and rejects tampering (0.37ms)
✔ Stripe Webhook Verification — Validates timestamped signature (0.27ms)
✔ Public Data Filtering — Strips private transaction references and donor email (12.13ms)
✔ Demo Mode Isolation — Default app mode is demo and safe (0.17ms)
✔ Deduplication — Prevents duplicate marker IDs in collection (0.14ms)
✔ UUID Generation — createPendingContributionRecord generates PostgreSQL-compliant UUID (1103.36ms)
✔ Razorpay Webhook — Enforces HMAC-SHA256 verification and extracts payment metadata (1.20ms)
✔ Stripe Webhook — Enforces timestamp freshness tolerance (< 300s) to prevent replay attacks (0.92ms)
Amount mismatch for test_audit_amount: expected ₹50, database has ₹500
Currency mismatch for test_audit_amount: expected USD, database has INR
✔ Payment Confirmation — Rejects underpayment or currency tampering (1359.59ms)
✔ Payment Failure — Failed payment terminates contribution and prevents confirmation (774.60ms)
✔ Data Sanitization — Public marker mapping strips all gateway secrets, donor emails, and signatures (1.66ms)
✔ Deterministic Ranking — Strict amount DESC, timestamp ASC tie-breaker, and ID fallback (2.88ms)
✔ Razorpay Checkout Signature — Validates HMAC-SHA256(order_id|payment_id, secret) (1.54ms)
✔ Razorpay Webhook — Validates raw payload HMAC, amount, and currency matching (0.34ms)
✔ Razorpay Test-Mode Lifecycle — Pending record -> Verified confirmation -> Idempotent re-check (1819.90ms)
✔ Checkout Cancellation & Failure — Records remain unconfirmed and safe (1022.88ms)
✔ Security — Server secrets are never exposed in public markers or outputs (1.14ms)
✔ Central Business Info — Safe fallbacks and configuration parsing (1.11ms)
✔ Contact API — Validates inputs, rejects spam honeypots, and generates reference IDs (3.99ms)
✔ Trust & Legal Pages — Route existence and content disclosure verification (2.95ms)
✔ Navigation Integration — SiteFooter and modal links contain all trust routes (0.69ms)

ℹ tests 25 | suites 0 | pass 25 | fail 0 | cancelled 0 | skipped 0 | duration 3.64s
```

### 2. Live Database Persistence Verification (`npm run test:persistence`)
```
================================================================
GLOBAL DIGITAL MONUMENT — PHASE 6A PERSISTENCE VERIFICATION
================================================================
✔ [CLIENT_INIT] Service-role client initialized successfully (secrets securely handled).
✔ [INSERT_PENDING] Record inserted with status='pending' and is_demo=true (UUID: 6636e3ea-7635-4fb2-b0a0-e0915183af24).
✔ [PENDING_VIEW_EXCLUSION] Confirmed pending record is completely excluded from public.public_contributions.
✔ [UPDATE_CONFIRMED] Record transitioned to status='confirmed'.
✔ [CONFIRMED_VIEW_RETRIEVAL] Confirmed record retrieved via public.public_contributions with correct values.
✔ [CLEANUP_AND_VERIFICATION] Test record deleted and verified absent from table and view.
ALL PERSISTENCE VERIFICATION CHECKS PASSED SUCCESSFULLY.
```

### 3. TypeScript Typecheck (`npx tsc --noEmit`)
```
Exit code: 0 (Zero errors across all TypeScript files)
```

### 4. Next.js Production Build (`npm run build`)
```
▲ Next.js 16.4.2 (Turbopack)
- Environments: .env.local
✓ Compiled successfully in 1553ms
Finished TypeScript in 3.0s ...
✓ Generating static pages using 18 workers (17/17) in 3.8s

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /about
├ ƒ /api/contact
├ ƒ /api/contributions
├ ƒ /api/contributions/create-intent
├ ƒ /api/contributions/verify-checkout
├ ƒ /api/realtime/stream
├ ƒ /api/webhooks/payment
├ ○ /contact
├ ○ /contribution-policy
├ ○ /payment-support
├ ○ /privacy
├ ○ /refund-policy
└ ○ /terms

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
Exit code: 0
```

---

## 6. Unresolved Risks & Operational Caveats

1. **Serverless Partitioning of In-Memory SSE:**
   - *Risk:* Netlify serverless functions run ephemeral instances. In-memory SSE connections on one instance cannot receive broadcasts triggered by webhooks on another instance.
   - *Mitigation:* Mitigated in client code ([`src/hooks/useContributions.ts`](file:///d:/Projects/Something/src/hooks/useContributions.ts)) via tab-visibility refresh and 60-second periodic background polling. Long-term recommended solution is Supabase Realtime WebSockets directly from the browser to PostgreSQL.
2. **Rate Limiting on Order Creation:**
   - *Risk:* High-volume automated traffic could create excessive pending Razorpay orders.
   - *Mitigation:* Database unique constraints prevent duplicate order IDs, and input validation bounds amount between ₹10 and ₹1,000,000. Recommend adding IP rate-limiting middleware before commercial launch.
3. **Webhook Secret Synchronization:**
   - *Risk:* If `RAZORPAY_WEBHOOK_SECRET` in Netlify does not match the secret entered in Razorpay Dashboard, all webhook deliveries will be rejected with HTTP 400.
   - *Mitigation:* The browser callback signature verification acts as an independent authoritative path, confirming contributions even if the webhook secret is misconfigured.

---

## 7. Release-Readiness Verdict

**STATUS: READY FOR DEPLOYED SANDBOX VERIFICATION ONLY**

- Live production payments remain **DISABLED**.
- `NEXT_PUBLIC_APP_MODE=demo` remains strictly active.
- Deploy Previews may enable `NEXT_PUBLIC_APP_MODE=production` solely with Razorpay **TEST** credentials.
- All cryptographic signature validations, amount/currency tamper protections, and database RLS policies have passed verification.
