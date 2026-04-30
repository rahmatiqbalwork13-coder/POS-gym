-- ============================================================
-- Migration: 001_initial
-- Koperasi Gym POS — Schema, Triggers, Functions, RLS
-- ============================================================

-- 1. Profiles (satu-ke-satu dengan auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id        UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role      TEXT NOT NULL DEFAULT 'staff'
              CHECK (role IN ('admin', 'ketua', 'staff'))
);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'staff')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- 2. Items (master barang)
CREATE TABLE IF NOT EXISTS items (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT    NOT NULL,
  purchase_price NUMERIC(12, 2) NOT NULL CHECK (purchase_price >= 0),
  selling_price  NUMERIC(12, 2) NOT NULL CHECK (selling_price > 0),
  stock          INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT selling_gt_purchase CHECK (selling_price > purchase_price)
);


-- 3. Transactions (header)
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  cashier_id       UUID    REFERENCES profiles(id),
  total_amount     NUMERIC(12, 2) NOT NULL,
  total_laba_kotor NUMERIC(12, 2) NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- 4. Transaction Items (detail)
CREATE TABLE IF NOT EXISTS transaction_items (
  id                     UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id         UUID    NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  item_id                UUID    REFERENCES items(id),
  qty                    INTEGER NOT NULL CHECK (qty > 0),
  purchase_price_at_time NUMERIC(12, 2) NOT NULL,
  selling_price_at_time  NUMERIC(12, 2) NOT NULL,
  laba_kotor_line        NUMERIC(12, 2) NOT NULL
);


-- 5. Profit Distributions (diisi otomatis via trigger)
CREATE TABLE IF NOT EXISTS profit_distributions (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id   UUID    NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  laba_kotor_total NUMERIC(12, 2) NOT NULL,
  shu_50           NUMERIC(12, 2) NOT NULL,
  dana_30          NUMERIC(12, 2) NOT NULL,
  opr_20           NUMERIC(12, 2) NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- 6. Trigger: auto-distribute profit on new transaction
CREATE OR REPLACE FUNCTION process_profit_distribution()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profit_distributions
    (transaction_id, laba_kotor_total, shu_50, dana_30, opr_20)
  VALUES (
    NEW.id,
    NEW.total_laba_kotor,
    ROUND(NEW.total_laba_kotor * 0.5, 2),
    ROUND(NEW.total_laba_kotor * 0.3, 2),
    ROUND(NEW.total_laba_kotor * 0.2, 2)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_distribute_profit ON transactions;
CREATE TRIGGER trg_distribute_profit
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION process_profit_distribution();


-- 7. Function: decrement stock atomically (prevents race conditions)
CREATE OR REPLACE FUNCTION decrement_stock(p_item_id UUID, p_qty INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE items
  SET stock = stock - p_qty
  WHERE id = p_item_id AND stock >= p_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stok tidak mencukupi untuk item %', p_item_id;
  END IF;
END;
$$;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_distributions ENABLE ROW LEVEL SECURITY;


-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;


-- profiles: read own, admin reads all
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (id = auth.uid() OR get_my_role() = 'admin');

CREATE POLICY "profiles_admin_write" ON profiles
  FOR ALL USING (get_my_role() = 'admin');


-- items: all authenticated users can read selling info
--        only admin can see purchase_price (enforced at API layer)
--        RLS allows read for all, API+DAL enforce column restriction
CREATE POLICY "items_authenticated_read" ON items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "items_admin_write" ON items
  FOR ALL USING (get_my_role() = 'admin');


-- transactions: staff sees own, admin/ketua see all
CREATE POLICY "transactions_read" ON transactions
  FOR SELECT USING (
    cashier_id = auth.uid() OR get_my_role() IN ('admin', 'ketua')
  );

CREATE POLICY "transactions_insert_authenticated" ON transactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- transaction_items: follows transactions access
CREATE POLICY "transaction_items_read" ON transaction_items
  FOR SELECT USING (
    get_my_role() IN ('admin', 'ketua')
    OR transaction_id IN (
      SELECT id FROM transactions WHERE cashier_id = auth.uid()
    )
  );

CREATE POLICY "transaction_items_insert" ON transaction_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- profit_distributions: admin and ketua only
--   (purchase_price sensitivity: this table shows aggregate laba only)
CREATE POLICY "profit_dist_read" ON profit_distributions
  FOR SELECT USING (get_my_role() IN ('admin', 'ketua'));

-- Trigger function uses SECURITY DEFINER so it can insert regardless of RLS
