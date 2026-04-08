-- Create shops table (referenced by profiles.shop_id)

CREATE TABLE IF NOT EXISTS public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner relationship
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  phone TEXT NOT NULL,
  description TEXT,

  -- Status
  is_open BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  trust_score DECIMAL(3,1) DEFAULT 50.0,

  -- Geo
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  address TEXT,
  city TEXT,

  -- KYC
  kyc_document_url TEXT,
  kyc_document_expires_at TIMESTAMP WITH TIME ZONE,
  kyc_status TEXT DEFAULT 'pending_kyc',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shops_owner_id ON public.shops(owner_id);
CREATE INDEX idx_shops_verified ON public.shops(is_verified);
CREATE INDEX idx_shops_city ON public.shops(city);
CREATE INDEX idx_shops_kyc_status ON public.shops(kyc_status);
