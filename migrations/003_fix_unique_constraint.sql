-- Fix unique constraint on ag_prompt_versions
ALTER TABLE ag_prompt_versions DROP CONSTRAINT IF EXISTS ag_prompt_versions_version_tag_key;
ALTER TABLE ag_prompt_versions ADD CONSTRAINT ag_prompt_versions_agent_version_unique UNIQUE (agent_name, version_tag);
