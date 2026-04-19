/**
 * Backend migration for shop settings
 * Adds columns for business hours, delivery radius, bank details
 */

-- Migration 015: Add shop settings fields

ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS delivery_radius_km INTEGER DEFAULT 3;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(18);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(11);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(100);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS shop_description TEXT;

CREATE INDEX idx_shops_delivery_radius ON public.shops(delivery_radius_km);
