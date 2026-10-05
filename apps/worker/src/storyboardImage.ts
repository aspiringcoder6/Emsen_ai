import { randomInt, randomUUID } from "node:crypto";
import { createImageGenerationProvider, ImageProviderError, validateGeneratedImage } from "@creator-flow/ai-provider";
import type { GenerateStoryboardImageRequestDto } from "@creator-flow/contracts";
import { workerConfig } from "./config.js";
import { workerDatabase } from "./database.js";
import { deleteMediaObject, uploadMediaBytes } from "./storage.js";

export type StoryboardImageJob = {
  id: string; script_id: string; user_id: string; provider: string; model: string;
  input: GenerateStoryboardImageRequestDto;
};

export function buildStoryboardImagePrompt(input: GenerateStoryboardImageRequestDto) {
  const styles = {
    sketch: "Storyboard pencil sketch, simple clear shapes, light paper texture, grayscale with subtle accent colors.",
    cinematic: "Cinematic storyboard still, realistic lighting, natural colors, carefully framed scene.",
    illustration: "Clean editorial illustration, clear silhouettes, soft colors, readable composition.",
  };
  if (!styles[input.style]) throw new ImageProviderError("configuration", "Phong cách minh họa không hợp lệ.");
  return [
    "Create one visual reference for a video scene. No text, subtitles, typography, logos, or watermarks; titles will be added as a separate layer.",
    styles[input.style],
    `Compose for a ${input.aspectRatio} video frame with space for a text overlay.`,
    input.prompt ? `Additional direction: ${input.prompt.slice(0, 1_000)}` : "",
    `Scene: ${input.scene.title.slice(0, 120)}. ${input.scene.visual.slice(0, 700)}`,
    input.scene.direction ? `Camera: ${input.scene.direction.slice(0, 250)}` : "",
  ].filter(Boolean).join("\n").slice(0, 2_048);
}

export async function recoverInterruptedStoryboardImages() {
  // Ambiguous external requests are never replayed automatically: they may have used quota.
  await workerDatabase.query(`UPDATE storyboard_image_jobs SET status = 'failed', error_message = 'Lượt tạo ảnh bị gián đoạn hoặc chờ quá lâu. Kiểm tra worker rồi thử lại thủ công; lượt cũ có thể đã dùng hạn mức.', finished_at = NOW(), updated_at = NOW() WHERE (status = 'running' AND updated_at < NOW() - INTERVAL '5 minutes') OR (status = 'queued' AND created_at < NOW() - INTERVAL '30 minutes')`);
}

export async function claimNextStoryboardImageJob(): Promise<StoryboardImageJob | null> {
  const result = await workerDatabase.query<StoryboardImageJob>(`
    UPDATE storyboard_image_jobs SET status = 'running', progress = 10, started_at = NOW(), updated_at = NOW()
    WHERE id = (SELECT id FROM storyboard_image_jobs WHERE status = 'queued' ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING id, script_id, user_id, provider, model, input
  `);
  return result.rows[0] ?? null;
}

export async function processStoryboardImage(job: StoryboardImageJob) {
  const assetId = randomUUID();
  let objectKey: string | null = null;
  let committed = false;
  try {
    const script = await workerDatabase.query<{ payload: { content?: { storyboard?: Array<{ id: string; locked?: boolean }> } } }>("SELECT payload FROM script_documents WHERE id = $1 AND user_id = $2", [job.script_id, job.user_id]);
    if (!script.rowCount) throw new ImageProviderError("configuration", "Kịch bản không còn tồn tại.");
    if (script.rows[0]!.payload.content?.storyboard?.some((frame) => frame.id === job.input.scene.id && frame.locked)) throw new ImageProviderError("configuration", "Cảnh đã được khóa. Mở khóa rồi tạo ảnh lại khi cần.");
    const capacity = await workerDatabase.query<{ count: string }>("SELECT COUNT(*) FROM storyboard_assets WHERE script_id = $1", [job.script_id]);
    if (Number(capacity.rows[0]!.count) >= 64) throw new ImageProviderError("configuration", "Kịch bản đã đạt giới hạn 64 ảnh.");
    const provider = createImageGenerationProvider(workerConfig.imageGeneration);
    if (!provider.configured || provider.provider !== job.provider || provider.model !== job.model) throw new ImageProviderError("configuration", "Cấu hình tạo ảnh đã thay đổi hoặc worker chưa có token. Kiểm tra API và worker dùng cùng cấu hình, rồi gửi một lượt mới.");
    if (!workerConfig.storage.endpoint || !workerConfig.storage.accessKey || !workerConfig.storage.secretKey || !workerConfig.storage.bucket) throw new ImageProviderError("configuration", "Worker chưa có kho media để lưu ảnh.");
    const prompt = buildStoryboardImagePrompt(job.input);
    const seed = randomInt(0, 2_147_483_647);
    const image = await provider.generateImage({ prompt, seed, aspectRatio: job.input.aspectRatio });
    const mimeType = validateGeneratedImage(image.bytes);
    if (image.provider !== job.provider || image.model !== job.model || mimeType !== image.mimeType) throw new ImageProviderError("invalid-image", "Thông tin model hoặc định dạng ảnh trả về không khớp.");
    await workerDatabase.query("UPDATE storyboard_image_jobs SET progress = 75, updated_at = NOW() WHERE id = $1 AND status = 'running'", [job.id]);
    const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
    objectKey = `storyboards/${job.user_id}/${job.script_id}/${assetId}.${extension}`;
    await uploadMediaBytes(objectKey, image.bytes, mimeType, 30_000);
    const client = await workerDatabase.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query("SELECT id FROM script_documents WHERE id = $1 AND user_id = $2 FOR UPDATE", [job.script_id, job.user_id]);
      if (!current.rowCount) throw new ImageProviderError("configuration", "Kịch bản đã bị xóa trong lúc tạo ảnh.");
      const count = await client.query<{ count: string }>("SELECT COUNT(*) FROM storyboard_assets WHERE script_id = $1", [job.script_id]);
      if (Number(count.rows[0]!.count) >= 64) throw new ImageProviderError("configuration", "Kịch bản đã đạt giới hạn 64 ảnh.");
      const active = await client.query("SELECT id FROM storyboard_image_jobs WHERE id = $1 AND status = 'running' FOR UPDATE", [job.id]);
      if (!active.rowCount) throw new ImageProviderError("configuration", "Lượt tạo ảnh đã kết thúc hoặc bị gián đoạn.");
      await client.query("INSERT INTO storyboard_assets (id, script_id, user_id, file_name, mime_type, size_bytes, object_key, status, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,'ready',$8)", [assetId, job.script_id, job.user_id, `storyboard-${job.input.scene.id.slice(0, 40)}.${extension}`, mimeType, image.bytes.length, objectKey, { origin: "generated", jobId: job.id, sceneId: job.input.scene.id, provider: image.provider, model: image.model, prompt, style: job.input.style, seed, requestedAspectRatio: job.input.aspectRatio }]);
      await client.query("UPDATE storyboard_image_jobs SET status = 'succeeded', progress = 100, asset_id = $1, error_message = NULL, finished_at = NOW(), updated_at = NOW() WHERE id = $2 AND status = 'running'", [assetId, job.id]);
      await client.query("COMMIT");
      committed = true;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  } catch (error) {
    if (objectKey && !committed) await deleteMediaObject(objectKey).catch(() => undefined);
    const message = error instanceof ImageProviderError ? error.message : "Chưa thể tạo hoặc lưu ảnh. Kiểm tra kho media và thử lại thủ công; lượt này có thể đã dùng hạn mức.";
    await workerDatabase.query("UPDATE storyboard_image_jobs SET status = 'failed', error_message = $1, finished_at = NOW(), updated_at = NOW() WHERE id = $2 AND status = 'running'", [message, job.id]);
    console.warn(`[worker:storyboard-image] job ${job.id} failed`);
  }
}
