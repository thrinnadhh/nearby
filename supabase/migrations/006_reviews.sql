-- Migration 006: Reviews table
-- Customers can leave one review per delivered order.

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One review per order
  CONSTRAINT uq_reviews_order_id UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_shop_id
  ON public.reviews(shop_id);

CREATE INDEX IF NOT EXISTS idx_reviews_customer_id
  ON public.reviews(customer_id);

CREATE INDEX IF NOT EXISTS idx_reviews_rating
  ON public.reviews(rating);

CREATE INDEX IF NOT EXISTS idx_reviews_created_at
  ON public.reviews(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_reviews_updated_at'
  ) THEN
    CREATE TRIGGER update_reviews_updated_at
      BEFORE UPDATE ON public.reviews
      FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END $$;
