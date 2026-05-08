-- ============================================================
-- QUICK RESET PASSWORD - Pilih salah satu cara di bawah
-- ============================================================

-- ============================================================
-- CARA 1 (REKOMENDASI): Reset password user spesifik
-- ============================================================
-- Ganti email dan password di bawah ini:

DO $$
DECLARE
  target_email TEXT := 'kasir@koperasi.com';  -- GANTI EMAIL DISINI
  new_password TEXT := 'kasir123';             -- GANTI PASSWORD BARU DISINI
  user_id UUID;
BEGIN
  -- Cari user ID berdasarkan email
  SELECT id INTO user_id FROM auth.users WHERE email = target_email;
  
  IF user_id IS NULL THEN
    RAISE NOTICE 'User dengan email % tidak ditemukan!', target_email;
  ELSE
    -- Update password
    UPDATE auth.users 
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = user_id;
    
    RAISE NOTICE 'Password untuk % berhasil di-reset!', target_email;
    RAISE NOTICE 'Password baru: %', new_password;
  END IF;
END $$;


-- ============================================================
-- CARA 2: Reset semua user ke password default
-- ============================================================
-- WARNING: Hanya untuk development/test!
-- Semua user akan memiliki password yang sama

-- UPDATE auth.users 
-- SET encrypted_password = crypt('default123', gen_salt('bf'));


-- ============================================================
-- CARA 3: Lihat dulu semua user yang ada
-- ============================================================
-- Jalankan ini untuk melihat email yang terdaftar:

-- SELECT email, created_at, last_sign_in_at FROM auth.users ORDER BY created_at DESC;


-- ============================================================
-- CARA 4: Buat user admin baru (jika semua akses hilang)
-- ============================================================

DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  -- Insert ke auth.users
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    new_user_id,
    'admin@koperasi.com',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin Koperasi"}'
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO new_user_id;
  
  -- Insert/Update profile
  IF new_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, role)
    VALUES (new_user_id, 'Admin Koperasi', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin';
    
    RAISE NOTICE 'User admin berhasil dibuat!';
    RAISE NOTICE 'Email: admin@koperasi.com';
    RAISE NOTICE 'Password: admin123';
  ELSE
    RAISE NOTICE 'User admin sudah ada, update role...';
    UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@koperasi.com');
  END IF;
END $$;
