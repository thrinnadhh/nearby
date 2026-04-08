-- Migration 003: Products table
-- Stores product listings for each shop.
-- Price is stored in paise (integer). 1 rupee = 100 paise.

CREATE TABLE products (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           uuid        NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  description       text,
  category          text        NOT NULL,
  price             integer     NOT NULL CHECK (price > 0),
  stock_quantity    integer     NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  unit              text        NOT NULL,
  is_available      boolean     NOT NULL DEFAULT true,
  image_url         text,
  thumbnail_url     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Index for all products owned by a shop
CREATE INDEX idx_products_shop_id ON products(shop_id);

-- Compound index for filtering by shop + category
CREATE INDEX idx_products_category ON products(shop_id, category);

-- Compound index for filtering by shop + availability
CREATE INDEX idx_products_is_available ON products(shop_id, is_available);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
