-- ============================================================
-- Insert Sample Data untuk Testing POS
-- ============================================================

-- Hapus data lama jika ada (opsional, hapus -- di depan jika ingin reset)
-- DELETE FROM transaction_items;
-- DELETE FROM profit_distributions;
-- DELETE FROM transactions;
-- DELETE FROM items;

-- Insert barang-barang sample
INSERT INTO items (name, purchase_price, selling_price, stock) VALUES
  -- Minuman
  ('Air Mineral 600ml', 2500.00, 5000.00, 100),
  ('Air Mineral 1.5L', 4000.00, 8000.00, 50),
  ('Teh Botol 500ml', 4000.00, 7000.00, 80),
  ('Kopi Botol 250ml', 5000.00, 9000.00, 60),
  ('Isotonic Drink 500ml', 5500.00, 10000.00, 45),
  ('Energy Drink 250ml', 6000.00, 12000.00, 30),
  ('Jus Orange 250ml', 7000.00, 15000.00, 25),
  
  -- Snack & Makanan
  ('Keripik Kentang', 8000.00, 15000.00, 40),
  ('Biskuit Coklat', 5000.00, 10000.00, 55),
  ('Kacang Goreng', 6000.00, 12000.00, 35),
  ('Protein Bar', 15000.00, 28000.00, 20),
  ('Energy Bar', 12000.00, 25000.00, 25),
  ('Nasi Goreng Instant', 8000.00, 18000.00, 15),
  
  -- Suplemen & Vitamin
  ('Whey Protein 1kg', 350000.00, 450000.00, 10),
  ('Creatine Monohydrate 300g', 180000.00, 250000.00, 8),
  ('BCAA 300g', 200000.00, 280000.00, 12),
  ('Multivitamin 30 tablet', 45000.00, 75000.00, 20),
  ('Vitamin C 1000mg', 35000.00, 60000.00, 30),
  ('Omega 3 Fish Oil', 55000.00, 95000.00, 18),
  
  -- Perlengkapan Gym
  ('Hand Wrap Boxing', 25000.00, 45000.00, 25),
  ('Sarung Tangan Gym', 35000.00, 65000.00, 20),
  ('Strap Lifting', 40000.00, 75000.00, 15),
  ('Resistance Band', 30000.00, 55000.00, 30),
  ('Shaker Bottle 700ml', 25000.00, 50000.00, 40),
  ('Towel Microfiber', 20000.00, 40000.00, 35),
  
  -- Stok Rendah (untuk testing alert)
  ('Pre-Workout 300g', 220000.00, 320000.00, 3),
  ('Glutamine 250g', 160000.00, 240000.00, 2),
  ('Testosterone Booster', 280000.00, 380000.00, 1);

-- ============================================================
-- Verifikasi data
-- ============================================================

SELECT 
  name,
  stock,
  purchase_price,
  selling_price,
  selling_price - purchase_price as profit_per_item
FROM items 
ORDER BY stock ASC;

-- Cek total barang
SELECT COUNT(*) as total_barang FROM items;

-- Cek barang dengan stok rendah (<= 5)
SELECT name, stock FROM items WHERE stock <= 5 ORDER BY stock ASC;
