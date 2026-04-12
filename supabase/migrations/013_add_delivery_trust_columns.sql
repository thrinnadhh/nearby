-- Migration 013: Add delivery partner and trust columns
-- Extends shops table with trust score, delivery OTP, and partner ratings

-- Add trust columns to shops table
ALTER TABLE IF EXISTS public.shops
  ADD COLUMN IF NOT EXISTS trust_score NUMERIC(5, 2) DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
  ADD COLUMN IF NOT EXISTS trust_badge VARCHAR(50),
  ADD COLUMN IF NOT EXISTS completion_rate NUMERIC(5, 2) DEFAULT 0 CHECK (completion_rate >= 0 AND completion_rate <= 100),
  ADD COLUMN IF NOT EXISTS response_score NUMERIC(5, 2) DEFAULT 0 CHECK (response_score >= 0 AND response_score <= 100),
  ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_shops_trust_score
  ON public.shops(trust_score DESC);

-- Delivery OTP stored in orders table (4-digit code)
ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS delivery_otp CHAR(4),
  ADD COLUMN IF NOT EXISTS delivery_otp_attempts SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_otp_locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;

-- Delivery partner ratings (shop ratings of delivery partners)
CREATE TABLE IF NOT EXISTS public.delivery_partner_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_partner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_delivery_ratings_order UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_ratings_partner
  ON public.delivery_partner_ratings(delivery_partner_id);

CREATE INDEX IF NOT EXISTS idx_delivery_ratings_shop
  ON public.delivery_partner_ratings(shop_id);

CREATE INDEX IF NOT EXISTS idx_delivery_ratings_created_at
  ON public.delivery_partner_ratings(created_at DESC);

-- GPS trail for active disputes (temporary storage, 30-day retention)
CREATE TABLE IF NOT EXISTS public.gps_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_partner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  accuracy_meters NUMERIC(8, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gps_trail_order_id
  ON public.gps_trail(order_id);

CREATE INDEX IF NOT EXISTS idx_gps_trail_created_at
  ON public.gps_trail(created_at DESC);

-- Auto-delete GPS trail after 30 days (run periodically)
-- SELECT delete_old_gps_trail(); -- Optional: daily cleanup job
