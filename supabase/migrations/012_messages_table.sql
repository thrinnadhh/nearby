-- Migration 012: Messages table for pre-order shop chat
-- Enables customer-shop communication before order is placed
-- Used in shop:{shopId}:chat Socket.IO room

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
    CREATE TYPE message_type AS ENUM ('customer', 'shop');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Either a temporary shop inquiry (no order yet) or existing order
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_type message_type NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_shop_id
  ON public.messages(shop_id);

CREATE INDEX IF NOT EXISTS idx_messages_customer_id
  ON public.messages(customer_id);

CREATE INDEX IF NOT EXISTS idx_messages_order_id
  ON public.messages(order_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON public.messages(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_messages_updated_at'
  ) THEN
    CREATE TRIGGER update_messages_updated_at
      BEFORE UPDATE ON public.messages
      FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END $$;
