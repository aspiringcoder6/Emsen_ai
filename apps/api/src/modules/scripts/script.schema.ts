import type {
  CreateScriptRequestDto,
  ScriptAdvancedSettingsDto,
  ScriptAssistRequestDto,
  ScriptAssistSection,
  ScriptContentDto,
  ScriptSettingsDto,
  ScriptStatus,
  ScriptStoryboardFrameDto,
  UpdateScriptRequestDto,
} from "@creator-flow/contracts";
import { HttpError } from "../../shared/http.js";

const statuses: ScriptStatus[] = ["draft", "in-progress", "ready", "completed", "archived"];
const assistSections: ScriptAssistSection[] = ["hook", "body", "cta", "storyboard"];

const invalid = (message: string): never => {
  throw new HttpError(400, "INVALID_SCRIPT", message);
};

export function scriptObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalid("Dữ liệu kịch bản không hợp lệ.");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, max: number, required = false) {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) {
    return invalid(`${label} cần hợp lệ và không quá ${max} ký tự.`);
  }
  return value.trim();
}

function date(value: unknown, label: string): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) {
    return invalid(`${label} không hợp lệ.`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return invalid(`${label} không tồn tại.`);
  }
  return value;
}

function uuid(value: unknown, label: string) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return invalid(`${label} không hợp lệ.`);
  }
  return value;
}

export function parseStoryboard(value: unknown): ScriptStoryboardFrameDto[] {
  if (!Array.isArray(value) || value.length > 16) {
    return invalid("Storyboard có tối đa 16 keyframe.");
  }
  return value.map((entry, index) => {
    const row = scriptObject(entry);
    const durationSeconds = Number(row.durationSeconds);
    if (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 600) {
      return invalid(`Thời lượng keyframe ${index + 1} không hợp lệ.`);
    }
    return {
      id: text(row.id, "Mã keyframe", 100, true),
      title: text(row.title, "Tên keyframe", 120, true),
      visual: text(row.visual, "Mô tả hình ảnh", 2000),
      dialogue: text(row.dialogue, "Lời thoại", 4000),
      direction: text(row.direction, "Chỉ dẫn", 2000),
      durationSeconds,
    };
  });
}

export function parseScriptContent(value: unknown): ScriptContentDto {
  const body = scriptObject(value);
  return {
    hook: text(body.hook, "Hook", 2000),
    body: text(body.body, "Nội dung", 12000),
    cta: text(body.cta, "CTA", 2000),
    storyboard: parseStoryboard(body.storyboard),
  };
}

function parseSettings(value: unknown): ScriptSettingsDto {
  const body = scriptObject(value);
  const targetDurationSeconds = Number(body.targetDurationSeconds);
  if (!Number.isInteger(targetDurationSeconds) || targetDurationSeconds < 5 || targetDurationSeconds > 3600) {
    return invalid("Thời lượng mục tiêu cần từ 5 đến 3600 giây.");
  }
  if (!["9:16", "1:1", "16:9", "4:5"].includes(body.aspectRatio as string)) {
    return invalid("Tỷ lệ khung hình không hợp lệ.");
  }
  return {
    platform: text(body.platform, "Nền tảng", 80),
    format: text(body.format, "Định dạng", 120),
    scheduledFor: date(body.scheduledFor, "Ngày dự kiến"),
    targetDurationSeconds,
    aspectRatio: body.aspectRatio as ScriptSettingsDto["aspectRatio"],
    objective: text(body.objective, "Mục tiêu", 500),
    audience: text(body.audience, "Khán giả", 1000),
    tone: text(body.tone, "Giọng điệu", 1000),
  };
}

function parseAdvancedSettings(value: unknown): ScriptAdvancedSettingsDto {
  const body = scriptObject(value);
  if (!["slow", "balanced", "fast"].includes(body.pacing as string)) {
    return invalid("Nhịp độ kịch bản không hợp lệ.");
  }
  return {
    hookStyle: text(body.hookStyle, "Kiểu hook", 500),
    pacing: body.pacing as ScriptAdvancedSettingsDto["pacing"],
    ctaStyle: text(body.ctaStyle, "Kiểu CTA", 500),
    language: text(body.language, "Ngôn ngữ", 80, true),
    productionNotes: text(body.productionNotes, "Ghi chú sản xuất", 4000),
  };
}

export function parseCreateScript(value: unknown): CreateScriptRequestDto {
  const body = scriptObject(value);
  if (body.mode !== "manual" && body.mode !== "ai") return invalid("Cách tạo kịch bản không hợp lệ.");
  const hasPlan = body.contentPlanVersionId !== undefined || body.dayIndex !== undefined;
  if (hasPlan && (!Number.isInteger(body.dayIndex) || (body.dayIndex as number) < 0 || (body.dayIndex as number) > 6)) {
    return invalid("Ngày trong kế hoạch không hợp lệ.");
  }
  return {
    mode: body.mode,
    title: text(body.title, "Tên kịch bản", 250, !hasPlan),
    brief: text(body.brief, "Yêu cầu", 3000),
    scheduledFor: date(body.scheduledFor, "Ngày dự kiến"),
    platform: text(body.platform, "Nền tảng", 80),
    format: text(body.format, "Định dạng", 120),
    ...(hasPlan
      ? {
          contentPlanVersionId: uuid(body.contentPlanVersionId, "Phiên bản kế hoạch"),
          dayIndex: body.dayIndex as number,
        }
      : {}),
  };
}

export function parseUpdateScript(value: unknown): UpdateScriptRequestDto {
  const body = scriptObject(value);
  if (!Number.isInteger(body.revision) || (body.revision as number) < 1) {
    return invalid("Phiên bản chỉnh sửa không hợp lệ.");
  }
  if (!statuses.includes(body.status as ScriptStatus)) return invalid("Trạng thái kịch bản không hợp lệ.");
  return {
    revision: body.revision as number,
    title: text(body.title, "Tên kịch bản", 250, true),
    status: body.status as ScriptStatus,
    content: parseScriptContent(body.content),
    settings: parseSettings(body.settings),
    advancedSettings: parseAdvancedSettings(body.advancedSettings),
  };
}

export function parseScriptAssist(value: unknown): ScriptAssistRequestDto {
  const body = scriptObject(value);
  if (!assistSections.includes(body.section as ScriptAssistSection)) {
    return invalid("Phần cần AI hỗ trợ không hợp lệ.");
  }
  return {
    section: body.section as ScriptAssistSection,
    instruction: text(body.instruction, "Yêu cầu cho AI", 3000, true),
    draft: parseUpdateScript(body.draft),
  };
}

export const generatedScriptResponseSchema = {
  type: "object",
  properties: {
    hook: { type: "string" },
    body: { type: "string" },
    cta: { type: "string" },
    storyboard: {
      type: "array",
      minItems: 2,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          visual: { type: "string" },
          dialogue: { type: "string" },
          direction: { type: "string" },
          durationSeconds: { type: "integer", minimum: 0, maximum: 600 },
        },
        required: ["title", "visual", "dialogue", "direction", "durationSeconds"],
      },
    },
  },
  required: ["hook", "body", "cta", "storyboard"],
};

export const textSuggestionResponseSchema = {
  type: "object",
  properties: { suggestion: { type: "string" } },
  required: ["suggestion"],
};

export const storyboardSuggestionResponseSchema = {
  type: "object",
  properties: { frames: generatedScriptResponseSchema.properties.storyboard },
  required: ["frames"],
};
