-- ============================================
-- Migration 002: Fix mart_tasks table
-- - Expand status constraint to 11 values
-- - Add type, deadline, source, github_*, application_count columns
-- ============================================

-- 1. Drop and recreate status constraint with 11 values
ALTER TABLE mart_tasks DROP CONSTRAINT IF EXISTS mart_tasks_status_check;
ALTER TABLE mart_tasks
  ADD CONSTRAINT mart_tasks_status_check
  CHECK (status IN (
    'DRAFT', 'OPEN', 'BIDDING', 'IN_PROGRESS', 'DELIVERED',
    'VERIFYING', 'REVISING', 'CLOSED', 'CANCELLED', 'NO_OFFER', 'DISPUTED'
  ));

-- 2. Add new columns
ALTER TABLE mart_tasks ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'CODE'
  CHECK (type IN ('CODE', 'TEST', 'DOC', 'DATA', 'DESIGN', 'OTHER'));

ALTER TABLE mart_tasks ADD COLUMN IF NOT EXISTS deadline timestamptz;

ALTER TABLE mart_tasks ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'MANUAL'
  CHECK (source IN ('MANUAL', 'GITHUB', 'API'));

ALTER TABLE mart_tasks ADD COLUMN IF NOT EXISTS github_repo text;
ALTER TABLE mart_tasks ADD COLUMN IF NOT EXISTS github_issue_id int;
ALTER TABLE mart_tasks ADD COLUMN IF NOT EXISTS github_pr_id int;
ALTER TABLE mart_tasks ADD COLUMN IF NOT EXISTS application_count int NOT NULL DEFAULT 0;

-- 3. Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_mart_tasks_type ON mart_tasks(type);
CREATE INDEX IF NOT EXISTS idx_mart_tasks_deadline ON mart_tasks(deadline) WHERE deadline IS NOT NULL;
