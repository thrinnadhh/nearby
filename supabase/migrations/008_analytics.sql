-- Migration 008: Shop analytics table
-- Daily aggregations per shop. Populated by BullMQ analytics-aggregate job at 3 AM IST.

CREATE TABLE IF NOT EXISTS public.shop_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  -- Order counts
  total_orders INTEGER NOT NULL DEFAULT 0,
  completed_orders INTEGER NOT NULL DEFAULT 0,
  cancelled_orders INTEGER NOT NULL DEFAULT 0,
  auto_cancelled_orders INTEGER NOT NULL DEFAULT 0,
  -- Revenue (in paise)
  gross_revenue_paise BIGINT NOT NULL DEFAULT 0,
  net_revenue_paise BIGINT NOT NULL DEFAULT 0,
  -- Completion and response metrics
  completion_rate NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (completion_rate >= 0 AND completion_rate <= 100),
  avg_acceptance_time_seconds INTEGER,
  avg_preparation_time_seconds INTEGER,
  -- Ratings for the day
  review_count INTEGER NOT NULL DEFAULT 0,
  avg_rating NUMERIC(3, 2) CHECK (avg_rating >= 1 AND avg_rating <= 5),
  -- Unique customers served
  unique_customers INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One row per shop per day
  CONSTRAINT uq_shop_analytics_shop_date UNIQUE (shop_id, date)
);

CREATE INDEX IF NOT EXISTS idx_shop_analytics_shop_id
  ON public.shop_analytics(shop_id);

CREATE INDEX IF NOT EXISTS idx_shop_analytics_date
  ON public.shop_analytics(date DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_shop_analytics_updated_at'
  ) THEN
    CREATE TRIGGER update_shop_analytics_updated_at
      BEFORE UPDATE ON public.shop_analytics
      FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END $$;
