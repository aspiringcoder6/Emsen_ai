export const agentSkillSchemaSql = `
  ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS skill_runs JSONB NOT NULL DEFAULT '[]'::jsonb;
`;
