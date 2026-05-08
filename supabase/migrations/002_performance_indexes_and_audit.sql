-- ============================================================
-- Migration: 002_performance_indexes_and_audit
-- Indexes for performance + Audit trail
-- ============================================================

-- 1. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_cashier_id ON transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_item_id ON transaction_items(item_id);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_created_at ON profit_distributions(created_at);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_transaction_id ON profit_distributions(transaction_id);

-- 2. Audit Trail Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID    REFERENCES profiles(id),
  action          TEXT    NOT NULL,  -- 'CREATE_TRANSACTION', 'UPDATE_STOCK', 'DELETE_ITEM', dll
  table_name      TEXT    NOT NULL,  -- nama tabel yang terkena
  record_id       UUID,              -- ID record yang terkena
  old_data        JSONB,             -- data sebelum perubahan (untuk UPDATE/DELETE)
  new_data        JSONB,             -- data sesudah perubahan (untuk CREATE/UPDATE)
  ip_address      TEXT,              -- IP address user (opsional)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- 3. Function to auto-log transactions
CREATE OR REPLACE FUNCTION log_transaction_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (
    NEW.cashier_id,
    'CREATE_TRANSACTION',
    'transactions',
    NEW.id,
    jsonb_build_object(
      'total_amount', NEW.total_amount,
      'total_laba_kotor', NEW.total_laba_kotor,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

-- Trigger untuk log transaksi baru
DROP TRIGGER IF EXISTS trg_log_transaction ON transactions;
CREATE TRIGGER trg_log_transaction
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION log_transaction_audit();


-- 4. Function to auto-log stock changes
CREATE OR REPLACE FUNCTION log_stock_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Hanya log jika stock berubah
  IF OLD.stock IS DISTINCT FROM NEW.stock THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
      auth.uid(),
      'UPDATE_STOCK',
      'items',
      NEW.id,
      jsonb_build_object('stock', OLD.stock),
      jsonb_build_object(
        'stock', NEW.stock,
        'name', NEW.name,
        'change', NEW.stock - OLD.stock
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger untuk log perubahan stok
DROP TRIGGER IF EXISTS trg_log_stock_change ON items;
CREATE TRIGGER trg_log_stock_change
  AFTER UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION log_stock_change();


-- 5. Function to log item CRUD
CREATE OR REPLACE FUNCTION log_item_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), 'CREATE_ITEM', 'items', NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'UPDATE_ITEM', 'items', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), 'DELETE_ITEM', 'items', OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$;

-- Trigger untuk log semua perubahan item
DROP TRIGGER IF EXISTS trg_log_item_changes ON items;
CREATE TRIGGER trg_log_item_changes
  AFTER INSERT OR UPDATE OR DELETE ON items
  FOR EACH ROW EXECUTE FUNCTION log_item_changes();


-- 6. RLS untuk audit_logs (hanya admin dan ketua yang bisa baca)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_admin_ketua_read" ON audit_logs
  FOR SELECT USING (get_my_role() IN ('admin', 'ketua'));


-- 7. Function untuk mendapatkan ringkasan audit (untuk dashboard)
CREATE OR REPLACE FUNCTION get_audit_summary(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS TABLE (
  action TEXT,
  count BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT action, COUNT(*)::BIGINT
  FROM audit_logs
  WHERE created_at BETWEEN p_from AND p_to
  GROUP BY action
  ORDER BY count DESC;
$$;


-- 8. Function untuk cek RLS policies (untuk debugging)
CREATE OR REPLACE FUNCTION get_policies_for_table(table_name TEXT)
RETURNS TABLE (
  policy_name TEXT,
  permissive TEXT,
  roles TEXT[],
  cmd TEXT,
  qual TEXT,
  with_check TEXT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    polname::TEXT as policy_name,
    polpermissive::TEXT as permissive,
    polroles::TEXT[] as roles,
    polcmd::TEXT as cmd,
    pg_get_expr(pol.qual, pol.polrelid)::TEXT as qual,
    pg_get_expr(pol.with_check, pol.polrelid)::TEXT as with_check
  FROM pg_policies pol
  WHERE pol.tablename = table_name;
$$;

