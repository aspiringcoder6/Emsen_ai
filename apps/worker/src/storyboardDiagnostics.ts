import { createImageGenerationProvider, ImageProviderError } from "@creator-flow/ai-provider";
import type { Pool } from "pg";
import { workerConfig } from "./config.js";

export function getStoryboardWorkerConfiguration() {
  let providerConfigured = false;
  let configurationMessage: string | null = null;
  try {
    providerConfigured = createImageGenerationProvider(workerConfig.imageGeneration).configured;
    if (!providerConfigured) configurationMessage = "Worker chưa có Account ID/API Token hoặc cấu hình nhà cung cấp ảnh.";
  } catch (error) {
    configurationMessage = error instanceof ImageProviderError ? error.message : "Cấu hình nhà cung cấp ảnh của worker chưa hợp lệ.";
  }
  return {
    provider: workerConfig.imageGeneration.provider,
    model: workerConfig.imageGeneration.model,
    providerConfigured,
    storageConfigured: Boolean(workerConfig.storage.endpoint && workerConfig.storage.bucket && workerConfig.storage.accessKey && workerConfig.storage.secretKey),
    configurationMessage,
  };
}

const requiredTables = ["script_documents", "storyboard_assets", "storyboard_image_jobs", "media_jobs", "media_projects", "video_cut_drafts", "video_transcripts"];
type DiagnosticJob = { id: string; status: string; progress: number; provider: string; model: string; created_at: Date; started_at: Date | null; updated_at: Date };

export async function inspectStoryboardWorker(database: Pick<Pool, "query">, jobId?: string) {
  const configuration = getStoryboardWorkerConfiguration();
  const issues: string[] = [];
  if (!configuration.providerConfigured) issues.push(configuration.configurationMessage!);
  if (!configuration.storageConfigured) issues.push("Worker chưa có đủ MEDIA_STORAGE_* để lưu ảnh.");
  const tables = await database.query<{ name: string; present: boolean }>(
    "SELECT name, to_regclass(name) IS NOT NULL AS present FROM unnest($1::text[]) AS tables(name)", [requiredTables],
  );
  const missingTables = requiredTables.filter((name) => !tables.rows.some((table) => table.name === name && table.present));
  if (missingTables.length) issues.push("Database của worker thiếu bảng. Deploy/khởi động API mới nhất để áp dụng migration, rồi kiểm tra DATABASE_URL của hai service.");
  let queue: { queued: number; running: number; oldestQueuedAt: Date | null } | null = null;
  let job: DiagnosticJob | null = null;
  if (!missingTables.includes("storyboard_image_jobs")) {
    const counts = await database.query<{ queued: number; running: number; oldestQueuedAt: Date | null }>(`
      SELECT COUNT(*) FILTER (WHERE status = 'queued')::integer AS queued,
             COUNT(*) FILTER (WHERE status = 'running')::integer AS running,
             MIN(created_at) FILTER (WHERE status = 'queued') AS "oldestQueuedAt"
      FROM storyboard_image_jobs WHERE status IN ('queued', 'running')
    `);
    queue = counts.rows[0] ?? null;
    if (jobId) {
      const result = await database.query<DiagnosticJob>(
        "SELECT id, status, progress, provider, model, created_at, started_at, updated_at FROM storyboard_image_jobs WHERE id = $1", [jobId],
      );
      job = result.rows[0] ?? null;
      if (!job) issues.push("Không tìm thấy job được chỉ định. Kiểm tra worker và API dùng đúng cùng database; job cũng có thể đã bị xóa cùng kịch bản.");
      else if (job.provider !== configuration.provider || job.model !== configuration.model) issues.push("Provider/model trên worker khác cấu hình đã ghi vào job. Đồng bộ cấu hình API và worker trước khi tạo lượt mới.");
    }
  }
  // Readiness describes configuration and database access, not a live worker heartbeat
  // or a Cloudflare request. This command never claims jobs or sends scene content.
  return { ready: issues.length === 0, configuration, missingTables, queue, job, issues };
}
