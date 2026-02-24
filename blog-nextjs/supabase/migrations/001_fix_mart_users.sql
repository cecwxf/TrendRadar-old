-- ============================================
-- Migration 001: Fix mart_users table
-- - role text -> roles text[]
-- - Add avatar_url, email, github_id columns
-- - Rebuild index for GIN on roles array
-- ============================================

-- 1. Add new columns (safe with IF NOT EXISTS)
ALTER TABLE mart_users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE mart_users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE mart_users ADD COLUMN IF NOT EXISTS github_id text;

-- 2. Convert role -> roles
-- Check if 'role' column exists before migrating
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mart_users' AND column_name = 'role'
  ) THEN
    -- Add roles column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'mart_users' AND column_name = 'roles'
    ) THEN
      ALTER TABLE mart_users ADD COLUMN roles text[] NOT NULL DEFAULT '{}';
    END IF;

    -- Migrate existing role data to roles array
    UPDATE mart_users SET roles = ARRAY[role] WHERE roles = '{}' AND role IS NOT NULL;

    -- Drop old column and constraint
    ALTER TABLE mart_users DROP CONSTRAINT IF EXISTS mart_users_role_check;
    ALTER TABLE mart_users DROP COLUMN role;
  ELSE
    -- If role column doesn't exist, ensure roles column exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'mart_users' AND column_name = 'roles'
    ) THEN
      ALTER TABLE mart_users ADD COLUMN roles text[] NOT NULL DEFAULT '{}';
    END IF;
  END IF;
END
$$;

-- 3. Drop old index, create new GIN index
DROP INDEX IF EXISTS idx_mart_users_role;
CREATE INDEX IF NOT EXISTS idx_mart_users_roles ON mart_users USING gin (roles);
