-- Migration 010: Soft delete support for products
-- Adds deleted_at so products can be removed from customer-facing surfaces
-- without losing historical references.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_deleted_at
  ON public.products(deleted_at);
