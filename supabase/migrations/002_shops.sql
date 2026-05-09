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

-- Add foreign key constraint from profiles.shop_id to shops.id
-- (was removed from 001_profiles.sql to avoid circular dependency)
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_shop_id
FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE SET NULL;

-- Add constraint to ensure shop_id is only set for shop_owners
ALTER TABLE public.profiles
ADD CONSTRAINT shop_id_only_for_owner CHECK (
  (role = 'shop_owner' AND shop_id IS NOT NULL) OR
  (role != 'shop_owner' AND shop_id IS NULL)
);
