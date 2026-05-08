-- ============================================================
-- Migration: 003_add_categories_and_ui_enhancements
-- Add category field to items and create product images support
-- ============================================================

-- 1. Add category column to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Lainnya';
ALTER TABLE items ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Create categories enum/check
-- Update existing items with appropriate categories
UPDATE items SET category = 'Minuman' WHERE name ILIKE '%air%' OR name ILIKE '%teh%' OR name ILIKE '%kopi%' OR name ILIKE '%drink%' OR name ILIKE '%jus%' OR name ILIKE '%yogurt%' OR name ILIKE '%pocari%' OR name ILIKE '%isotonic%' OR name ILIKE '%energy%';
UPDATE items SET category = 'Makanan' WHERE name ILIKE '%nasi%' OR name ILIKE '%makanan%' OR name ILIKE '%snack%';
UPDATE items SET category = 'Suplemen' WHERE name ILIKE '%vitamin%' OR name ILIKE '%omega%' OR name ILIKE '%multivitamin%' OR name ILIKE '%creatine%' OR name ILIKE '%bcaa%' OR name ILIKE '%glutamine%' OR name ILIKE '%pre-workout%' OR name ILIKE '%testosterone%';
UPDATE items SET category = 'Protein' WHERE name ILIKE '%protein%' OR name ILIKE '%whey%';
UPDATE items SET category = 'Perlengkapan' WHERE name ILIKE '%sarung tangan%' OR name ILIKE '%hand wrap%' OR name ILIKE '%strap%' OR name ILIKE '%resistance%' OR name ILIKE '%shaker%' OR name ILIKE '%towel%';
UPDATE items SET category = 'Snack' WHERE name ILIKE '%keripik%' OR name ILIKE '%biskuit%' OR name ILIKE '%kacang%' OR name ILIKE '%bar%';

-- 3. Add index for category
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);

-- 4. Function to get items by category
CREATE OR REPLACE FUNCTION get_items_by_category(p_category TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  purchase_price NUMERIC,
  selling_price NUMERIC,
  stock INTEGER,
  category TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ
) LANGUAGE sql STABLE AS $$
  SELECT id, name, purchase_price, selling_price, stock, category, image_url, created_at
  FROM items
  WHERE 
    CASE 
      WHEN p_category = 'Semua' THEN stock > 0
      ELSE category = p_category AND stock > 0
    END
  ORDER BY name;
$$;

-- 5. Function to get all categories with count
CREATE OR REPLACE FUNCTION get_categories_with_count()
RETURNS TABLE (
  category TEXT,
  count BIGINT,
  icon TEXT
) LANGUAGE sql STABLE AS $$
  SELECT 
    COALESCE(category, 'Lainnya') as category,
    COUNT(*)::BIGINT as count,
    CASE category
      WHEN 'Minuman' THEN 'drink'
      WHEN 'Makanan' THEN 'food'
      WHEN 'Snack' THEN 'snack'
      WHEN 'Suplemen' THEN 'pill'
      WHEN 'Protein' THEN 'protein'
      WHEN 'Perlengkapan' THEN 'glove'
      ELSE 'box'
    END as icon
  FROM items
  WHERE stock > 0
  GROUP BY category
  ORDER BY count DESC;
$$;

-- 6. Update RLS policy to include new columns
-- No changes needed, existing policies will work with new columns
