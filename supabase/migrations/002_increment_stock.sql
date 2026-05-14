-- Migration: 002_increment_stock
-- Adds increment_stock function used when a transaction is deleted (superadmin)
-- and the sold stock must be restored.

CREATE OR REPLACE FUNCTION increment_stock(p_item_id UUID, p_qty INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE items
  SET stock = stock + p_qty
  WHERE id = p_item_id;
END;
$$;
