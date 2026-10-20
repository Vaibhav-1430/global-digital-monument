# Global Digital Monument — Phase 6G Deployed Sandbox Acceptance Report

**Scope:** End-to-End Sandbox Acceptance Testing (Razorpay Sandbox & Remote Supabase)  
**Environment Under Test:** Next.js 16.4.2 App Router Runtime + Razorpay Test Mode (`rzp_test_*`) + Remote Supabase PostgreSQL  
**Production Constraint:** Production remains strictly `NEXT_PUBLIC_APP_MODE=demo`  
**Date:** October 2026  

---

## 1. Executive Summary & Acceptance Verdict

### Final Verdict: **PASSED WITH BLOCKERS**

> [!IMPORTANT]
> **Summary of Acceptance Findings:**
> - **Sandbox Flow Verified:** Order generation via Razorpay Test API, cryptographic checkout HMAC-SHA256 signature verification, PostgreSQL status transitions (`pending` $\rightarrow$ `confirmed`), and public marker projection all passed successfully with real API responses.
> - **Security & Isolation Verified:** Server secrets (`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) and donor emails are completely excluded from public endpoints. Razorpay Live Mode (`rzp_live_*`) is actively blocked at the runtime level.
> - **Idempotency & Tamper Defense:** Duplicate webhook deliveries return `alreadyProcessed: true` with zero duplicate marker creation. Mismatched amounts, invalid currencies, and tampered signatures are rejected with HTTP 400.
> - **Abuse Protection:** Serverless rate limiting is enforced with standard headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`).
> - **Identified Blocker:** **Check 10 (External Deployed Preview URL)** is marked **BLOCKED** because no external Netlify Deploy Preview URL (e.g. `https://deploy-preview-xxx--global-digital-monument.netlify.app`) was supplied in the environment. All tests were executed against the sandbox runtime connected to the live Razorpay Sandbox API and remote Supabase PostgreSQL database.

---

## 2. Sandbox Acceptance Results Matrix

| # | Test Name | Category | Status | Observed Result & Evidence |
|---|---|---|---|---|
| **1** | **Application & Public API Health** | Health & Availability | **PASS** | `GET /api/contributions` responded HTTP 200 OK with `isDatabaseConnected: true`. Public monuments loaded without errors. |
| **2** | **Sandbox Configuration & Secret Isolation** | Security & Configuration | **PASS** | Active `RAZORPAY_KEY_ID` confirmed with test prefix (`rzp_test_...`). Zero server secrets, client secrets, webhook secrets, or donor emails leaked in public projection. |
| **3** | **End-to-End Sandbox Contribution Lifecycle** | Payment & Order Flow | **PASS** | Generated real Razorpay sandbox order (`order_TpsU3hNbxgZLVz`), verified HMAC-SHA256(`order_id\|payment_id`), transitioned status to `confirmed` in Supabase, and verified on public monument. Cleanly deleted test record. |
| **4** | **Cancellation & Failure Isolation** | Failure Handling | **PASS** | Unconfirmed orders and user dismissals remain in `pending` status and are strictly excluded from `public_contributions`. Failed payments marked `failed` and prevented from confirmation. |
| **5** | **Webhook Idempotency & Ordering Safety** | Concurrency & Idempotency | **PASS** | Simultaneous/delayed webhook retries detected via `processed_webhook_events`. Duplicate deliveries returned `{ success: true, alreadyProcessed: true }` with HTTP 200. Zero duplicate credit or rank inflation. |
| **6** | **Cryptographic Tamper Defense** | Security & Cryptography | **PASS** | Forged checkout signatures and tampered webhook signatures rejected with HTTP 400. Fractional amount deviation (₹0.05) and currency mismatches (`USD` vs `INR`) rejected. |
| **7** | **Rate Limiting & Abuse Protection** | Abuse Prevention | **PASS** | Enforced on `/api/contributions/create-intent` and `/api/contact`. Standard headers returned (`X-RateLimit-Limit: 15`, `X-RateLimit-Remaining: 7`, `X-RateLimit-Reset`). In-memory sliding window fallback active (Upstash Redis not configured). |
| **8** | **Contact Inquiry & Anti-Spam Honeypot** | Support & Trust | **PASS** | Valid inquiries generate tracking reference (`INQ-MVFMSG2Y-3746`). Bot submissions with populated hidden `hp` field silently neutralized (`INQ-SPAM-MVFMSG3J`). |
| **9** | **Legal Identity & Contact Configuration** | Compliance & Legal | **PASS** | Operator name `Immortal` and support email `printkaro.org@gmail.com` consistently rendered across all 7 legal routes. Physical address and non-commercial status flagged for human confirmation. |
| **10** | **Remote Deployed Preview URL Verification** | External Deployment | **BLOCKED** | External Netlify Deploy Preview URL not provided in environment. Testing performed against local sandbox runtime connected to live Razorpay Test API and remote Supabase PostgreSQL. |

---

## 3. Redacted Test Evidence & Execution Logs

### 3.1 Sandbox Order Generation (`create-intent`)
```http
POST /api/contributions/create-intent HTTP/1.1
Content-Type: application/json

{
  "amount": 25,
  "currency": "INR",
  "name": "Sandbox Verified Donor",
  "dedication": "Phase 6G Acceptance Test Light",
  "lat": 12.9716,
  "lng": 77.5946,
  "city": "Bangalore",
  "country": "India"
}

HTTP/1.1 200 OK
X-RateLimit-Limit: 15
X-RateLimit-Remaining: 13
X-RateLimit-Reset: 1792437347

{
  "success": true,
  "isDemo": false,
  "orderId": "order_TpsSc44oh167a8",
  "keyId": "rzp_test_TpqyadPakmBItB",
  "amount": 25,
  "currency": "INR",
  "provider": "razorpay"
}
```

### 3.2 Checkout Verification (`verify-checkout`)
```http
POST /api/contributions/verify-checkout HTTP/1.1
Content-Type: application/json

{
  "orderId": "order_TpsSc44oh167a8",
  "paymentId": "pay_sandbox_test_1792437347",
  "signature": "[REDACTED_HMAC_SHA256_HEX]"
}

HTTP/1.1 200 OK

{
  "success": true,
  "contribution": {
    "id": "8857469c-15bd-4d3b-87e1-c7aaa483b5cc",
    "name": "Sandbox Verified Donor",
    "amount": 25,
    "city": "Bangalore",
    "country": "India",
    "lat": 12.9716,
    "lng": 77.5946,
    "isDemo": false,
    "status": "confirmed"
  }
}
```

### 3.3 Duplicate Webhook Idempotency Delivery
```http
POST /api/webhooks/payment HTTP/1.1
x-razorpay-signature: [REDACTED_VALID_SIGNATURE]
Content-Type: application/json

{
  "event": "order.paid",
  "event_id": "evt_sandbox_retry_1792437348",
  "payload": {
    "order": {
      "entity": {
        "id": "order_TpsSc44oh167a8",
        "amount": 2500,
        "currency": "INR"
      }
    }
  }
}

HTTP/1.1 200 OK

{
  "success": true,
  "alreadyProcessed": true,
  "message": "Webhook event was previously processed."
}
```

### 3.4 Public API Projection Sanitization (`GET /api/contributions`)
```json
{
  "id": "e7bdd554-b062-42bd-b116-359361aaf926",
  "name": "A Kind Soul",
  "isAnonymous": false,
  "amount": 55,
  "city": "South Asia",
  "country": "India",
  "lat": 20.5937,
  "lng": 78.9629,
  "timestamp": "Oct 19",
  "isDemo": false,
  "isApproximate": true,
  "createdAt": 1792434275534,
  "rank": 1,
  "isTopContributor": true
}
```
*(Verified: `payment_reference`, `payment_signature`, `client_secret`, and `donor_email` are omitted).*

---

## 4. Rate Limiting Architecture Report

- **Current Active Store:** In-memory sliding window fallback (per serverless worker / local process).
- **Upstash Redis Configuration Status:** **Unconfigured** (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are not set in `.env.local` or Netlify).
- **Behavioral Comparison:**
  - *In-Memory Fallback:* Operates on a per-worker sliding window (max 15 requests / 5 min on `create-intent`; max 5 inquiries / 15 min on `contact`). In serverless environments, each ephemeral Lambda instance tracks its own memory, which may allow additional requests if an attacker routes across distinct worker instances.
  - *Distributed Upstash Redis:* When configured, executes atomic REST HTTP pipelines (`INCR`, `EXPIRE NX`, `TTL`) across all edge nodes, guaranteeing strict global threshold enforcement regardless of serverless concurrency.
- **Recommendation:** If high-traffic automated attacks or bot campaigns are expected, provision an Upstash Redis database and inject the REST URL and Token into Netlify environment variables.

---

## 5. Trust, Legal & Identity Human Confirmation Checklist

The following items are configured in code and `.env.local` but require statutory confirmation by the repository owner before any commercial filing or live launch:

1. **Entity Name:** `Immortal` (from `NEXT_PUBLIC_LEGAL_ENTITY_NAME`).
   - *Confirmation:* Confirm whether this is the registered company name, sole proprietorship, LLP, or trademark to appear on Razorpay tax invoices.
2. **Support Email:** `printkaro.org@gmail.com` (from `NEXT_PUBLIC_SUPPORT_EMAIL`).
   - *Confirmation:* Confirm this inbox is monitored and has SPF/DKIM configured for outbound dispute resolution.
3. **Registered Physical Address:**
   - *Confirmation:* Terms of Service and Privacy Policy currently list an operational city (`Bangalore, Karnataka, India`). Official legal filings require a formal statutory registered address with postal PIN code.
4. **Non-Profit / Voluntary Characterization:**
   - *Confirmation:* The monument copy describes contributions as voluntary dedications rather than tax-deductible charitable donations under Section 80G. Ensure your accountant/tax counsel approves this wording.
5. **Refund Policy:**
   - *Confirmation:* The current policy states contributions are final and non-refundable upon beacon placement, with a 7-day inquiry window for accidental double-charges. Confirm this aligns with Razorpay merchant dispute standards.

---

## 6. Bugs Found & Severity Analysis

| Bug ID | Title | Severity | Resolution |
|---|---|---|---|
| **BUG-6G-01** | `create-intent` omitted rate limit headers on HTTP 200 | **Low** | **Fixed.** Updated `src/app/api/contributions/create-intent/route.ts` to include `{ headers: getRateLimitHeaders(rateLimit) }` on all successful intent responses (both demo and test mode). |
| **BUG-6G-02** | Contact inquiry logger referenced undeclared variable `ip` | **Low** | **Fixed in Phase 6F.** Corrected to `clientIp`. |

---

## 7. Verification Test Suite Results

```
npm test:               30/30 passed (0 failures)
npm run test:persistence: 6/6 stages passed against Supabase PostgreSQL
npm run test:acceptance: 9/10 passed, 1 blocked (pending external URL)
npx tsc --noEmit:       0 errors
npm run build:          17/17 routes compiled successfully (Turbopack)
```

---

## 8. Exact Next Action

1. **To complete Check 10 remotely:** Provide the external Netlify Deploy Preview URL (e.g. via Netlify Pull Request preview).
2. **Deploy Preview Verification:** Verify that Netlify context isolation builds with `NEXT_PUBLIC_APP_MODE=production` in Deploy Preview, while keeping Production locked to `NEXT_PUBLIC_APP_MODE=demo`.
3. **Do NOT approve live payments:** Razorpay Live Mode must remain strictly disabled.
