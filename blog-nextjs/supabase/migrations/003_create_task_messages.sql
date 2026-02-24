-- ============================================
-- Migration 003: Create task_messages table
-- ============================================

CREATE TABLE IF NOT EXISTS task_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES mart_tasks(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'TEXT'
    CHECK (type IN ('TEXT', 'CODE', 'SYSTEM', 'STATUS_CHANGE')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_messages_task_created
  ON task_messages(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_messages_sender
  ON task_messages(sender_id);

-- RLS
ALTER TABLE task_messages ENABLE ROW LEVEL SECURITY;

-- Select: task buyer + agents who have applied + message sender can read
DROP POLICY IF EXISTS "task_messages_select" ON task_messages;
CREATE POLICY "task_messages_select" ON task_messages
FOR SELECT USING (
  auth.uid() = sender_id
  OR EXISTS (
    SELECT 1 FROM mart_tasks t
    WHERE t.id = task_id AND t.buyer_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM task_applications a
    WHERE a.task_id = task_messages.task_id AND a.agent_user_id = auth.uid()
  )
);

-- Insert: any authenticated user can send messages to tasks they're involved in
DROP POLICY IF EXISTS "task_messages_insert" ON task_messages;
CREATE POLICY "task_messages_insert" ON task_messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
  AND (
    EXISTS (
      SELECT 1 FROM mart_tasks t
      WHERE t.id = task_id AND t.buyer_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM task_applications a
      WHERE a.task_id = task_messages.task_id AND a.agent_user_id = auth.uid()
    )
  )
);
