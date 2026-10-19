# GLOBAL DIGITAL MONUMENT — DATABASE ARCHITECTURE & DATA MODEL

## 1. Overview
The persistent backend architecture for Global Digital Monument utilizes PostgreSQL (managed via Supabase) to guarantee strict data integrity, financial auditing, and real-time synchronization with client 3D globes worldwide.

## 2. Table Specifications

### `public.contributions`
Stores every contribution order from initial intent through final verified payment confirmation.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique identifier for the contribution |
| `amount` | `NUMERIC(12, 2)` | NOT NULL, CHECK (amount >= 10.00 AND amount <= 1000000.00) | Contribution amount (in INR) |
| `currency` | `VARCHAR(3)` | NOT NULL, DEFAULT `'INR'` | Currency code |
| `status` | `VARCHAR(20)` | NOT NULL, CHECK IN ('pending', 'confirmed', 'failed', 'cancelled') | Current lifecycle status |
| `is_anonymous` | `BOOLEAN` | NOT NULL, DEFAULT `false` | If true, masked in public views |
| `contributor_name` | `VARCHAR(80)` | NOT NULL, DEFAULT `'A Kind Soul'` | Contributor display name |
| `message` | `VARCHAR(280)` | NULLABLE | Optional dedication message |
| `photo_url` | `TEXT` | NULLABLE | Optional local/remote photo URL |
| `latitude` | `NUMERIC(10, 6)` | NOT NULL, CHECK (-90.0 <= latitude <= 90.0) | Geographic latitude for 3D globe |
| `longitude` | `NUMERIC(10, 6)` | NOT NULL, CHECK (-180.0 <= longitude <= 180.0) | Geographic longitude for 3D globe |
| `is_approximate` | `BOOLEAN` | NOT NULL, DEFAULT `false` | True if derived from country centroid |
| `city` | `VARCHAR(100)` | NULLABLE | Geographic city / region |
| `country` | `VARCHAR(100)` | NOT NULL, DEFAULT `'Global'` | Geographic country |
| `is_demo` | `BOOLEAN` | NOT NULL, DEFAULT `false` | Flag isolating simulated test records |
| `payment_provider` | `VARCHAR(30)` | NULLABLE | Payment gateway ('razorpay' or 'stripe') |
| `payment_reference` | `VARCHAR(120)` | UNIQUE, NULLABLE | Provider order/payment ID (e.g. `order_...`) |
| `payment_signature` | `VARCHAR(255)` | NULLABLE | Verified cryptographic webhook signature |
| `client_secret` | `VARCHAR(255)` | NULLABLE | Provider client secret for checkout |
| `donor_email` | `VARCHAR(255)` | NULLABLE | Donor email for payment receipts ONLY |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Timestamp of contribution creation |
| `confirmed_at` | `TIMESTAMPTZ` | NULLABLE | Timestamp of verified payment webhook |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Automatically updated via trigger |

### `public.processed_webhook_events`
Guarantees idempotent webhook processing to prevent double-confirmations or duplicate beacon activations.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `event_id` | `VARCHAR(120)` | PRIMARY KEY | Unique webhook delivery ID from payment gateway |
| `provider` | `VARCHAR(30)` | NOT NULL | 'razorpay' or 'stripe' |
| `event_type` | `VARCHAR(80)` | NOT NULL | e.g. `payment_intent.succeeded` |
| `payment_reference` | `VARCHAR(120)` | NULLABLE | Related contribution order/intent ID |
| `payload_hash` | `VARCHAR(64)` | NULLABLE | SHA-256 hash of webhook payload |
| `processed_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Processing timestamp |

---

## 3. Security & Row Level Security (RLS) Policies

1. **Strict Payment Segregation**:
   - Private payment identifiers (`payment_reference`, `payment_signature`, `client_secret`) and `donor_email` are **never** returned to public API callers.
   - The view `public.public_contributions` filters out all internal transaction details and masks anonymous names.
2. **Access Control**:
   - `anon` / Public key: Only permitted to `SELECT` confirmed rows (`status = 'confirmed'`). Cannot `INSERT`, `UPDATE`, or `DELETE`.
   - `service_role` (Server-side API only): Possesses full authorization to insert pending contributions and update status to confirmed upon verified cryptographic webhook receipt.
3. **Credit Card Storage**:
   - No payment card credentials (PAN, CVV, expiry) are ever received or stored by our servers. All card data is handled directly by PCI-DSS compliant providers (Stripe/Razorpay Elements).

---

## 4. Indexing Strategy

- `idx_contributions_ranking`: High-speed compound index on `(status, amount DESC, created_at ASC) WHERE status = 'confirmed'`. Enables sub-millisecond leaderboard calculation for millions of lights.
- `idx_contributions_coords`: Spatial lookup index for confirmed surface beacons.
- `idx_contributions_payment_ref`: Hash/B-tree index for instant webhook reconciliation by payment reference.

---

## 5. Data Privacy & GDPR Compliance

- **Right to Erasure**: Donors can request removal of their display name or dedication via support without destroying financial transaction logs (anonymizing the record in place).
- **Coordinate Privacy**: Exact coordinates require explicit user action (direct globe raycast or browser geolocation consent). General region selections default to country centroids with `is_approximate = true`.
