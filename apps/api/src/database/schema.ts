export const directionSchemaSql = `
  CREATE TABLE IF NOT EXISTS direction_versions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version INTEGER NOT NULL CHECK (version > 0),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, version)
  );
`;

export const initialSchemaSql = `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    terms_accepted_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
  CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions(expires_at);

  CREATE TABLE IF NOT EXISTS creator_dna_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    onboarding_status TEXT NOT NULL DEFAULT 'not-started'
      CHECK (onboarding_status IN ('not-started', 'in-progress', 'completed', 'skipped')),
    current_step INTEGER NOT NULL DEFAULT 0 CHECK (current_step BETWEEN 0 AND 5),
    display_name TEXT NOT NULL DEFAULT '',
    niche TEXT NOT NULL DEFAULT '',
    platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
    tone_traits JSONB NOT NULL DEFAULT '[]'::jsonb,
    audience TEXT NOT NULL DEFAULT '',
    boundaries TEXT NOT NULL DEFAULT '',
    latest_insight JSONB,
    prompt_cursor INTEGER NOT NULL DEFAULT 0,
    last_captured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS creator_dna_signals (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source TEXT NOT NULL
      CHECK (source IN ('daily-story', 'script-feedback', 'direct-update')),
    category TEXT NOT NULL
      CHECK (category IN ('Kho câu chuyện', 'Chủ đề quen thuộc', 'Giọng điệu', 'Khán giả', 'Sản phẩm phù hợp', 'Điều cần tránh')),
    confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    evidence TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS creator_dna_signals_user_created_idx
    ON creator_dna_signals(user_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS ai_evaluations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stage TEXT NOT NULL CHECK (stage IN ('signup', 'onboarding')),
    provider TEXT NOT NULL CHECK (provider IN ('google-gemini', 'fallback')),
    model TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('generated', 'fallback')),
    input_snapshot JSONB NOT NULL,
    output JSONB NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS ai_evaluations_user_created_idx
    ON ai_evaluations(user_id, created_at DESC);
`;

export const aiChatSchemaSql = `
  ALTER TABLE creator_dna_signals
    DROP CONSTRAINT IF EXISTS creator_dna_signals_source_check;

  ALTER TABLE creator_dna_signals
    ADD CONSTRAINT creator_dna_signals_source_check
    CHECK (source IN ('daily-story', 'script-feedback', 'direct-update', 'ai-chat'));

  CREATE TABLE IF NOT EXISTS ai_user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    proactive_frequency TEXT NOT NULL DEFAULT 'balanced'
      CHECK (proactive_frequency IN ('off', 'gentle', 'balanced', 'frequent')),
    last_proactive_at TIMESTAMPTZ,
    proactive_prompt_cursor INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('assistant', 'user')),
    content TEXT NOT NULL,
    message_kind TEXT NOT NULL DEFAULT 'chat'
      CHECK (message_kind IN ('chat', 'welcome', 'proactive-question')),
    provider TEXT CHECK (provider IN ('google-gemini', 'fallback', 'system')),
    model TEXT,
    collection_intent JSONB,
    reply_to_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'complete'
      CHECK (status IN ('complete', 'fallback')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS chat_messages_conversation_created_idx
    ON chat_messages(conversation_id, created_at ASC);
  CREATE INDEX IF NOT EXISTS chat_messages_user_created_idx
    ON chat_messages(user_id, created_at DESC);

  ALTER TABLE creator_dna_signals
    ADD COLUMN IF NOT EXISTS origin_message_id UUID
      REFERENCES chat_messages(id) ON DELETE SET NULL;

  CREATE INDEX IF NOT EXISTS creator_dna_signals_origin_message_idx
    ON creator_dna_signals(origin_message_id);
`;

export const aiChatReplyLinkSchemaSql = `
  ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS reply_to_message_id UUID
      REFERENCES chat_messages(id) ON DELETE SET NULL;

  CREATE INDEX IF NOT EXISTS chat_messages_reply_to_idx
    ON chat_messages(reply_to_message_id);
`;
