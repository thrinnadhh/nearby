-- Migration 009: Row-Level Security policies for all tables
-- Backend uses service_role key which bypasses RLS.
-- RLS protects direct client access (Supabase JS client in apps).

-- ============================================================
-- SHOPS
-- ============================================================
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- Customers and public can read approved, open shops
CREATE POLICY "Anyone can view active shops"
  ON public.shops FOR SELECT
  USING (status = 'approved');

-- Shop owner can view their own shop regardless of status
CREATE POLICY "Owner can view own shop"
  ON public.shops FOR SELECT
  USING (owner_id = auth.uid()::uuid);

-- Only backend (service_role) can insert/update/delete shops
CREATE POLICY "Service role manages shops"
  ON public.shops FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- PRODUCTS
-- ============================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Anyone can view available products of active shops
CREATE POLICY "Anyone can view available products"
  ON public.products FOR SELECT
  USING (
    is_available = true
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = shop_id AND s.status = 'approved'
    )
  );

-- Shop owners can view all their products (including unavailable)
CREATE POLICY "Owner can view own shop products"
  ON public.products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = shop_id AND s.owner_id = auth.uid()::uuid
    )
  );

-- Only backend (service_role) can insert/update/delete products
CREATE POLICY "Service role manages products"
  ON public.products FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- ORDERS
-- ============================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Customers see only their own orders
CREATE POLICY "Customers see own orders"
  ON public.orders FOR SELECT
  USING (customer_id = auth.uid()::uuid);

-- Shop owners see orders for their shop
CREATE POLICY "Shop owners see their shop orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = shop_id AND s.owner_id = auth.uid()::uuid
    )
  );

-- Delivery partners see orders assigned to them
CREATE POLICY "Delivery partners see assigned orders"
  ON public.orders FOR SELECT
  USING (delivery_partner_id = auth.uid()::uuid);

-- Only backend (service_role) can insert/update/delete orders
CREATE POLICY "Service role manages orders"
  ON public.orders FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- ORDER ITEMS
-- ============================================================
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Customers see their own order items
CREATE POLICY "Customers see own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.customer_id = auth.uid()::uuid
    )
  );

-- Shop owners see their order items
CREATE POLICY "Shop owners see their order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.shops s ON s.id = o.shop_id
      WHERE o.id = order_id AND s.owner_id = auth.uid()::uuid
    )
  );

-- Only backend can manage order items
CREATE POLICY "Service role manages order items"
  ON public.order_items FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- REVIEWS
-- ============================================================
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read visible reviews
CREATE POLICY "Anyone can read visible reviews"
  ON public.reviews FOR SELECT
  USING (is_visible = true);

-- Customers can read their own reviews regardless of visibility
CREATE POLICY "Customers can read own reviews"
  ON public.reviews FOR SELECT
  USING (customer_id = auth.uid()::uuid);

-- Only backend can insert/update/delete reviews
CREATE POLICY "Service role manages reviews"
  ON public.reviews FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- DISPUTES
-- ============================================================
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Customers see their own disputes
CREATE POLICY "Customers see own disputes"
  ON public.disputes FOR SELECT
  USING (customer_id = auth.uid()::uuid);

-- Shop owners see disputes for their shop
CREATE POLICY "Shop owners see their disputes"
  ON public.disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = shop_id AND s.owner_id = auth.uid()::uuid
    )
  );

-- Only backend can manage disputes
CREATE POLICY "Service role manages disputes"
  ON public.disputes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- SHOP ANALYTICS
-- ============================================================
ALTER TABLE public.shop_analytics ENABLE ROW LEVEL SECURITY;

-- Shop owners can view their own analytics
CREATE POLICY "Shop owners see own analytics"
  ON public.shop_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = shop_id AND s.owner_id = auth.uid()::uuid
    )
  );

-- Only backend can manage analytics
CREATE POLICY "Service role manages analytics"
  ON public.shop_analytics FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
