-- Fix RLS for ag_prompt_versions
ALTER TABLE ag_prompt_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access_prompts" ON ag_prompt_versions;
CREATE POLICY "public_access_prompts" ON ag_prompt_versions FOR ALL USING (TRUE);
