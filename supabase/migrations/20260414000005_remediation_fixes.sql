-- Antigravity Remediation Fixes
-- 1. Unify on agent_name for ag_prompt_versions (schema check)
-- The schema already uses agent_name, but we'll ensure indexing is correct.
CREATE INDEX IF NOT EXISTS idx_ag_prompt_agent_name ON ag_prompt_versions(agent_name);

-- 2. Security: Proper RLS (Auth-bound)
-- For "dummy login" we still use auth.uid() but the platform will handle token injection.
DROP POLICY IF EXISTS "user_access_sessions" ON ag_sessions;
CREATE POLICY "user_access_sessions" ON ag_sessions 
FOR ALL USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "user_access_insights" ON ag_insights;
CREATE POLICY "user_access_insights" ON ag_insights 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM ag_sessions 
    WHERE ag_sessions.id = ag_insights.session_id 
    AND ag_sessions.created_by = auth.uid()
  )
);

-- 3. Seed Default Prompts
INSERT INTO ag_prompt_versions (agent_name, version_tag, prompt_text, is_active, is_default)
VALUES 
('intake', 'v2', 'You are an AI problem discovery agent using the 5W1H framework.', true, true),
('capture', 'v2', 'You are an insight categorization agent. Extract 5W1H dimensions.', true, true),
('cluster', 'v1', 'You are a clustering agent. Group semantically related insights.', true, true),
('synthesis', 'v1', 'You are a synthesis agent. Generate mind maps.', true, true)
ON CONFLICT (agent_name, version_tag) DO UPDATE 
SET prompt_text = EXCLUDED.prompt_text, is_active = true;
