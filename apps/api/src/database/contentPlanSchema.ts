export const contentPlanSchemaSql = `
  CREATE TABLE IF NOT EXISTS user_ai_keys (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    encrypted_key TEXT NOT NULL,
    last_four VARCHAR(4) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS content_plan_versions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    version INTEGER NOT NULL CHECK (version > 0),
    direction_id UUID NOT NULL REFERENCES direction_versions(id),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, week_start, version)
  );
`;

export const contentPlanCollectionsSchemaSql = `
  CREATE TABLE IF NOT EXISTS content_plans (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    week_start DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE content_plan_versions
    ADD COLUMN IF NOT EXISTS content_plan_id UUID;

  WITH latest_per_week AS (
    SELECT DISTINCT ON (user_id, week_start)
      id, user_id, week_start, created_at
    FROM content_plan_versions
    ORDER BY user_id, week_start, version DESC
  ), named_plans AS (
    SELECT
      id,
      user_id,
      week_start,
      created_at,
      ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY week_start, created_at) AS plan_number
    FROM latest_per_week
  )
  INSERT INTO content_plans (id, user_id, name, week_start, created_at, updated_at)
  SELECT
    id,
    user_id,
    'Kế hoạch nội dung ' || LPAD(plan_number::text, 2, '0'),
    week_start,
    created_at,
    created_at
  FROM named_plans
  ON CONFLICT (id) DO NOTHING;

  UPDATE content_plan_versions AS versions
  SET content_plan_id = plans.id
  FROM content_plans AS plans
  WHERE versions.content_plan_id IS NULL
    AND versions.user_id = plans.user_id
    AND versions.week_start = plans.week_start;

  ALTER TABLE content_plan_versions
    ALTER COLUMN content_plan_id SET NOT NULL;

  DO $migration$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'content_plan_versions_content_plan_id_fkey'
    ) THEN
      ALTER TABLE content_plan_versions
        ADD CONSTRAINT content_plan_versions_content_plan_id_fkey
        FOREIGN KEY (content_plan_id) REFERENCES content_plans(id) ON DELETE CASCADE;
    END IF;
  END;
  $migration$;

  ALTER TABLE content_plan_versions
    DROP CONSTRAINT IF EXISTS content_plan_versions_user_id_week_start_version_key;

  CREATE UNIQUE INDEX IF NOT EXISTS content_plan_versions_plan_version_unique_idx
    ON content_plan_versions(content_plan_id, version);
  CREATE INDEX IF NOT EXISTS content_plans_user_updated_idx
    ON content_plans(user_id, updated_at DESC);

  ALTER TABLE script_documents
    ADD COLUMN IF NOT EXISTS content_plan_id UUID;

  UPDATE script_documents AS scripts
  SET content_plan_id = versions.content_plan_id
  FROM content_plan_versions AS versions
  WHERE scripts.content_plan_id IS NULL
    AND scripts.content_plan_version_id = versions.id;

  DO $migration$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'script_documents_content_plan_id_fkey'
    ) THEN
      ALTER TABLE script_documents
        ADD CONSTRAINT script_documents_content_plan_id_fkey
        FOREIGN KEY (content_plan_id) REFERENCES content_plans(id) ON DELETE SET NULL;
    END IF;
  END;
  $migration$;

  CREATE INDEX IF NOT EXISTS script_documents_plan_day_idx
    ON script_documents(user_id, content_plan_id, content_plan_day_index);
`;

export const contentPlanItemLinksSchemaSql = `
  ALTER TABLE script_documents
    ADD COLUMN IF NOT EXISTS content_plan_item_id TEXT;

  UPDATE script_documents
  SET content_plan_item_id =
    'legacy:' || content_plan_id::text || ':' || content_plan_day_index::text || ':0'
  WHERE content_plan_item_id IS NULL
    AND content_plan_id IS NOT NULL
    AND content_plan_day_index IS NOT NULL;

  CREATE INDEX IF NOT EXISTS script_documents_stable_plan_item_idx
    ON script_documents(user_id, content_plan_id, content_plan_item_id);
`;
