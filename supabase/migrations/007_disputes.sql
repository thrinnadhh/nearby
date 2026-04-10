-- Migration 007: Disputes table
-- Customers raise disputes on delivered orders. Admins resolve them.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_status') THEN
    CREATE TYPE dispute_status AS ENUM (
      'open',
      'under_review',
      'resolved',
      'closed'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_reason') THEN
    CREATE TYPE dispute_reason AS ENUM (
      'item_not_delivered',
      'wrong_item',
      'damaged_item',
      'quantity_mismatch',
      'quality_issue',
      'overcharged',
      'other'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  reason dispute_reason NOT NULL,
  description TEXT NOT NULL,
  status dispute_status NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  -- GPS trail retained during active dispute (30 days)
  gps_trail_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One dispute per order
  CONSTRAINT uq_disputes_order_id UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_disputes_shop_id
  ON public.disputes(shop_id);

CREATE INDEX IF NOT EXISTS idx_disputes_customer_id
  ON public.disputes(customer_id);

CREATE INDEX IF NOT EXISTS idx_disputes_status
  ON public.disputes(status);

CREATE INDEX IF NOT EXISTS idx_disputes_created_at
  ON public.disputes(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_disputes_updated_at'
  ) THEN
    CREATE TRIGGER update_disputes_updated_at
      BEFORE UPDATE ON public.disputes
      FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END $$;
