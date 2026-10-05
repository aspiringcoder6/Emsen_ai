import { randomUUID } from "node:crypto";
import { createImageGenerationProvider, ImageProviderError } from "@creator-flow/ai-provider";
import type { GenerateStoryboardImageRequestDto, StoryboardImageJobDto, StoryboardImageWorkspaceDto } from "@creator-flow/contracts";
import { config } from "../../config.js";
import { database } from "../../database/pool.js";
import { HttpError } from "../../shared/http.js";
import { ensureMediaBucket } from "../video/videoStorage.js";

type JobRow = {
  id: string; scene_id: string; status: StoryboardImageJobDto["status"]; progress: number;
  provider: string; model: string; input: GenerateStoryboardImageRequestDto;
  asset_id: string | null; error_message: string | null; created_at: Date;
};

const jobColumns = "id, scene_id, status, progress, provider, model, input, asset_id, error_message, created_at";
// Explicit UTC bounds match Cloudflare's daily reset even when PostgreSQL uses a local timezone.
const today = "created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'";

function jobDto(row: JobRow): StoryboardImageJobDto {
  return { id: row.id, sceneId: row.scene_id, status: row.status, progress: row.progress, provider: row.provider, model: row.model, source: row.input, assetId: row.asset_id, errorMessage: row.error_message, createdAt: row.created_at.toISOString() };
}

function providerState() {
  try {
    const provider = createImageGenerationProvider(config.imageGeneration);
    const configured = provider.configured && config.mediaStorage.enabled;
    return { provider, configured, message: configured ? null : !config.mediaStorage.enabled ? "Cần cấu hình kho media trước khi tạo ảnh." : provider.provider === "cloudflare-workers-ai" ? "Tạo ảnh chưa được bật. Quản trị viên cần thêm Account ID và API Token Cloudflare vào cấu hình backend." : "Dịch vụ tạo ảnh chưa được bật. Kiểm tra cấu hình nhà cung cấp ở backend." };
  } catch (error) {
    return { provider: null, configured: false, message: error instanceof ImageProviderError ? error.message : "Cấu hình tạo ảnh chưa hợp lệ." };
  }
}

export async function getStoryboardImageWorkspace(userId: string, scriptId: string): Promise<StoryboardImageWorkspaceDto> {
  const script = await database.query("SELECT id FROM script_documents WHERE id = $1 AND user_id = $2", [scriptId, userId]);
  if (!script.rowCount) throw new HttpError(404, "SCRIPT_NOT_FOUND", "Không tìm thấy kịch bản này.");
  const counts = await database.query<{ own: string; total: string }>(`SELECT COUNT(*) FILTER (WHERE user_id = $1) AS own, COUNT(*) AS total FROM storyboard_image_usage WHERE ${today}`, [userId]);
  const jobs = await database.query<JobRow>(`SELECT ${jobColumns} FROM storyboard_image_jobs WHERE script_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 64`, [scriptId, userId]);
  const state = providerState();
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);
  return {
    configured: state.configured, configurationMessage: state.message,
    provider: state.provider?.provider ?? config.imageGeneration.provider, model: state.provider?.model ?? config.imageGeneration.model,
    capabilities: state.provider?.capabilities ?? { exactAspectRatio: false, referenceImages: false },
    usage: { usedToday: Number(counts.rows[0]!.own), dailyLimit: config.imageGeneration.dailyUserLimit, workspaceUsedToday: Number(counts.rows[0]!.total), workspaceDailyLimit: config.imageGeneration.dailyWorkspaceLimit, resetsAt: tomorrow.toISOString() },
    jobs: jobs.rows.map(jobDto),
  };
}

export async function queueStoryboardImage(userId: string, scriptId: string, input: GenerateStoryboardImageRequestDto): Promise<StoryboardImageJobDto> {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    // Serialize reservation across users/processes, including the workspace daily cap.
    await client.query("SELECT pg_advisory_xact_lock(18270601)");
    const script = await client.query<{ revision: number; payload: { content?: { storyboard?: Array<{ id: string; locked?: boolean }> } } }>("SELECT revision, payload FROM script_documents WHERE id = $1 AND user_id = $2 FOR UPDATE", [scriptId, userId]);
    if (!script.rowCount) throw new HttpError(404, "SCRIPT_NOT_FOUND", "Không tìm thấy kịch bản này.");
    const existing = await client.query<JobRow & { script_id: string }>(`SELECT ${jobColumns}, script_id FROM storyboard_image_jobs WHERE user_id = $1 AND request_id = $2`, [userId, input.requestId]);
    if (existing.rows[0]) {
      // JSONB reorders keys; compare semantic fields rather than object serialization.
      if (existing.rows[0].script_id !== scriptId || canonicalRequest(existing.rows[0].input) !== canonicalRequest(input)) throw new HttpError(409, "IMAGE_REQUEST_REUSED", "Mã yêu cầu đã dùng cho một nội dung khác.");
      await client.query("COMMIT");
      return jobDto(existing.rows[0]);
    }
    if (script.rows[0]!.revision !== input.scriptRevision) throw new HttpError(409, "SCRIPT_REVISION_CONFLICT", "Kịch bản đã thay đổi ở nơi khác. Mở lại bản mới nhất trước khi tạo ảnh.");
    if (input.scene.locked || script.rows[0]!.payload.content?.storyboard?.some((frame) => frame.id === input.scene.id && frame.locked)) throw new HttpError(409, "STORYBOARD_SCENE_LOCKED", "Mở khóa cảnh và lưu kịch bản trước khi tạo ảnh.");
    const state = providerState();
    if (!state.configured) throw new HttpError(503, "IMAGE_PROVIDER_NOT_CONFIGURED", state.message!);
    const active = await client.query<{ scene_id: string; script_id: string }>("SELECT scene_id, script_id FROM storyboard_image_jobs WHERE user_id = $1 AND status IN ('queued', 'running')", [userId]);
    if (active.rows.some((job) => job.script_id === scriptId && job.scene_id === input.scene.id)) throw new HttpError(409, "IMAGE_SCENE_BUSY", "Cảnh này đang có một lượt tạo ảnh. Chờ lượt đó hoàn tất.");
    if (active.rows.length >= 3) throw new HttpError(409, "IMAGE_QUEUE_FULL", "Bạn đang có 3 lượt tạo ảnh. Chờ một lượt hoàn tất trước khi gửi tiếp.");
    const counts = await client.query<{ own: string; total: string }>(`SELECT COUNT(*) FILTER (WHERE user_id = $1) AS own, COUNT(*) AS total FROM storyboard_image_usage WHERE ${today}`, [userId]);
    if (Number(counts.rows[0]!.own) >= config.imageGeneration.dailyUserLimit || Number(counts.rows[0]!.total) >= config.imageGeneration.dailyWorkspaceLimit) throw new HttpError(429, "IMAGE_DEMO_LIMIT", "Đã hết lượt thử hôm nay. Hạn mức đặt lại lúc 07:00 giờ Việt Nam; hệ thống không chuyển sang dịch vụ tính phí.");
    const assets = await client.query<{ count: string }>("SELECT (SELECT COUNT(*) FROM storyboard_assets WHERE script_id = $1) + (SELECT COUNT(*) FROM storyboard_image_jobs WHERE script_id = $1 AND status IN ('queued', 'running')) AS count", [scriptId]);
    if (Number(assets.rows[0]!.count) >= 64) throw new HttpError(409, "STORYBOARD_ASSET_LIMIT", "Kịch bản đã đạt giới hạn 64 ảnh, kể cả ảnh đang chờ.");
    await ensureMediaBucket();
    const id = randomUUID();
    const result = await client.query<JobRow>(`INSERT INTO storyboard_image_jobs (id, request_id, script_id, user_id, scene_id, status, provider, model, input) VALUES ($1,$2,$3,$4,$5,'queued',$6,$7,$8) RETURNING ${jobColumns}`, [id, input.requestId, scriptId, userId, input.scene.id, state.provider!.provider, state.provider!.model, input]);
    await client.query("INSERT INTO storyboard_image_usage (id, user_id, provider) VALUES ($1,$2,$3)", [id, userId, state.provider!.provider]);
    await client.query("COMMIT");
    return jobDto(result.rows[0]!);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

function canonicalRequest(value: GenerateStoryboardImageRequestDto) {
  return JSON.stringify([value.requestId, value.scriptRevision, value.aspectRatio, value.style, value.prompt, value.scene.id, value.scene.title, value.scene.visual, value.scene.direction, value.scene.locked ?? false]);
}
