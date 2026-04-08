-- Migration 004: Orders table
-- Stores customer orders and top-level payment/status metadata.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'pending',
      'accepted',
      'packing',
      'ready',
      'assigned',
      'picked_up',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'auto_cancelled',
      'refunded',
      'payment_failed'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('card', 'upi', 'cod');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  delivery_partner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'pending',
  total_paise INTEGER NOT NULL CHECK (total_paise >= 0),
  payment_method payment_method NOT NULL DEFAULT 'cod',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  cashfree_order_id TEXT,
  idempotency_key UUID UNIQUE,
  accepted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id
  ON public.orders(customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_shop_id
  ON public.orders(shop_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON public.orders(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_orders_updated_at
      BEFORE UPDATE ON public.orders
      FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END $$;
