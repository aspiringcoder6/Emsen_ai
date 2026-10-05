export const storyboardImageSchemaSql = `
  ALTER TABLE storyboard_assets ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
  CREATE TABLE IF NOT EXISTS storyboard_image_jobs (
    id UUID PRIMARY KEY,
    request_id UUID NOT NULL,
    script_id UUID NOT NULL REFERENCES script_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scene_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    input JSONB NOT NULL,
    asset_id UUID REFERENCES storyboard_assets(id) ON DELETE SET NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    UNIQUE (user_id, request_id)
  );
  CREATE INDEX IF NOT EXISTS storyboard_image_jobs_script_idx ON storyboard_image_jobs(script_id, user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS storyboard_image_jobs_queue_idx ON storyboard_image_jobs(created_at) WHERE status = 'queued';
  CREATE UNIQUE INDEX IF NOT EXISTS storyboard_image_jobs_active_scene_idx ON storyboard_image_jobs(script_id, scene_id) WHERE status IN ('queued', 'running');
  -- Usage survives script deletion, so deleting a script cannot reset demo limits.
  CREATE TABLE IF NOT EXISTS storyboard_image_usage (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS storyboard_image_usage_daily_idx ON storyboard_image_usage(created_at, user_id);
`;
