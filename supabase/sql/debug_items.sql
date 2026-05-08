-- ============================================================
-- Debug: Cek mengapa barang tidak muncul di kasir
-- ============================================================

-- 1. CEK: Apakah tabel items ada dan berisi data?
SELECT COUNT(*) as total_items FROM items;

-- 2. CEK: Tampilkan semua barang dengan stok > 0 (yang seharusnya muncul)
SELECT 
  id,
  name,
  selling_price,
  stock,
  created_at
FROM items 
WHERE stock > 0
ORDER BY name;

-- 3. CEK: Apakah ada barang dengan stok = 0 atau NULL?
SELECT 
  id,
  name,
  stock,
  CASE 
    WHEN stock IS NULL THEN 'NULL'
    WHEN stock = 0 THEN 'ZERO'
    ELSE 'OK'
  END as stock_status
FROM items 
WHERE stock IS NULL OR stock = 0;

-- 4. CEK: Apakah RLS (Row Level Security) menyebabkan masalah?
-- Coba query dengan bypass RLS (hanya bisa dilakukan via service role)
-- Note: Query ini hanya untuk cek, tidak perlu dijalankan jika menggunakan service role

-- 5. CEK: Apakah ada error di tabel?
SELECT 
  id,
  name,
  selling_price,
  stock
FROM items 
WHERE name IS NULL OR selling_price IS NULL OR stock IS NULL;

-- 6. CEK: Structure tabel items
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'items';

-- ============================================================
-- FIX: Jika ada barang dengan stok 0 atau NULL, update menjadi 1
-- ============================================================

-- Update barang dengan stok NULL menjadi 0
-- UPDATE items SET stock = 0 WHERE stock IS NULL;

-- Atau hapus barang dengan stok 0 jika memang tidak valid
-- DELETE FROM items WHERE stock IS NULL OR stock = 0;
