-- Migration: 005_add_superadmin_and_increment_stock
-- Add superadmin role support and increment_stock function

-- 1. Update role check constraint to include superadmin
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('superadmin', 'admin', 'ketua', 'staff'));

-- 2. Add increment_stock function (reverse of decrement_stock)
CREATE OR REPLACE FUNCTION increment_stock(p_item_id UUID, p_qty INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE items
  SET stock = stock + p_qty
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item tidak ditemukan: %', p_item_id;
  END IF;
END;
$$;

-- 3. Update RLS policies to include superadmin
-- Update profiles policies
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (id = auth.uid() OR get_my_role() IN ('superadmin', 'admin'));

DROP POLICY IF EXISTS "profiles_admin_write" ON profiles;
CREATE POLICY "profiles_admin_write" ON profiles
  FOR ALL USING (get_my_role() IN ('superadmin', 'admin'));

-- Update items policies
DROP POLICY IF EXISTS "items_authenticated_read" ON items;
CREATE POLICY "items_authenticated_read" ON items
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "items_admin_write" ON items;
CREATE POLICY "items_admin_write" ON items
  FOR ALL USING (get_my_role() IN ('superadmin', 'admin'));

-- Update transactions policies
DROP POLICY IF EXISTS "transactions_read" ON transactions;
CREATE POLICY "transactions_read" ON transactions
  FOR SELECT USING (
    cashier_id = auth.uid() OR get_my_role() IN ('superadmin', 'admin', 'ketua')
  );

DROP POLICY IF EXISTS "transactions_insert_authenticated" ON transactions;
CREATE POLICY "transactions_insert_authenticated" ON transactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Add delete policy for superadmin
DROP POLICY IF EXISTS "transactions_delete_superadmin" ON transactions;
CREATE POLICY "transactions_delete_superadmin" ON transactions
  FOR DELETE USING (get_my_role() = 'superadmin');

-- Add update policy for superadmin
DROP POLICY IF EXISTS "transactions_update_superadmin" ON transactions;
CREATE POLICY "transactions_update_superadmin" ON transactions
  FOR UPDATE USING (get_my_role() = 'superadmin');

-- Update transaction_items policies
DROP POLICY IF EXISTS "transaction_items_read" ON transaction_items;
CREATE POLICY "transaction_items_read" ON transaction_items
  FOR SELECT USING (
    get_my_role() IN ('superadmin', 'admin', 'ketua')
    OR transaction_id IN (
      SELECT id FROM transactions WHERE cashier_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "transaction_items_insert" ON transaction_items;
CREATE POLICY "transaction_items_insert" ON transaction_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Add delete policy for superadmin (cascade will handle this, but good to have explicit)
DROP POLICY IF EXISTS "transaction_items_delete_superadmin" ON transaction_items;
CREATE POLICY "transaction_items_delete_superadmin" ON transaction_items
  FOR DELETE USING (get_my_role() = 'superadmin');

-- Update profit_distributions policies
DROP POLICY IF EXISTS "profit_dist_read" ON profit_distributions;
CREATE POLICY "profit_dist_read" ON profit_distributions
  FOR SELECT USING (get_my_role() IN ('superadmin', 'admin', 'ketua'));

-- Add delete policy for superadmin (cascade will handle this)
DROP POLICY IF EXISTS "profit_dist_delete_superadmin" ON profit_distributions;
CREATE POLICY "profit_dist_delete_superadmin" ON profit_distributions
  FOR DELETE USING (get_my_role() = 'superadmin');
