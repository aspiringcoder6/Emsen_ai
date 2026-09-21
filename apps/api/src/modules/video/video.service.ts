import { randomUUID } from "node:crypto";
import type {
  CompleteVideoUploadResponseDto,
  CreateVideoProjectRequestDto,
  CreateVideoUploadRequestDto,
  ScriptDocumentDto,
  VideoAssetDto,
  VideoCaptionPreset,
  VideoJobDto,
  VideoProjectDto,
  VideoProjectScriptDto,
  VideoProjectScriptOptionDto,
  VideoProjectSettingsDto,
  VideoProjectStatus,
  VideoPlaybackTicketDto,
  VideoTranscriptDto,
  UpdateVideoTranscriptRequestDto,
  VideoUploadTicketDto,
  VideoWorkspaceDto,
} from "@creator-flow/contracts";
import { database } from "../../database/pool.js";
import { HttpError } from "../../shared/http.js";
import { getAiKeySettings } from "../ai/aiKey.service.js";
import {
  acceptedVideoMimeTypes,
  maxVideoBytes,
  maxVideoFiles,
} from "./video.schema.js";
import {
  createVideoUploadUrl,
  createVideoPlaybackUrl,
  ensureMediaBucket,
  inspectVideoObject,
  mediaStorageConfigured,
} from "./videoStorage.js";

type ScriptSnapshot = VideoProjectScriptDto & {
  capturedAt: string;
  content: ScriptDocumentDto["content"];
};

type ProjectRow = {
  created_at: Date | string;
  id: string;
  revision: number;
  script_payload: ScriptDocumentDto | null;
  script_snapshot: ScriptSnapshot;
  settings: VideoProjectSettingsDto;
  status: VideoProjectStatus;
  title: string;
  updated_at: Date | string;
};

type AssetRow = {
  created_at: Date | string;
  file_name: string;
  id: string;
  kind: VideoAssetDto["kind"];
  mime_type: string;
  project_id: string;
  size_bytes: number | string;
  status: VideoAssetDto["status"];
  updated_at: Date | string;
};

type JobRow = {
  created_at: Date | string;
  error_message: string | null;
  id: string;
  progress: number;
  project_id: string;
  status: VideoJobDto["status"];
  type: VideoJobDto["type"];
  updated_at: Date | string;
};

type TranscriptRow = {
  duration_seconds: number;
  language: string;
  model: string | null;
  project_id: string;
  revision: number;
  segments: VideoTranscriptDto["segments"];
  source: "ai";
  status: VideoTranscriptDto["status"];
  updated_at: Date | string;
};

function iso(value: Date | string) {
  return new Date(value).toISOString();
}

function scriptSummary(script: ScriptDocumentDto): VideoProjectScriptDto {
  return {
    aspectRatio: script.settings.aspectRatio,
    id: script.id,
    revision: script.revision,
    status: script.status,
    targetDurationSeconds: script.settings.targetDurationSeconds,
    title: script.title,
    updatedAt: script.updatedAt,
  };
}

function compatibility(script: VideoProjectScriptDto) {
  if (script.status === "archived") return "Kịch bản đang được lưu trữ; hãy mở lại trước khi tạo dự án video.";
  if (script.aspectRatio !== "9:16") return "Video Studio MVP hiện chỉ dựng video dọc 9:16.";
  if (script.targetDurationSeconds < 30 || script.targetDurationSeconds > 180) {
    return "Video Studio MVP hỗ trợ thành phẩm từ 30 đến 180 giây.";
  }
  return null;
}

function assetDto(row: AssetRow): VideoAssetDto {
  return {
    createdAt: iso(row.created_at),
    fileName: row.file_name,
    id: row.id,
    kind: row.kind,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    status: row.status,
    updatedAt: iso(row.updated_at),
  };
}

function jobDto(row: JobRow): VideoJobDto {
  return {
    createdAt: iso(row.created_at),
    errorMessage: row.error_message,
    id: row.id,
    progress: row.progress,
    status: row.status,
    type: row.type,
    updatedAt: iso(row.updated_at),
  };
}

function transcriptDto(row: TranscriptRow): VideoTranscriptDto {
  return {
    durationSeconds: Number(row.duration_seconds),
    language: row.language,
    model: row.model,
    revision: row.revision,
    segments: Array.isArray(row.segments) ? row.segments : [],
    source: row.source,
    status: row.status,
    updatedAt: iso(row.updated_at),
  };
}

async function loadProjects(userId: string, projectId?: string) {
  const projectResult = await database.query<ProjectRow>(
    `SELECT projects.id, projects.title, projects.status, projects.revision,
            projects.settings, projects.script_snapshot, projects.created_at, projects.updated_at,
            scripts.payload AS script_payload
     FROM media_projects AS projects
     LEFT JOIN script_documents AS scripts
       ON scripts.id = projects.script_id AND scripts.user_id = projects.user_id
     WHERE projects.user_id = $1
       AND ($2::uuid IS NULL OR projects.id = $2)
     ORDER BY projects.updated_at DESC`,
    [userId, projectId ?? null],
  );
  if (!projectResult.rows.length) return [];
  const ids = projectResult.rows.map((row) => row.id);
  const [assetResult, jobResult, transcriptResult] = await Promise.all([
    database.query<AssetRow>(
      `SELECT id, project_id, kind, status, file_name, mime_type, size_bytes, created_at, updated_at
       FROM media_assets
       WHERE user_id = $1 AND project_id = ANY($2::uuid[])
         AND (status <> 'pending-upload' OR upload_expires_at > NOW())
       ORDER BY created_at ASC`,
      [userId, ids],
    ),
    database.query<JobRow>(
      `SELECT id, project_id, type, status, progress, error_message, created_at, updated_at
       FROM media_jobs
       WHERE user_id = $1 AND project_id = ANY($2::uuid[])
       ORDER BY created_at DESC`,
      [userId, ids],
    ),
    database.query<TranscriptRow>(
      `SELECT project_id, revision, status, language, source, model,
              duration_seconds, segments, updated_at
       FROM video_transcripts
       WHERE user_id = $1 AND project_id = ANY($2::uuid[])`,
      [userId, ids],
    ),
  ]);
  const assetsByProject = new Map<string, VideoAssetDto[]>();
  for (const row of assetResult.rows) {
    const items = assetsByProject.get(row.project_id) ?? [];
    items.push(assetDto(row));
    assetsByProject.set(row.project_id, items);
  }
  const jobsByProject = new Map<string, VideoJobDto[]>();
  for (const row of jobResult.rows) {
    const items = jobsByProject.get(row.project_id) ?? [];
    items.push(jobDto(row));
    jobsByProject.set(row.project_id, items);
  }
  const transcriptByProject = new Map(transcriptResult.rows.map((row) => [row.project_id, transcriptDto(row)]));
  return projectResult.rows.map<VideoProjectDto>((row) => {
    const currentScript = row.script_payload ? scriptSummary(row.script_payload) : null;
    const snapshot = row.script_snapshot;
    const teleprompterContent = row.script_payload?.content ?? snapshot?.content;
    return {
      assets: assetsByProject.get(row.id) ?? [],
      createdAt: iso(row.created_at),
      id: row.id,
      jobs: jobsByProject.get(row.id) ?? [],
      revision: row.revision,
      script: currentScript ?? (snapshot?.id ? {
        aspectRatio: snapshot.aspectRatio,
        id: snapshot.id,
        revision: snapshot.revision,
        status: snapshot.status,
        targetDurationSeconds: snapshot.targetDurationSeconds,
        title: snapshot.title,
        updatedAt: snapshot.updatedAt,
      } : null),
      settings: row.settings,
      status: row.status,
      teleprompter: {
        body: teleprompterContent?.body ?? "",
        cta: teleprompterContent?.cta ?? "",
        hook: teleprompterContent?.hook ?? "",
        scriptRevision: row.script_payload?.revision ?? snapshot?.revision ?? 1,
      },
      title: row.title,
      transcript: transcriptByProject.get(row.id) ?? null,
      updatedAt: iso(row.updated_at),
    };
  });
}

export async function getVideoProject(userId: string, projectId: string) {
  const project = (await loadProjects(userId, projectId))[0];
  if (!project) throw new HttpError(404, "VIDEO_PROJECT_NOT_FOUND", "Không tìm thấy dự án video này.");
  return project;
}

export async function getVideoWorkspace(userId: string): Promise<VideoWorkspaceDto> {
  const [projects, scriptsResult, countsResult, aiSettings] = await Promise.all([
    loadProjects(userId),
    database.query<{ payload: ScriptDocumentDto }>(
      `SELECT payload
       FROM script_documents
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId],
    ),
    database.query<{ count: number; script_id: string }>(
      `SELECT script_id, COUNT(*)::int AS count
       FROM media_projects
       WHERE user_id = $1 AND script_id IS NOT NULL
       GROUP BY script_id`,
      [userId],
    ),
    getAiKeySettings(userId),
  ]);
  const counts = new Map(countsResult.rows.map((row) => [row.script_id, Number(row.count)]));
  const scriptOptions = scriptsResult.rows.map<VideoProjectScriptOptionDto>(({ payload }) => {
    const script = scriptSummary(payload);
    const incompatibilityReason = compatibility(script);
    return {
      ...script,
      compatible: !incompatibilityReason,
      incompatibilityReason,
      projectCount: counts.get(script.id) ?? 0,
    };
  });
  return {
    projects,
    scriptOptions,
    transcriptionConfigured: aiSettings.source !== "none",
    upload: {
      acceptedMimeTypes: [...acceptedVideoMimeTypes],
      configured: mediaStorageConfigured(),
      maxFiles: maxVideoFiles,
      maxTotalBytes: maxVideoBytes,
    },
  };
}

export async function createVideoProject(
  userId: string,
  input: CreateVideoProjectRequestDto,
) {
  const existing = await database.query<{ id: string }>(
    `SELECT id FROM media_projects WHERE user_id = $1 AND idempotency_key = $2`,
    [userId, input.idempotencyKey],
  );
  if (existing.rows[0]) return getVideoProject(userId, existing.rows[0].id);

  const scriptResult = await database.query<{ payload: ScriptDocumentDto }>(
    `SELECT payload FROM script_documents WHERE id = $1 AND user_id = $2`,
    [input.scriptId, userId],
  );
  const script = scriptResult.rows[0]?.payload;
  if (!script) throw new HttpError(404, "SCRIPT_NOT_FOUND", "Không tìm thấy kịch bản được chọn.");
  const summary = scriptSummary(script);
  const incompatibilityReason = compatibility(summary);
  if (incompatibilityReason) {
    throw new HttpError(409, "SCRIPT_NOT_VIDEO_COMPATIBLE", incompatibilityReason);
  }

  const id = randomUUID();
  const title = input.title || `Dựng video · ${script.title}`.slice(0, 250);
  const settings: VideoProjectSettingsDto = {
    aspectRatio: "9:16",
    captionPreset: input.captionPreset as VideoCaptionPreset,
    targetDurationSeconds: script.settings.targetDurationSeconds,
  };
  const snapshot: ScriptSnapshot = {
    ...summary,
    capturedAt: new Date().toISOString(),
    content: script.content,
  };
  const inserted = await database.query<{ id: string }>(
    `INSERT INTO media_projects (
       id, user_id, script_id, title, status, revision, settings, script_snapshot, idempotency_key
     ) VALUES ($1, $2, $3, $4, 'setup', 1, $5, $6, $7)
     ON CONFLICT (user_id, idempotency_key) DO NOTHING
     RETURNING id`,
    [id, userId, script.id, title, settings, snapshot, input.idempotencyKey],
  );
  const projectId = inserted.rows[0]?.id ?? (
    await database.query<{ id: string }>(
      `SELECT id FROM media_projects WHERE user_id = $1 AND idempotency_key = $2`,
      [userId, input.idempotencyKey],
    )
  ).rows[0]?.id;
  if (!projectId) throw new Error("Video project idempotency lookup failed");
  return getVideoProject(userId, projectId);
}

function extensionFor(mimeType: string) {
  if (mimeType === "video/quicktime") return "mov";
  if (mimeType === "video/webm") return "webm";
  return "mp4";
}

export async function createVideoUpload(
  userId: string,
  projectId: string,
  input: CreateVideoUploadRequestDto,
): Promise<VideoUploadTicketDto> {
  await ensureMediaBucket();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const project = await client.query<{ status: VideoProjectStatus }>(
      `SELECT status FROM media_projects WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [projectId, userId],
    );
    const status = project.rows[0]?.status;
    if (!status) throw new HttpError(404, "VIDEO_PROJECT_NOT_FOUND", "Không tìm thấy dự án video này.");
    if (!["setup", "uploaded", "failed"].includes(status)) {
      throw new HttpError(409, "VIDEO_PROJECT_UPLOAD_LOCKED", "Dự án đang xử lý nên chưa thể thêm video thô.");
    }

    const existing = await client.query<AssetRow & { object_key: string }>(
      `SELECT id, project_id, kind, status, file_name, mime_type, size_bytes,
              object_key, created_at, updated_at
       FROM media_assets
       WHERE project_id = $1 AND idempotency_key = $2`,
      [projectId, input.idempotencyKey],
    );
    let row = existing.rows[0];
    if (row?.status === "uploaded" || row?.status === "ready") {
      throw new HttpError(409, "VIDEO_ALREADY_UPLOADED", "Video này đã được tải lên dự án.");
    }

    if (!row) {
      const usage = await client.query<{ count: number; total_bytes: string }>(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(size_bytes), 0)::text AS total_bytes
         FROM media_assets
         WHERE project_id = $1
           AND status <> 'failed'
           AND (status <> 'pending-upload' OR upload_expires_at > NOW())`,
        [projectId],
      );
      const fileCount = Number(usage.rows[0]?.count ?? 0);
      const totalBytes = Number(usage.rows[0]?.total_bytes ?? 0);
      if (fileCount >= maxVideoFiles) {
        throw new HttpError(409, "VIDEO_FILE_LIMIT_REACHED", `Mỗi dự án nhận tối đa ${maxVideoFiles} clip thô.`);
      }
      if (totalBytes + input.sizeBytes > maxVideoBytes) {
        throw new HttpError(413, "VIDEO_TOTAL_SIZE_EXCEEDED", "Tổng video của dự án cần nhỏ hơn 2 GB.");
      }
      const assetId = randomUUID();
      const objectKey = `users/${userId}/projects/${projectId}/source/${assetId}.${extensionFor(input.mimeType)}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1_000);
      const inserted = await client.query<AssetRow & { object_key: string }>(
         `INSERT INTO media_assets (
           id, project_id, user_id, kind, status, file_name, mime_type, size_bytes,
           object_key, idempotency_key, upload_expires_at, metadata
         ) VALUES ($1, $2, $3, 'source', 'pending-upload', $4, $5, $6, $7, $8, $9,
                   jsonb_build_object('origin', $10::text))
         RETURNING id, project_id, kind, status, file_name, mime_type, size_bytes,
                   object_key, created_at, updated_at`,
        [assetId, projectId, userId, input.fileName, input.mimeType, input.sizeBytes, objectKey, input.idempotencyKey, expiresAt, input.origin],
      );
      row = inserted.rows[0]!;
    }
    const ticket = createVideoUploadUrl(row.object_key);
    await client.query(
      `UPDATE media_assets SET upload_expires_at = $1, updated_at = NOW() WHERE id = $2`,
      [ticket.expiresAt, row.id],
    );
    await client.query("COMMIT");
    return {
      asset: assetDto({ ...row, updated_at: new Date() }),
      expiresAt: ticket.expiresAt,
      headers: { "Content-Type": row.mime_type },
      method: "PUT",
      uploadUrl: ticket.uploadUrl,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function completeVideoUpload(
  userId: string,
  projectId: string,
  assetId: string,
): Promise<CompleteVideoUploadResponseDto> {
  const assetResult = await database.query<AssetRow & { object_key: string }>(
    `SELECT assets.id, assets.project_id, assets.kind, assets.status, assets.file_name,
            assets.mime_type, assets.size_bytes, assets.object_key, assets.created_at, assets.updated_at
     FROM media_assets AS assets
     JOIN media_projects AS projects ON projects.id = assets.project_id
     WHERE assets.id = $1 AND assets.project_id = $2 AND assets.user_id = $3 AND projects.user_id = $3`,
    [assetId, projectId, userId],
  );
  const asset = assetResult.rows[0];
  if (!asset) throw new HttpError(404, "VIDEO_ASSET_NOT_FOUND", "Không tìm thấy video đang tải lên.");
  if (asset.status !== "uploaded" && asset.status !== "ready") {
    const object = await inspectVideoObject(asset.object_key);
    if (object.sizeBytes !== null && object.sizeBytes !== Number(asset.size_bytes)) {
      throw new HttpError(409, "VIDEO_SIZE_MISMATCH", "Dung lượng video tải lên không khớp. Hãy chọn lại tệp và thử lại.");
    }
    const updated = await database.query<{ id: string }>(
      `UPDATE media_assets
       SET status = 'uploaded', upload_expires_at = NULL,
           metadata = metadata || jsonb_build_object('etag', $1::text, 'storageMimeType', $2::text),
           updated_at = NOW()
       WHERE id = $3 AND user_id = $4 AND status NOT IN ('uploaded', 'ready')
       RETURNING id`,
      [object.etag, object.mimeType, assetId, userId],
    );
    if (updated.rows[0]) {
      await database.query(
        `UPDATE media_projects
         SET status = CASE WHEN status IN ('setup', 'failed') THEN 'uploaded' ELSE status END,
             revision = revision + 1, updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [projectId, userId],
      );
    }
  }
  const project = await getVideoProject(userId, projectId);
  const completedAsset = project.assets.find((item) => item.id === assetId);
  if (!completedAsset) throw new Error("Completed video asset lookup failed");
  return { asset: completedAsset, project };
}

export async function getVideoPlayback(
  userId: string,
  projectId: string,
  assetId: string,
): Promise<VideoPlaybackTicketDto> {
  const result = await database.query<{ id: string; object_key: string }>(
    `SELECT assets.id, assets.object_key
     FROM media_assets AS assets
     JOIN media_projects AS projects ON projects.id = assets.project_id
     WHERE assets.id = $1 AND assets.project_id = $2
       AND assets.user_id = $3 AND projects.user_id = $3
       AND assets.kind = 'source' AND assets.status IN ('uploaded', 'ready')`,
    [assetId, projectId, userId],
  );
  const asset = result.rows[0];
  if (!asset) throw new HttpError(404, "VIDEO_ASSET_NOT_FOUND", "Không tìm thấy video thô để phát lại.");
  return { assetId: asset.id, ...createVideoPlaybackUrl(asset.object_key) };
}

export async function startVideoTranscription(
  userId: string,
  projectId: string,
  idempotencyKey: string,
) {
  const aiSettings = await getAiKeySettings(userId);
  if (aiSettings.source === "none") {
    throw new HttpError(503, "AI_NOT_CONFIGURED", "Hãy kết nối Google AI trong Cài đặt trước khi tạo lời thoại từ video.");
  }
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const projectResult = await client.query<{ status: VideoProjectStatus }>(
      `SELECT status FROM media_projects WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [projectId, userId],
    );
    const status = projectResult.rows[0]?.status;
    if (!status) throw new HttpError(404, "VIDEO_PROJECT_NOT_FOUND", "Không tìm thấy dự án video này.");

    const existingJob = await client.query<{ id: string }>(
      `SELECT id FROM media_jobs
       WHERE project_id = $1 AND type = 'probe' AND idempotency_key = $2`,
      [projectId, idempotencyKey],
    );
    if (existingJob.rows[0]) {
      await client.query("COMMIT");
      return getVideoProject(userId, projectId);
    }
    const existingTranscript = await client.query<{ project_id: string }>(
      `SELECT project_id FROM video_transcripts WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId],
    );
    if (existingTranscript.rows[0]) {
      throw new HttpError(409, "VIDEO_TRANSCRIPT_EXISTS", "Dự án đã có lời thoại. Bạn có thể chỉnh trực tiếp bản hiện tại.");
    }
    const activeJob = await client.query<{ id: string }>(
      `SELECT id FROM media_jobs
       WHERE project_id = $1 AND type IN ('probe', 'transcribe') AND status IN ('queued', 'running')
       LIMIT 1`,
      [projectId],
    );
    if (activeJob.rows[0]) {
      throw new HttpError(409, "VIDEO_PROCESSING_ALREADY_STARTED", "Emsen đang kiểm tra video và tạo lời thoại cho dự án này.");
    }
    const assets = await client.query<{ id: string }>(
      `SELECT id FROM media_assets
       WHERE project_id = $1 AND user_id = $2 AND kind = 'source' AND status IN ('uploaded', 'ready')
       ORDER BY created_at ASC`,
      [projectId, userId],
    );
    if (!assets.rows.length) {
      throw new HttpError(409, "VIDEO_SOURCE_REQUIRED", "Hãy quay hoặc tải ít nhất một video thô trước khi tạo lời thoại.");
    }
    await client.query(
      `INSERT INTO media_jobs (
         id, project_id, user_id, type, status, progress, idempotency_key, input
       ) VALUES ($1, $2, $3, 'probe', 'queued', 0, $4, $5)`,
      [randomUUID(), projectId, userId, idempotencyKey, { assetIds: assets.rows.map((asset) => asset.id) }],
    );
    await client.query(
      `UPDATE media_projects
       SET status = 'analyzing', revision = revision + 1, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [projectId, userId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getVideoProject(userId, projectId);
}

export async function updateVideoTranscript(
  userId: string,
  projectId: string,
  input: UpdateVideoTranscriptRequestDto,
) {
  const current = await database.query<{ duration_seconds: number; revision: number }>(
    `SELECT transcripts.duration_seconds, transcripts.revision
     FROM video_transcripts AS transcripts
     JOIN media_projects AS projects ON projects.id = transcripts.project_id
     WHERE transcripts.project_id = $1 AND transcripts.user_id = $2 AND projects.user_id = $2`,
    [projectId, userId],
  );
  const transcript = current.rows[0];
  if (!transcript) throw new HttpError(404, "VIDEO_TRANSCRIPT_NOT_FOUND", "Dự án chưa có lời thoại để chỉnh.");
  if (input.revision !== transcript.revision) {
    throw new HttpError(409, "VIDEO_TRANSCRIPT_CONFLICT", "Lời thoại đã thay đổi ở nơi khác. Hãy tải lại trước khi lưu.");
  }
  if (input.segments.some((segment) => segment.endSeconds > Number(transcript.duration_seconds) + 1)) {
    throw new HttpError(400, "TRANSCRIPT_OUTSIDE_VIDEO", "Có đoạn lời thoại nằm ngoài thời lượng video.");
  }
  const updated = await database.query<{ revision: number }>(
    `UPDATE video_transcripts
     SET segments = $1, status = $2, revision = revision + 1, updated_at = NOW()
     WHERE project_id = $3 AND user_id = $4 AND revision = $5
     RETURNING revision`,
    [JSON.stringify(input.segments), input.status, projectId, userId, input.revision],
  );
  if (!updated.rows[0]) {
    throw new HttpError(409, "VIDEO_TRANSCRIPT_CONFLICT", "Lời thoại đã thay đổi ở nơi khác. Hãy tải lại trước khi lưu.");
  }
  await database.query(
    `UPDATE media_projects
     SET status = 'transcript-ready', revision = revision + 1, updated_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [projectId, userId],
  );
  return getVideoProject(userId, projectId);
}
