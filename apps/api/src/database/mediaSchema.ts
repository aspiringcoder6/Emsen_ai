export const mediaSchemaSql = `
  CREATE TABLE IF NOT EXISTS media_projects (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    script_id UUID REFERENCES script_documents(id) ON DELETE SET NULL,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 250),
    status TEXT NOT NULL DEFAULT 'setup' CHECK (
      status IN (
        'setup', 'uploaded', 'transcribing', 'transcript-ready', 'cut-review',
        'ready-to-render', 'rendering', 'completed', 'failed'
      )
    ),
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    settings JSONB NOT NULL,
    script_snapshot JSONB NOT NULL,
    idempotency_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, idempotency_key)
  );

  CREATE INDEX IF NOT EXISTS media_projects_user_updated_idx
    ON media_projects(user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS media_projects_script_idx
    ON media_projects(user_id, script_id);

  CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES media_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('source', 'output')),
    status TEXT NOT NULL CHECK (
      status IN ('pending-upload', 'uploaded', 'processing', 'ready', 'failed')
    ),
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    object_key TEXT NOT NULL UNIQUE,
    idempotency_key TEXT NOT NULL,
    upload_expires_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, idempotency_key)
  );

  CREATE INDEX IF NOT EXISTS media_assets_project_created_idx
    ON media_assets(project_id, created_at ASC);
  CREATE INDEX IF NOT EXISTS media_assets_user_status_idx
    ON media_assets(user_id, status);

  CREATE TABLE IF NOT EXISTS media_jobs (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES media_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('probe', 'transcribe', 'suggest-cuts', 'render')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (
      status IN ('queued', 'running', 'succeeded', 'failed', 'canceled')
    ),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
    idempotency_key TEXT NOT NULL,
    input JSONB NOT NULL DEFAULT '{}'::jsonb,
    output JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, type, idempotency_key)
  );

  CREATE INDEX IF NOT EXISTS media_jobs_queue_idx
    ON media_jobs(status, created_at ASC);
  CREATE INDEX IF NOT EXISTS media_jobs_project_created_idx
    ON media_jobs(project_id, created_at DESC);
`;
