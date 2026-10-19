-- ==============================================================================
-- GLOBAL DIGITAL MONUMENT — PRODUCTION CONTRIBUTIONS SCHEMA
-- Migration: 20261019000000_production_contributions_schema.sql
-- Database: PostgreSQL 14+ / Supabase
-- Description: Persistent storage for contributions, public view, and idempotent webhooks.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CONTRIBUTIONS TABLE
-- Stores both public contributor metadata and private payment transaction identifiers.
CREATE TABLE IF NOT EXISTS public.contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Financial & status details
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 10.00 AND amount <= 1000000.00),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled')),

    -- Contributor display preferences
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    contributor_name VARCHAR(80) NOT NULL DEFAULT 'A Kind Soul',
    message VARCHAR(280),
    photo_url TEXT,

    -- Geographic coordinates (spherical globe placement)
    latitude NUMERIC(10, 6) NOT NULL CHECK (latitude >= -90.000000 AND latitude <= 90.000000),
    longitude NUMERIC(10, 6) NOT NULL CHECK (longitude >= -180.000000 AND longitude <= 180.000000),
    is_approximate BOOLEAN NOT NULL DEFAULT false,
    city VARCHAR(100),
    country VARCHAR(100) NOT NULL DEFAULT 'Global',

    -- Demonstration isolation flag
    is_demo BOOLEAN NOT NULL DEFAULT false,

    -- Private payment provider details (NEVER EXPOSED PUBLICLY)
    payment_provider VARCHAR(30), -- 'razorpay' | 'stripe'
    payment_reference VARCHAR(120) UNIQUE, -- order_id or payment_intent_id
    payment_signature VARCHAR(255),
    client_secret VARCHAR(255),
    donor_email VARCHAR(255), -- For payment receipt only, strictly private

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    confirmed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. PROCESSED WEBHOOK EVENTS TABLE (IDEMPOTENCY)
-- Ensures duplicate webhook deliveries from payment gateways are safely ignored.
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
    event_id VARCHAR(120) PRIMARY KEY, -- gateway event_id / delivery_id
    provider VARCHAR(30) NOT NULL,     -- 'razorpay' | 'stripe'
    event_type VARCHAR(80) NOT NULL,
    payment_reference VARCHAR(120),
    payload_hash VARCHAR(64),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. PERFORMANCE INDEXES
-- Optimal index for calculating leaderboard rankings (confirmed only, amount DESC, earlier created_at ASC)
CREATE INDEX IF NOT EXISTS idx_contributions_ranking 
    ON public.contributions (status, amount DESC, created_at ASC)
    WHERE status = 'confirmed';

-- Index for spatial coordinates queries on confirmed lights
CREATE INDEX IF NOT EXISTS idx_contributions_coords 
    ON public.contributions (latitude, longitude)
    WHERE status = 'confirmed';

-- Index for payment reference lookups during webhook processing
CREATE INDEX IF NOT EXISTS idx_contributions_payment_ref 
    ON public.contributions (payment_reference);

-- Index for idempotency lookups
CREATE INDEX IF NOT EXISTS idx_webhook_processed_at 
    ON public.processed_webhook_events (processed_at DESC);

-- 5. PUBLIC VIEW: PUBLIC_CONTRIBUTIONS
-- This view strips all private transaction IDs, donor emails, and webhook signatures.
-- Only confirmed contributions are visible. If anonymous, contributor_name is masked.
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
WHERE status = 'confirmed';

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- Allow public read access ONLY to confirmed contributions via standard SELECT
CREATE POLICY "Public can view confirmed contributions" 
    ON public.contributions
    FOR SELECT
    USING (status = 'confirmed');

-- Restrict all INSERT, UPDATE, DELETE on contributions to the service_role (backend API only)
CREATE POLICY "Service role has full access to contributions" 
    ON public.contributions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Restrict processed_webhook_events exclusively to the service_role
CREATE POLICY "Service role has full access to webhook idempotency" 
    ON public.processed_webhook_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 7. AUTOMATIC UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.update_contributions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_contributions_updated_at ON public.contributions;
CREATE TRIGGER trigger_contributions_updated_at
    BEFORE UPDATE ON public.contributions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_contributions_timestamp();

-- 8. REALTIME REPLICATION (For Supabase Realtime)
-- Enable realtime publication for confirmed contributions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.contributions;
    END IF;
END $$;
