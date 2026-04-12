-- Migration 014: Add atomic stock restoration function
-- Used by payment failure webhook to restore locked stock without a race condition.
-- The previous read-modify-write approach was vulnerable to concurrent webhook retries.

CREATE OR REPLACE FUNCTION restore_stock_for_order(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  active_qty INTEGER;
BEGIN
  FOR rec IN
    SELECT product_id, quantity, COALESCE(cancelled_quantity, 0) AS cancelled_quantity
    FROM order_items
    WHERE order_id = p_order_id
  LOOP
    active_qty := GREATEST(rec.quantity - rec.cancelled_quantity, 0);

    IF active_qty > 0 THEN
      UPDATE products
      SET
        stock_quantity = stock_quantity + active_qty,
        is_available   = TRUE,
        updated_at     = NOW()
      WHERE id = rec.product_id;
    END IF;
  END LOOP;
END;
$$;

-- Grant to service role only
REVOKE ALL ON FUNCTION restore_stock_for_order(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION restore_stock_for_order(UUID) TO service_role;
