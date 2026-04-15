-- Extend ag_sessions with Project Name and Sector
ALTER TABLE ag_sessions ADD COLUMN IF NOT EXISTS project_name TEXT;
ALTER TABLE ag_sessions ADD COLUMN IF NOT EXISTS sector TEXT;

-- Extend ag_insights with Question Asked to fulfill verbatim storage requirements
-- This field will store the question that prompted the specific answer
ALTER TABLE ag_insights ADD COLUMN IF NOT EXISTS question_asked TEXT;

-- Update status check constraint if necessary (optional but good for consistency)
-- ALTER TABLE ag_sessions DROP CONSTRAINT IF EXISTS ag_sessions_status_check;
-- ALTER TABLE ag_sessions ADD CONSTRAINT ag_sessions_status_check CHECK (status IN ('created', 'active', 'paused', 'resumed', 'synthesis_ready', 'completed'));
