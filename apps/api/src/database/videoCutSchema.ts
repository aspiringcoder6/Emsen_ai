export const videoCutSchemaSql = `
  CREATE TABLE IF NOT EXISTS video_cut_drafts (
    project_id UUID PRIMARY KEY REFERENCES media_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transcript_revision INTEGER NOT NULL CHECK (transcript_revision > 0),
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
    source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai')),
    model TEXT,
    original_duration_seconds DOUBLE PRECISION NOT NULL CHECK (original_duration_seconds >= 0),
    estimated_duration_seconds DOUBLE PRECISION NOT NULL CHECK (estimated_duration_seconds >= 0),
    decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS video_cut_drafts_user_updated_idx
    ON video_cut_drafts(user_id, updated_at DESC);
`;
