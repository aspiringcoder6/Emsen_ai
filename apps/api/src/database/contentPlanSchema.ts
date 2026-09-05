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
