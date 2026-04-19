-- Migration 016: Create delivery_partners table (task 13.2)
-- Stores delivery partner profiles, KYC status, vehicle info, and online status

CREATE TABLE IF NOT EXISTS public.delivery_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Phone (from profile)
  phone TEXT NOT NULL,
  
  -- KYC Documents
  aadhaar_last4 VARCHAR(4),
  aadhaar_verified_at TIMESTAMPTZ,
  
  -- Vehicle info
  vehicle_photo_url TEXT,
  vehicle_verified_at TIMESTAMPTZ,
  
  -- Bank account for earnings
  bank_account_number VARCHAR(20),
  bank_ifsc VARCHAR(11),
  bank_account_name TEXT,
  
  -- KYC status: pending_kyc, pending_review, approved, rejected
  kyc_status VARCHAR(50) DEFAULT 'pending_kyc' NOT NULL,
  kyc_rejected_reason TEXT,
  
  -- Online/offline status
  is_online BOOLEAN DEFAULT FALSE,
  last_online_at TIMESTAMPTZ,
  
  -- GPS location (updated every 5 seconds when is_online=true)
  current_lat NUMERIC(10, 8),
  current_lng NUMERIC(11, 8),
  gps_updated_at TIMESTAMPTZ,
  
  -- Earnings & ratings
  earnings_today NUMERIC(10, 2) DEFAULT 0,
  earnings_total NUMERIC(15, 2) DEFAULT 0,
  rating NUMERIC(3, 1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  completed_deliveries INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_delivery_partners_user_id ON public.delivery_partners(user_id);
CREATE INDEX idx_delivery_partners_phone ON public.delivery_partners(phone);
CREATE INDEX idx_delivery_partners_kyc_status ON public.delivery_partners(kyc_status);
CREATE INDEX idx_delivery_partners_is_online ON public.delivery_partners(is_online);
CREATE INDEX idx_delivery_partners_rating ON public.delivery_partners(rating DESC);
CREATE INDEX idx_delivery_partners_geo ON public.delivery_partners(current_lat, current_lng)
  WHERE is_online = true;

-- RLS: Delivery partners can see their own profile only
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY delivery_partners_select_own
  ON public.delivery_partners FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY delivery_partners_update_own
  ON public.delivery_partners FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin can see all
CREATE POLICY delivery_partners_admin_all
  ON public.delivery_partners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
