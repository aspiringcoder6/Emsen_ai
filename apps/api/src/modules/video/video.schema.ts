import type {
  CreateVideoProjectRequestDto,
  CreateVideoUploadRequestDto,
  StartVideoTranscriptionRequestDto,
  UpdateVideoTranscriptRequestDto,
} from "@creator-flow/contracts";
import { HttpError } from "../../shared/http.js";

export const acceptedVideoMimeTypes = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;
export const maxVideoFiles = 10;
export const maxVideoBytes = 2_000_000_000;

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "INVALID_VIDEO_REQUEST", "Thông tin dự án video chưa hợp lệ.");
  }
  return value as Record<string, unknown>;
}

export function parseUuid(value: unknown, code: string, message: string) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, code, message);
  }
  return value;
}

function idempotencyKey(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 128 || /[\u0000-\u001f]/.test(value)) {
    throw new HttpError(400, "INVALID_IDEMPOTENCY_KEY", "Mã chống tạo trùng không hợp lệ.");
  }
  return value.trim();
}

export function parseCreateVideoProject(value: unknown): CreateVideoProjectRequestDto {
  const body = object(value);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length > 250) {
    throw new HttpError(400, "VIDEO_TITLE_TOO_LONG", "Tên dự án video tối đa 250 ký tự.");
  }
  if (body.captionPreset !== "emsen-clean" && body.captionPreset !== "none") {
    throw new HttpError(400, "INVALID_CAPTION_PRESET", "Mẫu phụ đề chưa hợp lệ.");
  }
  return {
    captionPreset: body.captionPreset,
    idempotencyKey: idempotencyKey(body.idempotencyKey),
    scriptId: parseUuid(body.scriptId, "INVALID_SCRIPT_ID", "Mã kịch bản không hợp lệ."),
    title,
  };
}

export function parseCreateVideoUpload(value: unknown): CreateVideoUploadRequestDto {
  const body = object(value);
  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.split(";")[0]!.trim().toLocaleLowerCase() : "";
  if (!fileName || fileName.length > 255 || /[\u0000-\u001f]/.test(fileName)) {
    throw new HttpError(400, "INVALID_VIDEO_FILE_NAME", "Tên tệp video chưa hợp lệ.");
  }
  if (!acceptedVideoMimeTypes.includes(mimeType as (typeof acceptedVideoMimeTypes)[number])) {
    throw new HttpError(415, "VIDEO_TYPE_NOT_SUPPORTED", "MVP hiện hỗ trợ video MP4, MOV hoặc WebM.");
  }
  if (!Number.isSafeInteger(body.sizeBytes) || (body.sizeBytes as number) <= 0 || (body.sizeBytes as number) > maxVideoBytes) {
    throw new HttpError(413, "VIDEO_SIZE_NOT_SUPPORTED", "Tổng video của một dự án cần nhỏ hơn 2 GB.");
  }
  if (body.origin !== "recording" && body.origin !== "upload") {
    throw new HttpError(400, "INVALID_VIDEO_ORIGIN", "Nguồn video chưa hợp lệ.");
  }
  return {
    fileName,
    idempotencyKey: idempotencyKey(body.idempotencyKey),
    mimeType,
    origin: body.origin,
    sizeBytes: body.sizeBytes as number,
  };
}

export function parseStartVideoTranscription(value: unknown): StartVideoTranscriptionRequestDto {
  const body = object(value);
  return { idempotencyKey: idempotencyKey(body.idempotencyKey) };
}

export function parseUpdateVideoTranscript(value: unknown): UpdateVideoTranscriptRequestDto {
  const body = object(value);
  if (!Number.isInteger(body.revision) || (body.revision as number) < 1) {
    throw new HttpError(400, "INVALID_TRANSCRIPT_REVISION", "Phiên bản lời thoại không hợp lệ.");
  }
  if (body.status !== "draft" && body.status !== "approved") {
    throw new HttpError(400, "INVALID_TRANSCRIPT_STATUS", "Trạng thái lời thoại không hợp lệ.");
  }
  if (!Array.isArray(body.segments) || body.segments.length > 1_000) {
    throw new HttpError(400, "INVALID_TRANSCRIPT_SEGMENTS", "Danh sách đoạn lời thoại không hợp lệ.");
  }
  const segments = body.segments.map((value, index) => {
    const segment = object(value);
    const startSeconds = Number(segment.startSeconds);
    const endSeconds = Number(segment.endSeconds);
    const text = typeof segment.text === "string" ? segment.text.trim() : "";
    if (
      typeof segment.id !== "string" || !/^[0-9a-f-]{36}$/i.test(segment.id) ||
      !Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) ||
      startSeconds < 0 || endSeconds <= startSeconds || endSeconds > 900 ||
      !text || text.length > 2_000
    ) {
      throw new HttpError(400, "INVALID_TRANSCRIPT_SEGMENT", `Đoạn lời thoại ${index + 1} chưa hợp lệ.`);
    }
    return { endSeconds, id: segment.id, startSeconds, text };
  });
  segments.forEach((segment, index) => {
    const previous = segments[index - 1];
    if (previous && segment.startSeconds < previous.endSeconds) {
      throw new HttpError(400, "TRANSCRIPT_SEGMENTS_OVERLAP", "Các đoạn lời thoại không được chồng thời gian.");
    }
  });
  return { revision: body.revision as number, segments, status: body.status };
}
