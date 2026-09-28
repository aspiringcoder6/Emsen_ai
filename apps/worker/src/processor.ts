import { randomUUID } from "node:crypto";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import type { PoolClient } from "pg";
import { getGeminiApiKey } from "./aiKey.js";
import { workerDatabase } from "./database.js";
import { probeVideo, type VideoProbeResult } from "./mediaProbe.js";
import { deleteMediaObject, downloadMediaObject, uploadMediaObject } from "./storage.js";
import { suggestSmartCuts, type SmartCutTranscriptSegment } from "./smartCut.js";
import { transcribeVideos } from "./transcription.js";
import { createCutPreview, type PreviewCutDecision } from "./videoPreview.js";

type MediaJob = {
  attempts: number;
  id: string;
  input: Record<string, unknown>;
  max_attempts: number;
  project_id: string;
  type: "preview" | "probe" | "suggest-cuts" | "transcribe";
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

async function processSmartCut(job: MediaJob) {
  const result = await workerDatabase.query<{
    duration_seconds: number;
    revision: number;
    segments: SmartCutTranscriptSegment[];
    settings: { targetDurationSeconds?: number };
    status: "approved" | "draft";
    title: string;
  }>(
    `SELECT transcripts.duration_seconds, transcripts.revision, transcripts.segments,
            transcripts.status, projects.settings, projects.title
     FROM video_transcripts AS transcripts
     JOIN media_projects AS projects
       ON projects.id = transcripts.project_id AND projects.user_id = transcripts.user_id
     WHERE transcripts.project_id = $1 AND transcripts.user_id = $2`,
    [job.project_id, job.user_id],
  );
  const transcript = result.rows[0];
  if (!transcript || transcript.status !== "approved") {
    throw new Error("Lời thoại cần được duyệt trước khi tạo Smart Cut.");
  }
  const expectedRevision = Number(job.input.transcriptRevision);
  if (Number.isFinite(expectedRevision) && expectedRevision !== transcript.revision) {
    throw new Error("Lời thoại đã thay đổi. Hãy tạo lại gợi ý Smart Cut từ phiên bản mới.");
  }
  const segments = Array.isArray(transcript.segments) ? transcript.segments : [];
  if (!segments.length) throw new Error("Video chưa có lời thoại để tạo Smart Cut.");
  const apiKey = await getGeminiApiKey(job.user_id);
  const cut = await suggestSmartCuts(apiKey, {
    durationSeconds: Number(transcript.duration_seconds),
    segments,
    targetDurationSeconds: Number(transcript.settings?.targetDurationSeconds) || Number(transcript.duration_seconds),
    title: transcript.title,
  }, (progress) => setProgress(job.id, progress));

  const client = await workerDatabase.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ revision: number; status: string }>(
      `SELECT revision, status FROM video_transcripts
       WHERE project_id = $1 AND user_id = $2 FOR UPDATE`,
      [job.project_id, job.user_id],
    );
    if (current.rows[0]?.revision !== transcript.revision || current.rows[0]?.status !== "approved") {
      throw new Error("Lời thoại vừa thay đổi trong lúc Emsen phân tích. Hãy tạo lại Smart Cut.");
    }
    await client.query(
      `INSERT INTO video_cut_drafts (
         project_id, user_id, transcript_revision, revision, status, source, model,
         original_duration_seconds, estimated_duration_seconds, decisions
       ) VALUES ($1, $2, $3, 1, 'draft', 'ai', $4, $5, $6, $7)
       ON CONFLICT (project_id) DO UPDATE SET
         transcript_revision = EXCLUDED.transcript_revision,
         revision = video_cut_drafts.revision + 1,
         status = 'draft', source = 'ai', model = EXCLUDED.model,
         original_duration_seconds = EXCLUDED.original_duration_seconds,
         estimated_duration_seconds = EXCLUDED.estimated_duration_seconds,
         decisions = EXCLUDED.decisions, updated_at = NOW()`,
      [
        job.project_id,
        job.user_id,
        transcript.revision,
        cut.model,
        transcript.duration_seconds,
        cut.estimatedDurationSeconds,
        JSON.stringify(cut.decisions),
      ],
    );
    await client.query(
      `UPDATE media_jobs
       SET status = 'succeeded', progress = 100,
           output = jsonb_build_object(
             'decisionCount', $1::int,
             'suggestedCutCount', $2::int,
             'estimatedDurationSeconds', $3::double precision
           ), error_message = NULL, finished_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [cut.decisions.length, cut.decisions.filter((item) => item.action === "cut").length, cut.estimatedDurationSeconds, job.id],
    );
    await client.query(
      `UPDATE media_projects
       SET status = 'cut-review', revision = revision + 1, updated_at = NOW()
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

async function processPreview(job: MediaJob, directory: string) {
  const assets = await downloadAssets(job, directory);
  const cutResult = await workerDatabase.query<{
    current_transcript_revision: number;
    decisions: PreviewCutDecision[];
    revision: number;
    transcript_revision: number;
  }>(
    `SELECT cuts.revision, cuts.transcript_revision, cuts.decisions,
            transcripts.revision AS current_transcript_revision
     FROM video_cut_drafts AS cuts
     JOIN video_transcripts AS transcripts
       ON transcripts.project_id = cuts.project_id AND transcripts.user_id = cuts.user_id
     WHERE cuts.project_id = $1 AND cuts.user_id = $2`,
    [job.project_id, job.user_id],
  );
  const cut = cutResult.rows[0];
  if (!cut) throw new Error("Dự án chưa có Smart Cut để tạo preview.");
  const expectedRevision = Number(job.input.cutRevision);
  if (cut.revision !== expectedRevision || cut.transcript_revision !== cut.current_transcript_revision) {
    throw new Error("Smart Cut hoặc lời thoại đã thay đổi. Hãy tạo preview lại từ bản mới nhất.");
  }
  const decisions = Array.isArray(cut.decisions) ? cut.decisions : [];
  const previewAssets = assets.map((asset) => {
    const durationSeconds = probeFromMetadata(asset.metadata);
    if (!durationSeconds) throw new Error(`Thiếu thời lượng của “${asset.file_name}”. Hãy kiểm tra video lại.`);
    const probe = asset.metadata.probe as { audioCodec?: unknown } | undefined;
    return {
      durationSeconds,
      hasAudio: typeof probe?.audioCodec === "string" && probe.audioCodec.length > 0,
      localPath: asset.localPath,
    };
  });
  const normalizedPath = join(directory, "preview-source.mp4");
  const outputPath = join(directory, "smart-cut-preview.mp4");
  const preview = await createCutPreview(
    previewAssets,
    decisions,
    normalizedPath,
    outputPath,
    (progress) => setProgress(job.id, progress),
  );
  const outputStat = await stat(outputPath);
  if (!outputStat.size) throw new Error("FFmpeg không tạo được tệp preview hợp lệ.");

  const assetId = randomUUID();
  const objectKey = `users/${job.user_id}/projects/${job.project_id}/preview/${assetId}.mp4`;
  let uploaded = false;
  let committed = false;
  try {
    await uploadMediaObject(objectKey, outputPath, "video/mp4");
    uploaded = true;
    await setProgress(job.id, 96);
    const client = await workerDatabase.connect();
    let previousObjectKeys: string[] = [];
    try {
      await client.query("BEGIN");
      const current = await client.query<{
        current_transcript_revision: number;
        revision: number;
        transcript_revision: number;
      }>(
        `SELECT cuts.revision, cuts.transcript_revision,
                transcripts.revision AS current_transcript_revision
         FROM video_cut_drafts AS cuts
         JOIN video_transcripts AS transcripts
           ON transcripts.project_id = cuts.project_id AND transcripts.user_id = cuts.user_id
         WHERE cuts.project_id = $1 AND cuts.user_id = $2
         FOR UPDATE OF cuts`,
        [job.project_id, job.user_id],
      );
      const currentCut = current.rows[0];
      if (
        !currentCut || currentCut.revision !== cut.revision ||
        currentCut.transcript_revision !== currentCut.current_transcript_revision
      ) {
        throw new Error("Smart Cut thay đổi trong lúc dựng preview. Hãy thử lại từ bản mới nhất.");
      }
      const previous = await client.query<{ object_key: string }>(
        `DELETE FROM media_assets
         WHERE project_id = $1 AND user_id = $2 AND kind = 'output'
           AND metadata->>'purpose' = 'cut-preview'
         RETURNING object_key`,
        [job.project_id, job.user_id],
      );
      previousObjectKeys = previous.rows.map((row) => row.object_key);
      await client.query(
        `INSERT INTO media_assets (
           id, project_id, user_id, kind, status, file_name, mime_type, size_bytes,
           object_key, idempotency_key, metadata
         ) VALUES ($1, $2, $3, 'output', 'ready', $4, 'video/mp4', $5, $6, $7, $8)`,
        [
          assetId,
          job.project_id,
          job.user_id,
          `smart-cut-preview-r${cut.revision}.mp4`,
          outputStat.size,
          objectKey,
          `preview:${job.id}`,
          JSON.stringify({
            audioFadeMs: 70,
            cutRevision: cut.revision,
            durationSeconds: preview.durationSeconds,
            height: 640,
            intervalCount: preview.intervalCount,
            purpose: "cut-preview",
            width: 360,
          }),
        ],
      );
      await client.query(
        `UPDATE media_jobs
         SET status = 'succeeded', progress = 100,
             output = jsonb_build_object(
               'assetId', $1::uuid,
               'cutRevision', $2::int,
               'durationSeconds', $3::double precision,
               'intervalCount', $4::int
             ), error_message = NULL, finished_at = NOW(), updated_at = NOW()
         WHERE id = $5`,
        [assetId, cut.revision, preview.durationSeconds, preview.intervalCount, job.id],
      );
      await client.query(
        `UPDATE media_projects SET revision = revision + 1, updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [job.project_id, job.user_id],
      );
      await client.query("COMMIT");
      committed = true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await Promise.allSettled(previousObjectKeys.map((key) => deleteMediaObject(key)));
  } catch (error) {
    if (uploaded && !committed) await deleteMediaObject(objectKey).catch(() => undefined);
    throw error;
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
  if (job.type === "suggest-cuts") {
    await workerDatabase.query(
      `UPDATE media_projects
       SET status = CASE
             WHEN EXISTS (SELECT 1 FROM video_cut_drafts WHERE project_id = $1) THEN 'cut-review'
             ELSE 'transcript-ready'
           END,
           revision = revision + 1, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [job.project_id, job.user_id],
    );
  } else if (job.type === "preview") {
    await workerDatabase.query(
      `UPDATE media_projects SET revision = revision + 1, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [job.project_id, job.user_id],
    );
  } else {
    await workerDatabase.query(
      `UPDATE media_projects
       SET status = 'failed', revision = revision + 1, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [job.project_id, job.user_id],
    );
  }
  console.error(`[worker:${job.type}] job ${job.id} failed: ${message}`);
}

export async function claimNextJob() {
  const client = await workerDatabase.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<MediaJob>(
      `SELECT id, project_id, user_id, type, attempts, max_attempts, input
       FROM media_jobs
       WHERE status = 'queued' AND type IN ('probe', 'transcribe', 'suggest-cuts', 'preview')
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
    else if (job.type === "suggest-cuts") await processSmartCut(job);
    else if (job.type === "preview") await processPreview(job, directory);
    else await finishJob(job.id);
    console.log(`[worker:${job.type}] completed job ${job.id}`);
  } catch (error) {
    await failJob(job, error);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}
