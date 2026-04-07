-- Create profiles table for NearBy authentication
-- This is the core user identity table. All roles (customer, shop_owner, delivery, admin) have entries here.

CREATE TABLE IF NOT EXISTS public.profiles (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Authentication
  phone TEXT NOT NULL UNIQUE,
  -- phone is normalized to +91{10-digits} format
  -- Unique constraint ensures one phone = one account

  -- User role (customer, shop_owner, delivery, admin)
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'shop_owner', 'delivery', 'admin')),

  -- Optional: Shop association for shop_owner role only
  shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  -- shop_id is required for shop_owner but NULL for others

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT phone_valid CHECK (phone ~ '^\+91\d{10}$'),
  -- Ensures phone is in correct format
  CONSTRAINT shop_id_only_for_owner CHECK (
    (role = 'shop_owner' AND shop_id IS NOT NULL) OR
    (role != 'shop_owner' AND shop_id IS NULL)
  )
  -- Ensures shop_id is only set for shop owners
);

-- Indexes for common queries
CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_shop_id ON public.profiles(shop_id);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at DESC);

-- Row-level security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid()::text = id::text);

-- Policy: Admin can view all profiles
CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::uuid AND p.role = 'admin'
    )
  );

-- Policy: Only service role can create profiles (backend only)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Trigger to update updated_at timestamp on every update
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

COMMENT ON TABLE public.profiles IS 'Core user identity table for all roles (customer, shop_owner, delivery, admin)';
COMMENT ON COLUMN public.profiles.id IS 'Unique user ID (UUID v4)';
COMMENT ON COLUMN public.profiles.phone IS 'Normalized phone number in +91XXXXXXXXXX format';
COMMENT ON COLUMN public.profiles.role IS 'User role: customer, shop_owner, delivery, admin';
COMMENT ON COLUMN public.profiles.shop_id IS 'Foreign key to shops table (only for shop_owner role)';
COMMENT ON COLUMN public.profiles.created_at IS 'Account creation timestamp';
COMMENT ON COLUMN public.profiles.updated_at IS 'Profile last update timestamp';
