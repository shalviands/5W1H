-- Fix RLS for ag_capture_recovery_queue
ALTER TABLE ag_capture_recovery_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access_recovery" ON ag_capture_recovery_queue;
CREATE POLICY "public_access_recovery" ON ag_capture_recovery_queue FOR ALL USING (TRUE);
