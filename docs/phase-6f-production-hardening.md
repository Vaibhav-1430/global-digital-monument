# Global Digital Monument — Phase 6F Production-Hardening Audit Report

**Scope:** Production-Hardening Audit: Abuse Protection, Serverless Context Isolation, Payment Cryptography, and Legal Disclosures  
**Target Environment:** Netlify Serverless Runtime (Next.js 16.4.2 App Router with Turbopack)  
**Database:** Supabase Managed PostgreSQL (Row Level Security Enforced)  
**Payment Gateway:** Razorpay Sandbox / Test Mode (INR Default)  
**Mode Constraint:** Production remains strictly `NEXT_PUBLIC_APP_MODE=demo`  
**Date:** October 2026  

---

## 1. Executive Summary & Verdict

### Final Verdict: **READY FOR SANDBOX TESTING**

> [!IMPORTANT]
> **Safety Constraints Enforced:**
> - **Production Mode Constraint:** Production environment remains strictly locked to `NEXT_PUBLIC_APP_MODE=demo`.
> - **Live Payments Disabled:** Razorpay Live Mode credentials (`rzp_live_*`) are strictly blocked at the application level; live payments cannot be initiated.
> - **Sandbox Scope:** Only Razorpay Test Mode credentials (`rzp_test_*`) may be utilized within isolated Netlify Deploy Preview contexts.
> - **Live Launch Blockers:** Production live payments are **NOT APPROVED**. A formal payment provider merchant onboarding audit and real legal registration confirmation must occur before any transition to live billing.

---

## 2. Severity-Ranked Findings Matrix

| Finding ID | Domain | Description | Severity | Status / Resolution |
|---|---|---|---|---|
| **HARDEN-01** | **Abuse & Rate Limiting** | `/api/contributions/create-intent` lacked distributed rate limiting. An attacker could flood the gateway with pending order requests. | **High** | **Resolved.** Implemented [`src/lib/security/rateLimiter.ts`](file:///d:/Projects/Something/src/lib/security/rateLimiter.ts) supporting atomic Upstash Redis REST pipelines with sliding-window in-memory fallback. Enforces max 15 intent requests / 5 min per IP with standard `X-RateLimit-*` and `Retry-After` headers. |
| **HARDEN-02** | **Deploy Context Isolation** | Netlify environment variables required strict deploy-context scoping to ensure preview testing cannot accidentally alter production behavior. | **High** | **Resolved.** Configured explicit context blocks in [`netlify.toml`](file:///d:/Projects/Something/netlify.toml) (`context.production.environment` locks `NEXT_PUBLIC_APP_MODE = "demo"`; `context.deploy-preview.environment` allows `production` test checkout). |
| **HARDEN-03** | **Live Credential Prevention** | Defense-in-depth safeguard needed to prevent accidental execution of real financial charges if live keys are mistakenly injected into test environments. | **High** | **Resolved.** Added hard guard in [`src/lib/payments/provider.ts`](file:///d:/Projects/Something/src/lib/payments/provider.ts) that rejects any key starting with `rzp_live` immediately before network dispatch. |
| **HARDEN-04** | **Amount / Currency Tampering** | Payment gateway payloads could attempt underpayment or currency arbitrage (e.g. sending 500 USD instead of 500 INR, or fractional underpayment). | **Medium** | **Verified & Tested.** Enforces strict ₹0.01 tolerance (`Math.abs(dbAmount - gatewayAmount) < 0.01`) and case-insensitive currency comparison (`expectedCurrency === dbCurrency`). Verified in [`test/phase6f-hardening.test.mjs`](file:///d:/Projects/Something/test/phase6f-hardening.test.mjs). |
| **HARDEN-05** | **Out-of-Order Webhook Protection** | Delayed bank failure notifications arriving after a user already completed payment could theoretically overwrite a confirmed status. | **Medium** | **Verified & Tested.** `markContributionFailed` enforces `.eq('status', 'pending')` in PostgreSQL. Once a contribution is `confirmed`, delayed failure events are rejected as no-ops. |
| **HARDEN-06** | **Serverless SSE Stream Dropping** | Netlify serverless functions run ephemeral AWS Lambda instances with 10–26s execution limits and isolated memory, rendering in-memory SSE clients unable to receive cross-instance broadcasts. | **Medium** | **Documented & Mitigated.** Client hook [`src/hooks/useContributions.ts`](file:///d:/Projects/Something/src/hooks/useContributions.ts) provides robust resilience (tab visibility refresh, 60s background polling fallback, and 3-strike connection failure disconnect). Supabase Realtime migration plan detailed below. |
| **HARDEN-07** | **Inquiry Abuse on Contact Form** | `/api/contact` used an ad-hoc local map for rate limiting, risking memory leaks or per-container bypasses. | **Low** | **Resolved.** Migrated `/api/contact` to the unified [`src/lib/security/rateLimiter.ts`](file:///d:/Projects/Something/src/lib/security/rateLimiter.ts) module (5 inquiries / 15 min per IP), returning standard rate limit headers. |
| **HARDEN-08** | **Legal & Identity Consistency** | Public entity disclosures must align across all policies, modal footers, and contact handlers. | **Low** | **Audited.** Entity name `Immortal` and support email `printkaro.org@gmail.com` are consistently wired via `.env.local` fallbacks across all 7 legal routes. Physical address flagged for final merchant verification. |

---

## 3. Detailed Changes Implemented

### 3.1 Shared Serverless-Safe Rate Limiting Module
- **File:** [`src/lib/security/rateLimiter.ts`](file:///d:/Projects/Something/src/lib/security/rateLimiter.ts)
- **Features:**
  1. **Safe IP Extraction:** `getClientIp(req)` inspects `x-forwarded-for` (first hop), `x-real-ip`, and `cf-connecting-ip`, defaulting safely to `127.0.0.1`.
  2. **Distributed Redis Pipeline:** If `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set in the environment, executes an atomic HTTP REST pipeline (`INCR`, `EXPIRE NX`, `TTL`), ensuring zero socket leaks and true cross-instance coordination across Netlify edge/serverless functions.
  3. **Local Sliding-Window Fallback:** If Redis is unconfigured or unreachable, automatically falls back to an in-memory sliding window cache per serverless worker with periodic cleanup (every 60s) to prevent memory growth.
  4. **Standard HTTP Headers:** Returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After`.
- **Integrated Routes:**
  - `POST /api/contributions/create-intent`: Max 15 attempts per 5 minutes per IP.
  - `POST /api/contact`: Max 5 inquiries per 15 minutes per IP.

### 3.2 Netlify Deploy Context Isolation
- **File:** [`netlify.toml`](file:///d:/Projects/Something/netlify.toml)
- **Configuration:**
  ```toml
  # Production: Strictly demo mode to guarantee zero live charges
  [context.production.environment]
    NEXT_PUBLIC_APP_MODE = "demo"

  # Deploy Previews: Activate production code path solely for testing checkout with Razorpay TEST credentials
  [context.deploy-preview.environment]
    NEXT_PUBLIC_APP_MODE = "production"

  # Branch Deploys: Default to demo mode
  [context.branch-deploy.environment]
    NEXT_PUBLIC_APP_MODE = "demo"
  ```

### 3.3 Strict Razorpay Live Credential Blocker
- **File:** [`src/lib/payments/provider.ts`](file:///d:/Projects/Something/src/lib/payments/provider.ts)
- **Safeguard:**
  ```ts
  if (keyId.startsWith('rzp_live')) {
    throw new Error('Razorpay Live Mode is strictly disabled. Only Razorpay Test Mode (rzp_test_*) credentials are permitted.');
  }
  ```

### 3.4 Hardening & Concurrency Test Suite
- **File:** [`test/phase6f-hardening.test.mjs`](file:///d:/Projects/Something/test/phase6f-hardening.test.mjs)
- **Test Scenarios:**
  1. *Rate Limiting & Client IP Extraction:* Validates multi-proxy header parsing, sliding-window exhaustion, `Retry-After` calculation, and response header formatting.
  2. *Webhook Cryptography Edge Cases:* Rejects empty signatures, bad length signatures, and malformed non-JSON payloads without uncaught exceptions.
  3. *Amount & Currency Tamper Detection:* Rejects underpayment (₹499 vs ₹500), fractional discrepancy (₹500.05 vs ₹500), and currency mismatch (`USD` vs `INR`).
  4. *Out-of-Order Safety:* Verifies that `markContributionFailed` cannot overwrite an already confirmed record in PostgreSQL.
  5. *Live Mode Guard:* Validates that `rzp_live_*` credentials throw an immediate exception.

---

## 4. Test Verification Results

### 4.1 Automated Test Suite (`npm test`)
```
> global-digital-monument@0.1.0 test
> tsx --test test/phase5.test.mjs test/phase6b-e2e-audit.test.mjs test/phase6c-razorpay.test.mjs test/trust-and-legal.test.mjs test/phase6f-hardening.test.mjs

✔ Amount Validation — Validates amounts within ₹10 to ₹1,000,000 (1.1157ms)
✔ Location Validation — Enforces strict latitude & longitude bounds (0.1847ms)
✔ Text Sanitization — Strips HTML and limits length (0.1556ms)
✔ Ranking — Orders by amount DESC, with earlier timestamp as tie-breaker (0.2104ms)
✔ Razorpay Webhook Verification — Validates HMAC SHA-256 and rejects tampering (0.4664ms)
✔ Stripe Webhook Verification — Validates timestamped signature (0.2791ms)
✔ Public Data Filtering — Strips private transaction references and donor email (41.645ms)
✔ Demo Mode Isolation — Default app mode is demo and safe (0.1684ms)
✔ Deduplication — Prevents duplicate marker IDs in collection (0.1679ms)
✔ UUID Generation — createPendingContributionRecord generates PostgreSQL-compliant UUID (1138.1319ms)
✔ Razorpay Webhook — Enforces HMAC-SHA256 verification and extracts payment metadata (0.4901ms)
✔ Stripe Webhook — Enforces timestamp freshness tolerance (< 300s) to prevent replay attacks (0.2736ms)
✔ Payment Confirmation — Rejects underpayment or currency tampering (1443.3711ms)
✔ Payment Failure — Failed payment terminates contribution and prevents confirmation (776.6766ms)
✔ Data Sanitization — Public marker mapping strips all gateway secrets, donor emails, and signatures (0.5167ms)
✔ Deterministic Ranking — Strict amount DESC, timestamp ASC tie-breaker, and ID fallback (1.2524ms)
✔ Razorpay Checkout Signature — Validates HMAC-SHA256(order_id|payment_id, secret) (2.5531ms)
✔ Razorpay Webhook — Validates raw payload HMAC, amount, and currency matching (0.5474ms)
✔ Razorpay Test-Mode Lifecycle — Pending record -> Verified confirmation -> Idempotent re-check (1984.6588ms)
✔ Checkout Cancellation & Failure — Records remain unconfirmed and safe (949.8478ms)
✔ Security — Server secrets are never exposed in public markers or outputs (1.2297ms)
✔ Rate Limiter — Enforces threshold, returns correct headers, and extracts IP safely (16.2334ms)
✔ Webhook Cryptography — Handles malformed payloads and signatures safely (0.9183ms)
✔ Amount & Currency Verification — Rejects underpayment, overpayment, and currency tampering (1941.5034ms)
✔ Out-of-Order Safety — markContributionFailed cannot overwrite an already confirmed record (1201.1066ms)
✔ Live Mode Safety Guard — createPaymentOrder strictly rejects Razorpay Live credentials (1.308ms)
✔ Central Business Info — Safe fallbacks and configuration parsing (2.2247ms)
✔ Contact API — Validates inputs, rejects spam honeypots, and generates reference IDs (3.386ms)
✔ Trust & Legal Pages — Route existence and content disclosure verification (11.4431ms)
✔ Navigation Integration — SiteFooter and modal links contain all trust routes (3.1185ms)

ℹ tests 30 | suites 0 | pass 30 | fail 0 | cancelled 0 | skipped 0 | duration 5.15s
```

### 4.2 Supabase Remote Database Persistence (`npm run test:persistence`)
```
================================================================
GLOBAL DIGITAL MONUMENT — PHASE 6A PERSISTENCE VERIFICATION
================================================================
✔ [CLIENT_INIT] Service-role client initialized successfully (secrets securely handled).
✔ [INSERT_PENDING] Record inserted with status='pending' and is_demo=true (UUID: 2407c69d-5c2f-4c85-b4a0-912a8ef9df5a).
✔ [PENDING_VIEW_EXCLUSION] Confirmed pending record is completely excluded from public.public_contributions.
✔ [UPDATE_CONFIRMED] Record transitioned to status='confirmed' at 2026-10-19T18:46:14.275Z.
✔ [CONFIRMED_VIEW_RETRIEVAL] Confirmed record retrieved via public.public_contributions with correct values.

--- Cleanup Stage ---
✔ [CLEANUP_AND_VERIFICATION] Test record 2407c69d-5c2f-4c85-b4a0-912a8ef9df5a deleted and verified absent from table and view.

================================================================
PERSISTENCE VERIFICATION SUMMARY
================================================================
ALL PERSISTENCE VERIFICATION CHECKS PASSED SUCCESSFULLY.
```

### 4.3 TypeScript Strict Typecheck (`npx tsc --noEmit`)
```
Exit code: 0 (Zero diagnostic errors across entire repository)
```

### 4.4 Production Build Output (`npm run build`)
```
▲ Next.js 16.4.2 (Turbopack)
- Environments: .env.local
✓ Compiled successfully in 9.2s
Finished TypeScript in 3.1s ...
✓ Generating static pages using 18 workers (17/17) in 1605ms

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

## 5. Serverless SSE Assessment & Supabase Realtime Migration Plan

### 5.1 Current Netlify Execution Profile
- **Architecture:** The current real-time SSE stream (`/api/realtime/stream`) registers clients into an in-memory `Set<SseClient>`.
- **Limitation:** In Netlify Functions (AWS Lambda), invocations are distributed across multiple ephemeral worker nodes. Worker instances do not share heap memory. If User A connects to Worker 1 and a payment webhook arrives at Worker 2, Worker 2's broadcast cannot reach User A. Furthermore, Netlify Functions terminate after 10–26 seconds, interrupting long-lived streams.
- **Current Resilient Fallback:** 
  The client hook [`src/hooks/useContributions.ts`](file:///d:/Projects/Something/src/hooks/useContributions.ts) already handles this cleanly without errors:
  1. *Tab Focus Sync:* Listens to `document.addEventListener('visibilitychange')` to instantly fetch fresh contributions whenever the user returns to the tab.
  2. *Background Polling:* Maintains a 60-second periodic background poll to `GET /api/contributions`.
  3. *Error Circuit Breaker:* Tracks consecutive SSE disconnections and backs off gracefully after 3 attempts, avoiding serverless function invocation spam.

### 5.2 Practical Supabase Realtime Migration Plan
To achieve zero-polling real-time updates at global scale without rewrite risks:
1. **Enable Realtime on PostgreSQL:**  
   In Supabase Dashboard (or via migration):
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.contributions;
   ```
2. **Client-Side WebSocket Hook (Future Enhancement):**  
   In `src/hooks/useContributions.ts`, connect directly to Supabase Realtime WebSockets:
   ```ts
   const channel = supabase
     .channel('public:contributions')
     .on(
       'postgres_changes',
       { event: 'INSERT', schema: 'public', table: 'contributions', filter: 'status=eq.confirmed' },
       (payload) => {
         const newMarker = mapDbRowToPublicMarker(payload.new);
         setMarkers((prev) => deduplicateAndRank([newMarker, ...prev]));
       }
     )
     .subscribe();
   ```
3. **Benefits:** Completely bypasses Netlify serverless functions for SSE, eliminates function timeout bills, and leverages Supabase's managed Phoenix/Elixir WebSocket cluster.

---

## 6. Trust & Legal Configuration Audit

| Item | Configured Value | Source | Audit Status |
|---|---|---|---|
| **Public Operator Name** | `Immortal` | `NEXT_PUBLIC_LEGAL_ENTITY_NAME` (`.env.local`) | Verified consistent across `/about`, `/terms`, `/privacy`, `/refund-policy`, `/contribution-policy`, `/payment-support`, `/contact`. |
| **Public Support Contact** | `printkaro.org@gmail.com` | `NEXT_PUBLIC_SUPPORT_EMAIL` (`.env.local`) | Verified consistent across all 7 Trust pages and footer. |
| **Refund Policy** | Voluntary non-profit digital monument contribution; non-refundable once committed. 7-day review for accidental duplicate transactions. | [`src/app/refund-policy/page.tsx`](file:///d:/Projects/Something/src/app/refund-policy/page.tsx) | Complete and legally coherent. |
| **Contribution Policy** | Community standards, zero tolerance for defamation/hate, permanent dedication rights, non-commercial status. | [`src/app/contribution-policy/page.tsx`](file:///d:/Projects/Something/src/app/contribution-policy/page.tsx) | Complete. |
| **Payment Disclosures** | PCI-DSS compliant checkout via Razorpay / Stripe; explicit notice that card/UPI credentials are never collected or stored on our servers. | [`src/app/payment-support/page.tsx`](file:///d:/Projects/Something/src/app/payment-support/page.tsx) | Complete and prominent. |

### Human Confirmation Required Prior to Commercial Launch
- [ ] **Legal Registration:** Confirm whether `Immortal` is the legally registered company entity, LLP, or registered trademark with tax authorities (GSTIN/PAN).
- [ ] **Registered Office Address:** Update placeholder address in Terms and Privacy (`Operational Office, Bangalore, Karnataka, India`) with official statutory registration address.
- [ ] **Support Inbox:** Confirm `printkaro.org@gmail.com` is actively monitored and has SPF/DKIM configured for outbound responses.

---

## 7. Launch Blockers & Unresolved Risks

1. **Production Live Payments Blocked:**  
   - Current release is authorized **strictly for Sandbox / Deploy Preview testing**.
   - Razorpay Live Mode must remain disabled until a complete merchant KYC verification, live webhook endpoint registration, and final security sign-off are completed.
2. **Upstash Redis Configuration (Recommended for High Volume):**  
   - While in-memory sliding window rate limiting is active per container, setting `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Netlify environment variables is recommended for distributed synchronization across all global edge instances.
3. **Webhook Secret Alignment in Netlify:**  
   - When deploying to Netlify, ensure `RAZORPAY_WEBHOOK_SECRET` in Netlify Environment Variables matches the secret string entered in Razorpay Dashboard > Webhooks.
