export const videoTranscriptSchemaSql = `
  ALTER TABLE media_projects
    DROP CONSTRAINT IF EXISTS media_projects_status_check;

  ALTER TABLE media_projects
    ADD CONSTRAINT media_projects_status_check CHECK (
      status IN (
        'setup', 'uploaded', 'analyzing', 'transcribing', 'transcript-ready',
        'cut-review', 'ready-to-render', 'rendering', 'completed', 'failed'
      )
    );

  CREATE TABLE IF NOT EXISTS video_transcripts (
    project_id UUID PRIMARY KEY REFERENCES media_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
    language TEXT NOT NULL DEFAULT 'vi',
    source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai')),
    model TEXT,
    duration_seconds DOUBLE PRECISION NOT NULL CHECK (duration_seconds >= 0),
    segments JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS video_transcripts_user_updated_idx
    ON video_transcripts(user_id, updated_at DESC);
`;
