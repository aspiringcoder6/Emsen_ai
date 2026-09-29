import type {
  CreateVideoProjectRequestDto,
  CreateVideoUploadRequestDto,
  StartVideoCutPreviewRequestDto,
  StartVideoCutSuggestionRequestDto,
  StartVideoRenderRequestDto,
  StartVideoTranscriptionRequestDto,
  UpdateVideoCutDraftRequestDto,
  UpdateVideoRenderSettingsRequestDto,
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

export function parseStartVideoCutSuggestion(value: unknown): StartVideoCutSuggestionRequestDto {
  const body = object(value);
  return { idempotencyKey: idempotencyKey(body.idempotencyKey) };
}

export function parseStartVideoCutPreview(value: unknown): StartVideoCutPreviewRequestDto {
  const body = object(value);
  if (!Number.isInteger(body.cutRevision) || (body.cutRevision as number) < 1) {
    throw new HttpError(400, "INVALID_CUT_REVISION", "Phiên bản Smart Cut không hợp lệ.");
  }
  return {
    cutRevision: body.cutRevision as number,
    idempotencyKey: idempotencyKey(body.idempotencyKey),
  };
}

export function parseStartVideoRender(value: unknown): StartVideoRenderRequestDto {
  const body = object(value);
  if (body.confirmed !== true) {
    throw new HttpError(400, "VIDEO_RENDER_CONFIRMATION_REQUIRED", "Bạn cần xác nhận trước khi Emsen xuất video hoàn chỉnh.");
  }
  if (!Number.isInteger(body.cutRevision) || (body.cutRevision as number) < 1) {
    throw new HttpError(400, "INVALID_CUT_REVISION", "Phiên bản Smart Cut không hợp lệ.");
  }
  if (!Number.isInteger(body.renderSettingsRevision) || (body.renderSettingsRevision as number) < 1) {
    throw new HttpError(400, "INVALID_RENDER_SETTINGS_REVISION", "Phiên bản cài đặt xuất video không hợp lệ.");
  }
  return {
    confirmed: true,
    cutRevision: body.cutRevision as number,
    idempotencyKey: idempotencyKey(body.idempotencyKey),
    renderSettingsRevision: body.renderSettingsRevision as number,
  };
}

function color(value: unknown, name: string) {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new HttpError(400, "INVALID_CAPTION_COLOR", `${name} chưa đúng định dạng màu.`);
  }
  return value.toUpperCase();
}

export function parseUpdateVideoRenderSettings(value: unknown): UpdateVideoRenderSettingsRequestDto {
  const body = object(value);
  if (!Number.isInteger(body.revision) || (body.revision as number) < 1) {
    throw new HttpError(400, "INVALID_VIDEO_REVISION", "Phiên bản dự án video không hợp lệ.");
  }
  if (body.captionPreset !== "emsen-clean" && body.captionPreset !== "none") {
    throw new HttpError(400, "INVALID_CAPTION_PRESET", "Mẫu phụ đề chưa hợp lệ.");
  }
  if (body.captionPosition !== "center" && body.captionPosition !== "lower-third") {
    throw new HttpError(400, "INVALID_CAPTION_POSITION", "Vị trí phụ đề chưa hợp lệ.");
  }
  if (typeof body.showBrandMark !== "boolean") {
    throw new HttpError(400, "INVALID_BRAND_MARK", "Tùy chọn logo chưa hợp lệ.");
  }
  return {
    captionAccentColor: color(body.captionAccentColor, "Màu nhấn"),
    captionPosition: body.captionPosition,
    captionPreset: body.captionPreset,
    captionTextColor: color(body.captionTextColor, "Màu chữ"),
    revision: body.revision as number,
    showBrandMark: body.showBrandMark,
  };
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

export function parseUpdateVideoCutDraft(value: unknown): UpdateVideoCutDraftRequestDto {
  const body = object(value);
  if (!Number.isInteger(body.revision) || (body.revision as number) < 1) {
    throw new HttpError(400, "INVALID_CUT_REVISION", "Phiên bản Smart Cut không hợp lệ.");
  }
  if (body.status !== "draft" && body.status !== "approved") {
    throw new HttpError(400, "INVALID_CUT_STATUS", "Trạng thái Smart Cut không hợp lệ.");
  }
  if (!Array.isArray(body.decisions) || !body.decisions.length || body.decisions.length > 2_000) {
    throw new HttpError(400, "INVALID_CUT_DECISIONS", "Danh sách đoạn giữ/cắt không hợp lệ.");
  }
  const seen = new Set<string>();
  const decisions = body.decisions.map((value, index) => {
    const decision = object(value);
    if (
      typeof decision.id !== "string" || !/^[0-9a-f-]{36}$/i.test(decision.id) ||
      (decision.action !== "keep" && decision.action !== "cut") || seen.has(decision.id)
    ) {
      throw new HttpError(400, "INVALID_CUT_DECISION", `Lựa chọn Smart Cut ${index + 1} chưa hợp lệ.`);
    }
    seen.add(decision.id);
    return { action: decision.action === "keep" ? "keep" as const : "cut" as const, id: decision.id };
  });
  return { decisions, revision: body.revision as number, status: body.status };
}
