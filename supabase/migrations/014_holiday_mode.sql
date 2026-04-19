-- Migration 014: Add holiday mode fields to shops table

ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS holiday_start_date DATE;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS holiday_end_date DATE;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_on_holiday BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_shops_is_on_holiday ON public.shops(is_on_holiday) WHERE is_on_holiday = TRUE;
