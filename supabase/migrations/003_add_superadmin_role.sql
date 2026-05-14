-- Migration: 003_add_superadmin_role
-- The profiles table has a CHECK constraint that only allows 'admin', 'ketua', 'staff'.
-- This migration adds 'superadmin' to the allowed values, then sets the target user.

-- Step 1: Drop the old constraint
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 2: Add new constraint that includes superadmin
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('superadmin', 'admin', 'ketua', 'staff'));

-- Step 3: Set role for the target user
UPDATE profiles
SET role = 'superadmin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'rahmat.iqbalwork13@gmail.com'
);
