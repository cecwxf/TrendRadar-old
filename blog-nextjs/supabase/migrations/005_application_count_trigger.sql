-- ============================================
-- Migration 005: Auto-update application_count on mart_tasks
-- Trigger on task_applications INSERT/DELETE
-- ============================================

CREATE OR REPLACE FUNCTION mart_update_application_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE mart_tasks
    SET application_count = application_count + 1
    WHERE id = NEW.task_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE mart_tasks
    SET application_count = GREATEST(application_count - 1, 0)
    WHERE id = OLD.task_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_application_count_insert ON task_applications;
CREATE TRIGGER trg_application_count_insert
  AFTER INSERT ON task_applications
  FOR EACH ROW EXECUTE FUNCTION mart_update_application_count();

DROP TRIGGER IF EXISTS trg_application_count_delete ON task_applications;
CREATE TRIGGER trg_application_count_delete
  AFTER DELETE ON task_applications
  FOR EACH ROW EXECUTE FUNCTION mart_update_application_count();
