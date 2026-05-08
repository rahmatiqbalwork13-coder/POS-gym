-- ============================================================
-- SQL untuk Reset Password User Supabase Auth
-- ============================================================

-- Cara 1: Reset password via auth.users (admin only)
-- Ganti 'user@email.com' dengan email user yang ingin di-reset
-- Ganti 'newpassword123' dengan password baru

-- Update password langsung di auth.users
UPDATE auth.users 
SET encrypted_password = crypt('newpassword123', gen_salt('bf'))
WHERE email = 'user@email.com';


-- ============================================================
-- Cara 2: Buat user baru admin (jika perlu akses darurat)
-- ============================================================

-- Insert user ke auth.users dengan password yang sudah di-hash
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  confirmation_token,
  recovery_token
) VALUES (
  gen_random_uuid(),
  (SELECT instance_id FROM auth.users LIMIT 1),
  'admin@koperasi.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin Utama"}',
  NOW(),
  NOW(),
  'authenticated',
  '',
  ''
)
ON CONFLICT (email) DO NOTHING;

-- Set role admin untuk user baru
UPDATE profiles 
SET role = 'admin', 
    full_name = 'Admin Utama'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin@koperasi.com'
);


-- ============================================================
-- Cara 3: List semua user untuk melihat email yang terdaftar
-- ============================================================

SELECT 
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  p.role,
  p.full_name
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;


-- ============================================================
-- Cara 4: Reset password spesifik user berdasarkan ID
-- ============================================================

-- Ganti ID_USER dengan UUID user yang ingin di-reset
-- Ganti PASSWORD_BARU dengan password baru

UPDATE auth.users 
SET encrypted_password = crypt('PASSWORD_BARU', gen_salt('bf'))
WHERE id = 'ID_USER';


-- ============================================================
-- Cara 5: Generate password reset link (untuk kirim ke email)
-- ============================================================

-- Buat recovery token (untuk password reset via email)
UPDATE auth.users 
SET 
  recovery_token = encode(gen_random_bytes(32), 'hex'),
  recovery_sent_at = NOW()
WHERE email = 'user@email.com';


-- ============================================================
-- Cara 6: Cek apakah user ada dan aktif
-- ============================================================

SELECT 
  email,
  email_confirmed_at IS NOT NULL as is_confirmed,
  last_sign_in_at,
  created_at
FROM auth.users
WHERE email = 'user@email.com';


-- ============================================================
-- INSTRUKSI PENGGUNAAN:
-- ============================================================
-- 1. Jalankan query "List semua user" untuk melihat email yang terdaftar
-- 2. Pilih salah satu cara reset di atas
-- 3. Ganti email dan password sesuai kebutuhan
-- 4. Jalankan query di Supabase SQL Editor
-- 5. Coba login dengan password baru
-- ============================================================
