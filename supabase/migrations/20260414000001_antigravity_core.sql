-- Antigravity Core Migration
-- Combined from Document 03 and Document 05

-- 1. ag_prompt_versions (no dependencies)
CREATE TABLE ag_prompt_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_tag       TEXT NOT NULL UNIQUE,
  agent_name        TEXT NOT NULL CHECK (agent_name IN ('intake', 'capture', 'cluster', 'synthesis', 'orchestrator')),
  prompt_text       TEXT NOT NULL,
  changelog         TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT FALSE,
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  created_by        UUID, -- references users(id) if exists
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deprecated_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_one_default_per_agent ON ag_prompt_versions(agent_name) WHERE is_default = TRUE;
CREATE INDEX idx_ag_prompt_version_tag ON ag_prompt_versions(version_tag);
CREATE INDEX idx_ag_prompt_active ON ag_prompt_versions(is_active);

-- 2. ag_sessions (depends on platform tables)
CREATE TABLE ag_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL, -- references projects(id)
  team_id           UUID NOT NULL, -- references teams(id)
  cohort_id         UUID,          -- references cohorts(id)
  created_by        UUID NOT NULL, -- references users(id)
  problem_domain    TEXT NOT NULL,
  stakeholders      TEXT[] NOT NULL DEFAULT '{}',
  session_type      TEXT NOT NULL CHECK (session_type IN ('individual', 'team', 'mentor_assisted')),
  session_language  TEXT NOT NULL DEFAULT 'en' CHECK (session_language IN ('en', 'hi', 'mixed')),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('created', 'active', 'paused', 'resumed', 'synthesis_ready', 'completed')),
  covered_dimensions TEXT[] DEFAULT '{}',
  insight_count     INT DEFAULT 0,
  last_active_at    TIMESTAMPTZ,
  last_summary      TEXT,
  conversation_history JSONB DEFAULT '[]',
  prompt_version    TEXT NOT NULL DEFAULT 'v2',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX idx_ag_sessions_project ON ag_sessions(project_id);
CREATE INDEX idx_ag_sessions_team ON ag_sessions(team_id);
CREATE INDEX idx_ag_sessions_status ON ag_sessions(status);

-- 3. ag_clusters (depends on ag_sessions)
CREATE TABLE ag_clusters (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES ag_sessions(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL,
  theme             TEXT NOT NULL,
  primary_dimension TEXT NOT NULL CHECK (primary_dimension IN ('WHO','WHAT','WHEN','WHERE','WHY','HOW')),
  signal            TEXT NOT NULL CHECK (signal IN ('HIGH', 'MEDIUM', 'LOW')),
  evidence_count    INT NOT NULL DEFAULT 0,
  contributing_users UUID[] DEFAULT '{}',
  contributing_roles TEXT[] DEFAULT '{}',
  divergence        BOOLEAN DEFAULT FALSE,
  opportunity_gap   BOOLEAN DEFAULT FALSE,
  cluster_run       INT NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ag_clusters_session ON ag_clusters(session_id);

-- 4. ag_insights (depends on ag_sessions, ag_clusters)
CREATE TABLE ag_insights (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES ag_sessions(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL,
  team_id           UUID NOT NULL,
  cohort_id         UUID,
  user_id           UUID NOT NULL,
  user_role         TEXT NOT NULL CHECK (user_role IN ('founder', 'student', 'mentor', 'admin')),
  stakeholder_tag   TEXT NOT NULL,
  dimension         TEXT NOT NULL CHECK (dimension IN ('WHO', 'WHAT', 'WHEN', 'WHERE', 'WHY', 'HOW')),
  raw_text          TEXT NOT NULL,
  language          TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'mixed')),
  frequency         INT NOT NULL DEFAULT 1,
  signal            TEXT NOT NULL DEFAULT 'LOW' CHECK (signal IN ('HIGH', 'MEDIUM', 'LOW')),
  divergence_flag   BOOLEAN DEFAULT FALSE,
  cluster_id        UUID REFERENCES ag_clusters(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ag_insights_session ON ag_insights(session_id);
CREATE INDEX idx_ag_insights_dimension ON ag_insights(dimension);

-- Append-only enforcement for ag_insights
CREATE OR REPLACE FUNCTION prevent_insight_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ag_insights is append-only. Updates and deletes are not permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_append_only
BEFORE UPDATE OR DELETE ON ag_insights
FOR EACH ROW EXECUTE FUNCTION prevent_insight_modification();

-- 5. ag_mind_maps (depends on ag_sessions)
CREATE TABLE ag_mind_maps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES ag_sessions(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL,
  team_id           UUID NOT NULL,
  cohort_id         UUID,
  generated_by      UUID NOT NULL,
  mind_map_md       TEXT NOT NULL,
  signal_summary    JSONB NOT NULL DEFAULT '[]',
  opportunity_gaps  JSONB NOT NULL DEFAULT '[]',
  divergence_report JSONB DEFAULT NULL,
  coverage_report   JSONB NOT NULL DEFAULT '{}',
  total_insights    INT NOT NULL DEFAULT 0,
  dimensions_covered TEXT[] DEFAULT '{}',
  session_type      TEXT,
  version           INT NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ag_capture_recovery_queue (Doc 05)
CREATE TABLE ag_capture_recovery_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL,
  user_id     UUID NOT NULL,
  raw_text    TEXT NOT NULL,
  raw_input   JSONB NOT NULL,
  error       TEXT,
  processed   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (Simplified for standalone module)
ALTER TABLE ag_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ag_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ag_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ag_mind_maps ENABLE ROW LEVEL SECURITY;

-- Note: In a real environment, these would check team_members table.
-- For now, we allow access if auth.uid() is provided (Open Auth per user request).
CREATE POLICY "user_access_sessions" ON ag_sessions FOR ALL USING (TRUE);
CREATE POLICY "user_access_insights" ON ag_insights FOR ALL USING (TRUE);
CREATE POLICY "user_access_clusters" ON ag_clusters FOR ALL USING (TRUE);
CREATE POLICY "user_access_mind_maps" ON ag_mind_maps FOR ALL USING (TRUE);
