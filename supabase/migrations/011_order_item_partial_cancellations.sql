-- Migration 011: Partial item cancellation support for orders
-- Keeps original ordered quantity immutable while tracking unavailable item adjustments.

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS cancelled_quantity INTEGER NOT NULL DEFAULT 0 CHECK (cancelled_quantity >= 0),
  ADD COLUMN IF NOT EXISTS cancelled_total_paise INTEGER NOT NULL DEFAULT 0 CHECK (cancelled_total_paise >= 0),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
