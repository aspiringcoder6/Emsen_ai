import { randomUUID } from "node:crypto";
import type { ScriptStoryboardFrameDto, StoryboardAssetDto } from "@creator-flow/contracts";
import { database } from "../../database/pool.js";
import { HttpError } from "../../shared/http.js";
import { createVideoPlaybackUrl, createVideoUploadUrl, deleteVideoObject, ensureMediaBucket } from "../video/videoStorage.js";
import type { parseStoryboardUpload } from "./storyboard.schema.js";

export async function uploadStoryboardAsset(userId: string, scriptId: string, input: ReturnType<typeof parseStoryboardUpload>): Promise<StoryboardAssetDto> {
  const id = randomUUID();
  const extension = input.mimeType === "image/jpeg" ? "jpg" : input.mimeType === "image/png" ? "png" : "webp";
  const objectKey = `storyboards/${userId}/${scriptId}/${id}.${extension}`;
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const script = await client.query("SELECT id FROM script_documents WHERE id = $1 AND user_id = $2 FOR UPDATE", [scriptId, userId]);
    if (!script.rowCount) throw new HttpError(404, "SCRIPT_NOT_FOUND", "Không tìm thấy kịch bản này.");
    const count = await client.query<{ count: string }>("SELECT COUNT(*) FROM storyboard_assets WHERE script_id = $1", [scriptId]);
    if (Number(count.rows[0]!.count) >= 64) throw new HttpError(409, "STORYBOARD_ASSET_LIMIT", "Kịch bản đã có 64 ảnh. Hãy dùng lại ảnh hiện có hoặc tạo kịch bản mới.");
    await client.query("INSERT INTO storyboard_assets (id, script_id, user_id, file_name, mime_type, size_bytes, object_key, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')", [id, scriptId, userId, input.fileName, input.mimeType, input.bytes.length, objectKey]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
  try {
    await ensureMediaBucket();
    const ticket = createVideoUploadUrl(objectKey);
    const response = await fetch(ticket.uploadUrl, { method: "PUT", headers: { "Content-Type": input.mimeType }, body: new Uint8Array(input.bytes), signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error("Upload failed");
    const saved = await database.query("UPDATE storyboard_assets SET status = 'ready' WHERE id = $1 AND user_id = $2", [id, userId]);
    if (!saved.rowCount) throw new HttpError(409, "SCRIPT_NOT_FOUND", "Kịch bản đã bị xóa trong lúc tải ảnh.");
    return await getStoryboardAsset(userId, scriptId, id);
  } catch (error) {
    await database.query("DELETE FROM storyboard_assets WHERE id = $1 AND user_id = $2", [id, userId]);
    await deleteVideoObject(objectKey).catch(() => undefined);
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "STORYBOARD_UPLOAD_FAILED", "Chưa thể lưu ảnh. Kiểm tra kho media và thử lại; cảnh hiện tại vẫn được giữ.");
  }
}

export async function getStoryboardAsset(userId: string, scriptId: string, assetId: string): Promise<StoryboardAssetDto> {
  const result = await database.query<{ id: string; object_key: string; file_name: string }>("SELECT id, object_key, file_name FROM storyboard_assets WHERE id = $1 AND script_id = $2 AND user_id = $3 AND status = 'ready'", [assetId, scriptId, userId]);
  const asset = result.rows[0];
  if (!asset) throw new HttpError(404, "STORYBOARD_ASSET_NOT_FOUND", "Không tìm thấy ảnh storyboard này.");
  const ticket = createVideoPlaybackUrl(asset.object_key);
  return { id: asset.id, fileName: asset.file_name, imageUrl: ticket.playbackUrl, expiresAt: ticket.expiresAt };
}

export async function assertStoryboardAssetOwnership(userId: string, scriptId: string, frames: ScriptStoryboardFrameDto[]) {
  const ids = [...new Set(frames.flatMap((frame) => frame.illustrationAssetId ? [frame.illustrationAssetId] : []))];
  if (!ids.length) return;
  const result = await database.query("SELECT id FROM storyboard_assets WHERE id = ANY($1::uuid[]) AND user_id = $2 AND script_id = $3 AND status = 'ready'", [ids, userId, scriptId]);
  if (result.rowCount !== ids.length) throw new HttpError(400, "INVALID_STORYBOARD_ASSET", "Ảnh cần thuộc đúng kịch bản và đã tải lên hoàn tất.");
}

export async function getStoryboardObjectKeys(userId: string, scriptId: string) {
  const result = await database.query<{ object_key: string }>("SELECT object_key FROM storyboard_assets WHERE user_id = $1 AND script_id = $2", [userId, scriptId]);
  return result.rows.map((row) => row.object_key);
}

export async function removeStoryboardObjects(keys: string[]) {
  await Promise.allSettled(keys.map((key) => deleteVideoObject(key)));
}
