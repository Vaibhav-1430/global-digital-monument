-- ==============================================================================
-- GLOBAL DIGITAL MONUMENT — UPI QR & MANUAL PAYMENT VERIFICATION SCHEMA
-- Migration: 20261021000000_upi_qr_manual_verification.sql
-- Database: PostgreSQL 14+ / Supabase
-- Description:
--   Supports UPI QR payment flow and manual administrative verification.
--   Preserves all historical Razorpay and Stripe transaction records.
--   Expands status workflow: pending -> verification_submitted -> verified / rejected.
--
-- Rollback Implications:
--   To roll back, drop the new columns (claimed_transaction_ref, verification_submitted_at,
--   reviewed_by, reviewed_at, review_note) and recreate public_contributions view
--   with WHERE status = 'confirmed'. Historical data is preserved.
-- ==============================================================================

-- 1. ADD AUDIT AND MANUAL VERIFICATION COLUMNS
ALTER TABLE public.contributions
    ADD COLUMN IF NOT EXISTS claimed_transaction_ref VARCHAR(100),
    ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(120),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS review_note TEXT;

-- 2. EXPAND STATUS CHECK CONSTRAINT TO INCLUDE VERIFICATION STATES
DO $$
BEGIN
    -- Drop existing check constraint on status if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'contributions_status_check' 
        AND table_name = 'contributions'
    ) THEN
        ALTER TABLE public.contributions DROP CONSTRAINT contributions_status_check;
    END IF;
END $$;

ALTER TABLE public.contributions
    ADD CONSTRAINT contributions_status_check
    CHECK (status IN ('pending', 'verification_submitted', 'verified', 'confirmed', 'rejected', 'failed', 'cancelled'));

-- 3. UPDATE PUBLIC VIEW: PUBLIC_CONTRIBUTIONS
-- Only 'confirmed' (historical) and 'verified' (UPI / manual approval) contributions are visible to the public.
-- Pending, verification_submitted, and rejected orders remain strictly invisible.
CREATE OR REPLACE VIEW public.public_contributions AS
SELECT
    id,
    amount,
    currency,
    is_anonymous,
    CASE 
        WHEN is_anonymous = true THEN 'Anonymous'
        ELSE contributor_name
    END AS contributor_name,
    message,
    photo_url,
    latitude,
    longitude,
    is_approximate,
    city,
    country,
    is_demo,
    created_at,
    confirmed_at
FROM public.contributions
WHERE status IN ('confirmed', 'verified');

-- 4. UPDATE INDEXES FOR PERFORMANCE & AUDIT QUERIES
-- Index for administrator review queries (pending and verification_submitted)
CREATE INDEX IF NOT EXISTS idx_contributions_review_queue
    ON public.contributions (status, created_at DESC)
    WHERE status IN ('pending', 'verification_submitted');

-- Drop old ranking index and replace with verified/confirmed inclusive index
DROP INDEX IF EXISTS idx_contributions_ranking;
CREATE INDEX IF NOT EXISTS idx_contributions_ranking
    ON public.contributions (status, amount DESC, created_at ASC)
    WHERE status IN ('confirmed', 'verified');

-- Spatial coordinates index for confirmed/verified lights
DROP INDEX IF EXISTS idx_contributions_coords;
CREATE INDEX IF NOT EXISTS idx_contributions_coords
    ON public.contributions (latitude, longitude)
    WHERE status IN ('confirmed', 'verified');

-- Replay Protection: Ensure no two verified or confirmed payments can share the same transaction reference (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contributions_verified_txn_ref
    ON public.contributions (UPPER(claimed_transaction_ref))
    WHERE status IN ('confirmed', 'verified') AND claimed_transaction_ref IS NOT NULL;

-- Index on claimed transaction reference for pending review deduplication checks
CREATE INDEX IF NOT EXISTS idx_contributions_claimed_ref
    ON public.contributions (claimed_transaction_ref)
    WHERE claimed_transaction_ref IS NOT NULL;

-- 5. UPDATE ROW LEVEL SECURITY (RLS) POLICIES FOR VERIFIED STATUS
-- Allow public read access to both historical 'confirmed' and manual 'verified' contributions
DROP POLICY IF EXISTS "Public can view confirmed contributions" ON public.contributions;
CREATE POLICY "Public can view confirmed contributions" 
    ON public.contributions
    FOR SELECT
    USING (status IN ('confirmed', 'verified'));

-- 6. PERMISSIONS & GRANTS
GRANT SELECT ON public.public_contributions TO anon, authenticated, service_role;
