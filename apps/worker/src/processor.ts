import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import type { PoolClient } from "pg";
import { getGeminiApiKey } from "./aiKey.js";
import { workerDatabase } from "./database.js";
import { probeVideo, type VideoProbeResult } from "./mediaProbe.js";
import { deleteMediaObject, downloadMediaObject } from "./storage.js";
import { transcribeVideos } from "./transcription.js";

type MediaJob = {
  attempts: number;
  id: string;
  max_attempts: number;
  project_id: string;
  type: "probe" | "transcribe";
  user_id: string;
};

type SourceAsset = {
  file_name: string;
  id: string;
  metadata: Record<string, unknown>;
  mime_type: string;
  object_key: string;
  size_bytes: string;
};

type LocalAsset = SourceAsset & {
  localPath: string;
  probe?: VideoProbeResult;
};

function safeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Worker chưa xử lý được video.";
  return message.replace(/AIza[\w-]+/g, "[redacted]").slice(0, 1_000);
}

async function setProgress(jobId: string, progress: number) {
  await workerDatabase.query(
    `UPDATE media_jobs SET progress = $1, updated_at = NOW() WHERE id = $2 AND status = 'running'`,
    [Math.max(0, Math.min(99, Math.round(progress))), jobId],
  );
}

async function sourceAssets(job: MediaJob) {
  const result = await workerDatabase.query<SourceAsset>(
    `SELECT id, file_name, mime_type, size_bytes, object_key, metadata
     FROM media_assets
     WHERE project_id = $1 AND user_id = $2 AND kind = 'source'
       AND status IN ('uploaded', 'ready')
     ORDER BY created_at ASC`,
    [job.project_id, job.user_id],
  );
  if (!result.rows.length) throw new Error("Dự án không còn video thô để xử lý.");
  return result.rows;
}

function safeExtension(fileName: string) {
  const extension = extname(fileName).toLocaleLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : ".video";
}

async function downloadAssets(job: MediaJob, directory: string) {
  const assets = await sourceAssets(job);
  const local: LocalAsset[] = [];
  for (const [index, asset] of assets.entries()) {
    const localPath = join(directory, `${String(index + 1).padStart(2, "0")}-${asset.id}${safeExtension(asset.file_name)}`);
    await downloadMediaObject(asset.object_key, localPath);
    local.push({ ...asset, localPath });
    await setProgress(job.id, 5 + ((index + 1) / assets.length) * 20);
  }
  return local;
}

async function finishJob(jobId: string, output: Record<string, unknown> = {}) {
  await workerDatabase.query(
    `UPDATE media_jobs
     SET status = 'succeeded', progress = 100, output = $1, error_message = NULL,
         finished_at = NOW(), updated_at = NOW()
     WHERE id = $2`,
    [output, jobId],
  );
}

async function markSourceFailed(asset: SourceAsset, userId: string, message: string) {
  await workerDatabase.query(
    `UPDATE media_assets
     SET status = 'failed', metadata = metadata || jsonb_build_object('probeError', $1::text),
         updated_at = NOW()
     WHERE id = $2 AND user_id = $3`,
    [message.slice(0, 500), asset.id, userId],
  );
  await deleteMediaObject(asset.object_key).catch(() => undefined);
}

async function processProbe(job: MediaJob, directory: string) {
  const assets = await downloadAssets(job, directory);
  let totalDurationSeconds = 0;
  for (const [index, asset] of assets.entries()) {
    let probe: VideoProbeResult;
    try {
      probe = await probeVideo(asset.localPath);
    } catch {
      const message = `“${asset.file_name}” không phải video hợp lệ hoặc dùng định dạng chưa được hỗ trợ.`;
      await markSourceFailed(asset, job.user_id, message);
      throw new Error(message);
    }
    if (probe.width >= probe.height) {
      const message = `“${asset.file_name}” chưa phải video dọc. Hãy quay dọc hoặc chọn clip khác.`;
      await markSourceFailed(asset, job.user_id, message);
      throw new Error(message);
    }
    totalDurationSeconds += probe.durationSeconds;
    if (totalDurationSeconds > 900) {
      const message = `Thêm “${asset.file_name}” làm tổng thời lượng vượt quá 15 phút. Hãy dùng clip ngắn hơn.`;
      await markSourceFailed(asset, job.user_id, message);
      throw new Error(message);
    }
    asset.probe = probe;
    await workerDatabase.query(
      `UPDATE media_assets
       SET status = 'ready', metadata = metadata || jsonb_build_object('probe', $1::jsonb), updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [JSON.stringify(probe), asset.id, job.user_id],
    );
    await setProgress(job.id, 25 + ((index + 1) / assets.length) * 65);
  }
  const transcribeJobId = randomUUID();
  const client = await workerDatabase.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO media_jobs (
         id, project_id, user_id, type, status, progress, idempotency_key, input
       ) VALUES ($1, $2, $3, 'transcribe', 'queued', 0, $4, $5)
       ON CONFLICT (project_id, type, idempotency_key) DO NOTHING`,
      [transcribeJobId, job.project_id, job.user_id, `${job.id}:transcribe`, { probeJobId: job.id }],
    );
    await client.query(
      `UPDATE media_jobs
       SET status = 'succeeded', progress = 100, output = $1, error_message = NULL,
           finished_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [{ assetCount: assets.length, totalDurationSeconds }, job.id],
    );
    await client.query(
      `UPDATE media_projects
       SET status = 'transcribing', revision = revision + 1, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [job.project_id, job.user_id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function probeFromMetadata(metadata: Record<string, unknown>) {
  const value = metadata.probe;
  if (!value || typeof value !== "object") return null;
  const durationSeconds = Number((value as { durationSeconds?: unknown }).durationSeconds);
  return Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : null;
}

async function processTranscription(job: MediaJob, directory: string) {
  const assets = await downloadAssets(job, directory);
  const transcriptionAssets = assets.map((asset) => {
    const durationSeconds = probeFromMetadata(asset.metadata);
    if (!durationSeconds) throw new Error(`Thiếu thông tin thời lượng của “${asset.file_name}”. Hãy chạy lại bước kiểm tra video.`);
    return {
      durationSeconds,
      fileName: asset.file_name,
      localPath: asset.localPath,
      mimeType: asset.mime_type,
    };
  });
  const apiKey = await getGeminiApiKey(job.user_id);
  const transcript = await transcribeVideos(apiKey, transcriptionAssets, (progress) => setProgress(job.id, 25 + progress * 0.7));
  const client = await workerDatabase.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO video_transcripts (
         project_id, user_id, revision, status, language, source, model, duration_seconds, segments
       ) VALUES ($1, $2, 1, 'draft', $3, 'ai', $4, $5, $6)
       ON CONFLICT (project_id) DO NOTHING`,
      [job.project_id, job.user_id, transcript.language, transcript.model, transcript.durationSeconds, JSON.stringify(transcript.segments)],
    );
    await client.query(
      `UPDATE media_jobs
       SET status = 'succeeded', progress = 100,
           output = jsonb_build_object('segmentCount', $1::int, 'durationSeconds', $2::double precision),
           error_message = NULL, finished_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [transcript.segments.length, transcript.durationSeconds, job.id],
    );
    await client.query(
      `UPDATE media_projects
       SET status = 'transcript-ready', revision = revision + 1, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [job.project_id, job.user_id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function failJob(job: MediaJob, error: unknown) {
  const message = safeMessage(error);
  await workerDatabase.query(
    `UPDATE media_jobs
     SET status = 'failed', error_message = $1, finished_at = NOW(), updated_at = NOW()
     WHERE id = $2`,
    [message, job.id],
  );
  await workerDatabase.query(
    `UPDATE media_projects
     SET status = 'failed', revision = revision + 1, updated_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [job.project_id, job.user_id],
  );
  console.error(`[worker:${job.type}] job ${job.id} failed: ${message}`);
}

export async function claimNextJob() {
  const client = await workerDatabase.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<MediaJob>(
      `SELECT id, project_id, user_id, type, attempts, max_attempts
       FROM media_jobs
       WHERE status = 'queued' AND type IN ('probe', 'transcribe')
       ORDER BY created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1`,
    );
    const job = result.rows[0] ?? null;
    if (job) {
      await client.query(
        `UPDATE media_jobs
         SET status = 'running', attempts = attempts + 1, started_at = COALESCE(started_at, NOW()),
             error_message = NULL, updated_at = NOW()
         WHERE id = $1`,
        [job.id],
      );
      job.attempts += 1;
    }
    await client.query("COMMIT");
    return job;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function recoverInterruptedJobs() {
  await workerDatabase.query(
    `UPDATE media_jobs
     SET status = CASE WHEN attempts < max_attempts THEN 'queued' ELSE 'failed' END,
         error_message = CASE WHEN attempts < max_attempts THEN 'Worker khởi động lại; tác vụ sẽ được chạy tiếp.' ELSE 'Tác vụ đã bị gián đoạn quá số lần cho phép.' END,
         updated_at = NOW()
     WHERE status = 'running' AND updated_at < NOW() - INTERVAL '15 minutes'`,
  );
}

export async function processMediaJob(job: MediaJob) {
  const directory = await mkdtemp(join(tmpdir(), `emsen-${job.type}-`));
  console.log(`[worker:${job.type}] processing job ${job.id}`);
  try {
    if (job.type === "probe") await processProbe(job, directory);
    else if (job.type === "transcribe") await processTranscription(job, directory);
    else await finishJob(job.id);
    console.log(`[worker:${job.type}] completed job ${job.id}`);
  } catch (error) {
    await failJob(job, error);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}
