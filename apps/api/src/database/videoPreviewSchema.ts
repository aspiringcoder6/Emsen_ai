export const videoPreviewSchemaSql = `
  ALTER TABLE media_jobs
    DROP CONSTRAINT IF EXISTS media_jobs_type_check;

  ALTER TABLE media_jobs
    ADD CONSTRAINT media_jobs_type_check CHECK (
      type IN ('probe', 'transcribe', 'suggest-cuts', 'preview', 'render')
    );
`;
