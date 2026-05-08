-- ============================================================
-- Migration: 004_add_payment_method
-- Add payment_method and amount_paid to transactions
-- ============================================================

-- Add payment_method column
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash' 
CHECK (payment_method IN ('cash', 'transfer'));

-- Add amount_paid column (for cash payments)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12, 2);

-- Add change_amount column (kembalian)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS change_amount NUMERIC(12, 2);

-- Update existing transactions to have payment_method
UPDATE transactions SET payment_method = 'cash' WHERE payment_method IS NULL;

-- Function to calculate change
CREATE OR REPLACE FUNCTION calculate_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_method = 'cash' AND NEW.amount_paid IS NOT NULL THEN
    NEW.change_amount := NEW.amount_paid - NEW.total_amount;
  ELSE
    NEW.change_amount := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate change
DROP TRIGGER IF EXISTS trg_calculate_change ON transactions;
CREATE TRIGGER trg_calculate_change
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_change();
