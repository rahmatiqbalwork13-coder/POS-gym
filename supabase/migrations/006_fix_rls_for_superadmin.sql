-- Migration 006: Fix RLS policies to include superadmin role
-- Without this, superadmin could only read their own profile (same as staff)
-- even when using the service role key through @supabase/ssr (which may fall
-- back to the cookie session JWT and thus apply RLS normally).

-- profiles: superadmin can read and write all profiles
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR get_my_role() IN ('admin', 'superadmin')
  );

DROP POLICY IF EXISTS "profiles_admin_write" ON profiles;
CREATE POLICY "profiles_admin_write" ON profiles
  FOR ALL USING (get_my_role() IN ('admin', 'superadmin'));

-- items: superadmin can write items (was admin-only)
DROP POLICY IF EXISTS "items_admin_write" ON items;
CREATE POLICY "items_admin_write" ON items
  FOR ALL USING (get_my_role() IN ('admin', 'superadmin', 'staff'));

-- transactions: superadmin sees all (was admin/ketua)
DROP POLICY IF EXISTS "transactions_read" ON transactions;
CREATE POLICY "transactions_read" ON transactions
  FOR SELECT USING (
    cashier_id = auth.uid()
    OR get_my_role() IN ('admin', 'ketua', 'superadmin', 'staff')
  );

-- transaction_items: superadmin and staff see all
DROP POLICY IF EXISTS "transaction_items_read" ON transaction_items;
CREATE POLICY "transaction_items_read" ON transaction_items
  FOR SELECT USING (
    get_my_role() IN ('admin', 'ketua', 'superadmin', 'staff')
    OR transaction_id IN (
      SELECT id FROM transactions WHERE cashier_id = auth.uid()
    )
  );

-- profit_distributions: superadmin can read
DROP POLICY IF EXISTS "profit_dist_read" ON profit_distributions;
CREATE POLICY "profit_dist_read" ON profit_distributions
  FOR SELECT USING (get_my_role() IN ('admin', 'ketua', 'superadmin'));
