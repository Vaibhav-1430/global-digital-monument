# Global Digital Monument — Phase 6D: Deployed Sandbox Verification Readiness Audit
**Deployment Target:** Netlify Serverless Runtime  
**Framework:** Next.js 16.4.2 (App Router, Turbopack, React 19)  
**Database:** Supabase Managed PostgreSQL (RLS Enforced)  
**Payment Gateway:** Razorpay Sandbox / Test Mode (INR default)  
**Current Application Mode:** `NEXT_PUBLIC_APP_MODE=demo` (Default Active)  
**Date:** October 2026  

---

## 1. Executive Summary

Phase 6D audits the deployment readiness of Global Digital Monument on Netlify. While automated tests, TypeScript typechecking, and persistence scripts pass locally, deploying an interactive 3D WebGL monument with serverless APIs, cryptographic webhooks, and third-party payment gateways introduces unique architectural constraints.

This audit:
1. Evaluates Next.js 16 App Router compatibility with Netlify Functions.
2. Identifies serverless limitations for persistent Server-Sent Events (SSE) and implements client fallbacks.
3. Confirms that demo mode remains the safe default and prevents inadvertent charges.
4. Validates race-condition safety, duplicate webhook idempotency, and amount/currency tampering defenses.
5. Documents the exact environment variable requirements by mode.
6. Provides a step-by-step manual sandbox testing checklist for human verification.

---

## 2. Audit Findings & Severity Matrix

| ID | Component | Finding & Root Cause | Severity | Status / Remediation |
|---|---|---|---|---|
| **F-01** | **Real-Time Stream (`/api/realtime/stream`)** | In-process SSE listener set (`new Set()`) is local to a single Lambda instance. Under Netlify's serverless runtime, webhook executions run on separate instances and cannot broadcast to SSE clients. Additionally, serverless function timeouts (10–26s) cause repeated disconnects. | **High** | **Remediated for Resilience:** Added tab visibility refresh and 60-second periodic polling fallback in `useContributions.ts`, with SSE reconnect throttling (closes after 3 consecutive failures to conserve serverless quota). Recommended long-term: Supabase Realtime WebSockets. |
| **F-02** | **Next.js 16 App Router Compatibility** | `cacheComponents: true` in Next.js 16 is incompatible with legacy route segment config `export const dynamic = 'force-dynamic'`, causing build failures if declared in API routes. | **Medium** | **Resolved:** Removed `dynamic = 'force-dynamic'` from all 5 API routes. All routes automatically execute dynamically on demand (`ƒ Dynamic`) because they read dynamic request bodies (`req.json()`, `req.text()`). |
| **F-03** | **Netlify Build Configuration** | Repository lacked a root `netlify.toml`, leaving Node.js runtime and build settings to platform defaults. | **Medium** | **Resolved:** Created `netlify.toml` with `NODE_VERSION = "20"`, `publish = ".next"`, `@netlify/plugin-nextjs`, and global security/caching headers. |
| **F-04** | **Razorpay Webhook Payload Parsing** | Webhooks for `order.paid` may place `amount` and `currency` on `payload.order.entity` rather than `payload.payment.entity`. | **Low** | **Resolved:** Updated `src/lib/payments/verifier.ts` to inspect both `paymentEntity` and `orderEntity`. |
| **F-05** | **Demo Mode Isolation** | When `NEXT_PUBLIC_APP_MODE=demo`, `/api/contributions/create-intent` returns simulated local demo IDs without calling Razorpay or persisting to Supabase, preventing accidental charges. | **Critical** | **Verified Safe:** Demo mode is strictly isolated; Razorpay SDK script and modal are never loaded or invoked in demo mode. |
| **F-06** | **Checkout Callback Authenticity** | Browser checkout callbacks (`/api/contributions/verify-checkout`) could be spoofed if trusted without cryptographic verification. | **Critical** | **Verified Safe:** Server strictly verifies HMAC-SHA256(`order_id\|payment_id`, `RAZORPAY_KEY_SECRET`) before transitioning any record to `confirmed`. |
| **F-07** | **Webhook Idempotency & Replay Defense** | Duplicate webhook deliveries or network retries could re-trigger processing. | **Critical** | **Verified Safe:** Webhook signatures verified in constant time over raw body. `processed_webhook_events` table enforces uniqueness. Database confirmation returns `alreadyConfirmed: true` without errors. |
| **F-08** | **Browser vs Webhook Race Conditions** | User browser callback and background webhook event arrive simultaneously or out of order. | **Low** | **Verified Safe:** Whichever arrives first updates status to `confirmed`. The later event recognizes `alreadyConfirmed: true` and exits idempotently. |

---

## 3. Detailed Route Compatibility Under Netlify

### 1. `GET /api/contributions`
- **Execution:** Serverless Function (Dynamic `ƒ`).
- **Data Source:** Supabase `public_contributions` view (excludes payment references, donor emails, and signatures).
- **Caching:** Configured with `Cache-Control: public, s-maxage=15, stale-while-revalidate=45` to leverage Netlify Edge CDN caching and reduce database queries.

### 2. `POST /api/contributions/create-intent`
- **Execution:** Serverless Function (Dynamic `ƒ`).
- **Demo Mode:** Immediately returns `{ isDemo: true, contribution: ... }`. No external calls.
- **Production Mode:** Server-to-server HTTPS call to Razorpay API (`https://api.razorpay.com/v1/orders`) using HTTP Basic Auth (`keyId:keySecret`). Creates `pending` contribution in Supabase. Returns `orderId` and public `keyId` to browser.

### 3. `POST /api/contributions/verify-checkout`
- **Execution:** Serverless Function (Dynamic `ƒ`).
- **Security:** Requires `orderId`, `paymentId`, and `signature`. Verifies HMAC-SHA256 against server-only `RAZORPAY_KEY_SECRET`. Transitions Supabase record from `pending` to `confirmed`.

### 4. `POST /api/webhooks/payment`
- **Execution:** Serverless Function (Dynamic `ƒ`).
- **Payload Handling:** Reads unparsed raw body via `await req.text()`. Validates `x-razorpay-signature` in constant time. Enforces idempotency via `processed_webhook_events`. Validates amount and currency matching before confirmation.

### 5. `GET /api/realtime/stream` (SSE)
- **Execution:** Serverless Function (Dynamic `ƒ`).
- **Serverless Limitation:** Ephemeral Lambda instances cannot broadcast across separate workers.
- **Mitigation:** `useContributions.ts` combines SSE with an edge-cached 60-second polling interval and automatic tab visibility refreshes. If SSE disconnects 3 times consecutively, it throttles reconnection to conserve serverless quota.

---

## 4. Environment Variables by Operating Mode

> **SECURITY NOTICE:** Never prefix server secrets with `NEXT_PUBLIC_`. Never check secrets into version control.

### Mode A: Demo Mode (Current Default)
| Variable | Scope | Purpose | Example |
|---|---|---|---|
| `NEXT_PUBLIC_APP_MODE` | Browser & Server | Controls simulated vs real checkout | `demo` |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser & Server | Remote Supabase project URL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser & Server | Public Supabase anonymous client key | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | Backend service-role key for database writes | `eyJhbGci...` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Browser & Server | Customer support email displayed on legal pages | `support@yourdomain.com` |
| `NEXT_PUBLIC_LEGAL_ENTITY_NAME` | Browser & Server | Registered business entity name | `Global Digital Monument Operator` |

### Mode B: Razorpay Sandbox / Test Mode (For Test Verification)
Requires all variables from Mode A, plus the following server secrets:
| Variable | Scope | Purpose | Example |
|---|---|---|---|
| `NEXT_PUBLIC_APP_MODE` | Browser & Server | Set to `production` to activate checkout flow | `production` |
| `PAYMENT_PROVIDER` | Server Only | Gateway selector (defaults to `razorpay`) | `razorpay` |
| `RAZORPAY_KEY_ID` | Server & Returned to Client | Public test Key ID (starts with `rzp_test_`) | `rzp_test_1DP5mmOlF5G5ag` |
| `RAZORPAY_KEY_SECRET` | **Server Only (SECRET)** | Used for order creation and HMAC checkout verification | *(Private test secret)* |
| `RAZORPAY_WEBHOOK_SECRET` | **Server Only (SECRET)** | Configured in Razorpay Webhook Dashboard | *(Private webhook secret)* |

---

## 5. Manual Sandbox Verification Checklist (Human Tester Guide)

Before claiming an end-to-end sandbox payment succeeded, a human tester must perform the following procedure in an explicitly approved test session:

### Step 1: Netlify / Local Environment Setup
- [ ] Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in Netlify Dashboard (or `.env.local` for local testing).
- [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` is configured.
- [ ] Temporarily change `NEXT_PUBLIC_APP_MODE=production`.

### Step 2: Webhook Endpoint Configuration
- [ ] Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com/) in **Test Mode**.
- [ ] Navigate to **Settings → Webhooks → Add New Webhook**.
- [ ] Enter Webhook URL: `https://<your-netlify-site>.netlify.app/api/webhooks/payment` (or your active `ngrok` URL for local testing).
- [ ] Set Secret: Enter the exact value matching `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Select Active Events:
  - `payment.captured`
  - `payment.failed`
  - `order.paid`

### Step 3: Test Payment Scenarios
- [ ] **Scenario A: Successful Payment (Card)**
  - Open the website, click "ADD YOUR LIGHT", select ₹25, enter dedication.
  - Razorpay checkout modal opens with order details.
  - Use Razorpay Test Card: `4111 1111 1111 1111`, any future expiry, any CVV. Enter OTP `1234`.
  - Verify: Modal closes, beacon ignites on Earth, camera flies to coordinates.
  - Verify Database: Status transitions to `confirmed` in Supabase `contributions` table.
- [ ] **Scenario B: Successful Payment (UPI)**
  - Repeat flow using UPI test VPA: `success@razorpay`.
  - Verify confirmation and appearance on the leaderboard.
- [ ] **Scenario C: User Dismissal / Cancellation**
  - Open checkout modal, click the "X" close icon or click outside to dismiss.
  - Verify: Notice displays "Checkout cancelled. Your light has not been confirmed."
  - Verify Database: No confirmed record is saved.
- [ ] **Scenario D: Payment Failure**
  - Use Razorpay Failure Test Card or UPI VPA: `failure@razorpay`.
  - Verify: Error message displays "Payment failed. Please try again."
  - Verify Database: Record is marked `failed` and never appears in public view.
- [ ] **Scenario E: Webhook Delivery & Idempotency**
  - Inspect Razorpay Webhook Log in Dashboard: Status `200 OK`.
  - Trigger "Resend Webhook" in Razorpay Dashboard.
  - Verify: Server returns `alreadyProcessed: true`, HTTP 200, without duplicate records.

### Step 4: Restore Safe Default
- [ ] Revert `NEXT_PUBLIC_APP_MODE=demo` in `.env.local` or Netlify Environment Variables.
- [ ] Verify that demo mode operates normally without attempting real gateway orders.

---

## 6. Verification Status

- **Automated Tests:** 25/25 passing (`test/phase5.test.mjs`, `test/phase6b-e2e-audit.test.mjs`, `test/phase6c-razorpay.test.mjs`, `test/trust-and-legal.test.mjs`).
- **Remote Persistence:** 6/6 stages passing against live Supabase (`scripts/test-persistence.ts`).
- **TypeScript:** 0 type errors across all routes (`npx tsc --noEmit`).
- **Production Build:** 17/17 routes compiled successfully (`npm run build`).
- **Current Mode:** `NEXT_PUBLIC_APP_MODE=demo` strictly active.
