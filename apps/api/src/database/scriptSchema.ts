export const scriptSchemaSql = `
  CREATE TABLE IF NOT EXISTS script_documents (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_plan_version_id UUID REFERENCES content_plan_versions(id) ON DELETE SET NULL,
    content_plan_day_index INTEGER CHECK (
      content_plan_day_index IS NULL OR content_plan_day_index BETWEEN 0 AND 6
    ),
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    status TEXT NOT NULL CHECK (
      status IN ('draft', 'in-progress', 'ready', 'completed', 'archived')
    ),
    source TEXT NOT NULL CHECK (source IN ('manual', 'content-plan', 'ai')),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS script_documents_user_updated_idx
    ON script_documents(user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS script_documents_plan_item_idx
    ON script_documents(user_id, content_plan_version_id, content_plan_day_index);
`;
