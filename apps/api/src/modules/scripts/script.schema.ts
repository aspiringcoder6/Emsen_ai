import type {
  CreateScriptRequestDto,
  ScriptAdvancedSettingsDto,
  ScriptAssistRequestDto,
  ScriptAssistSection,
  ScriptBrainstormRequestDto,
  ScriptContentDto,
  ScriptCreativeConceptDto,
  ScriptCreativeStrategyDto,
  ScriptHookAngleType,
  ScriptSettingsDto,
  ScriptStatus,
  ScriptStoryboardFrameDto,
  UpdateScriptRequestDto,
} from "@creator-flow/contracts";
import { HttpError } from "../../shared/http.js";

const statuses: ScriptStatus[] = ["draft", "in-progress", "ready", "completed", "archived"];
const assistSections: ScriptAssistSection[] = ["hook", "body", "cta", "storyboard"];
const referenceMimeTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);
const maxReferenceBytes = 4 * 1024 * 1024;
export const scriptHookAngleTypes: ScriptHookAngleType[] = [
  "pain",
  "curiosity",
  "contrarian",
  "story",
  "confession",
  "authority",
  "data",
  "experience",
];

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

function optionalText(value: unknown, label: string, max: number) {
  return value === undefined || value === null ? "" : text(value, label, max);
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

function parseReferenceAssets(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 3) {
    return invalid("Mỗi lượt chỉ nhận tối đa 3 tệp tham chiếu.");
  }
  let totalBytes = 0;
  return value.map((entry) => {
    const row = scriptObject(entry);
    const name = text(row.name, "Tên tệp tham chiếu", 180, true);
    const mimeType = text(row.mimeType, "Định dạng tệp tham chiếu", 80, true).toLowerCase();
    const dataBase64 = text(row.dataBase64, "Dữ liệu tệp tham chiếu", 5_600_000, true);
    if (!referenceMimeTypes.has(mimeType)) {
      return invalid(`Tệp ${name} chưa được hỗ trợ. Hãy dùng PNG, JPEG, WEBP, GIF, MP4, MOV hoặc WEBM.`);
    }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dataBase64)) {
      return invalid(`Dữ liệu tệp ${name} không hợp lệ.`);
    }
    const bytes = Buffer.from(dataBase64, "base64").length;
    totalBytes += bytes;
    if (!bytes || totalBytes > maxReferenceBytes) {
      return invalid("Tổng tệp tham chiếu cần nhỏ hơn 4 MB.");
    }
    return { dataBase64, mimeType, name };
  });
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
      visualPurpose: optionalText(row.visualPurpose, "Mục đích hình ảnh", 1000),
      broll: optionalText(row.broll, "B-roll", 2000),
      dialogue: text(row.dialogue, "Lời thoại", 4000),
      emotionalBeat: optionalText(row.emotionalBeat, "Cảm xúc cảnh", 1000),
      transition: optionalText(row.transition, "Chuyển cảnh", 1000),
      retentionRole: optionalText(row.retentionRole, "Vai trò giữ chân", 1000),
      direction: text(row.direction, "Chỉ dẫn", 2000),
      durationSeconds,
    };
  });
}

export function parseCreativeConcept(value: unknown): ScriptCreativeConceptDto {
  const body = scriptObject(value);
  if (!scriptHookAngleTypes.includes(body.angleType as ScriptHookAngleType)) {
    return invalid("Góc triển khai kịch bản không hợp lệ.");
  }
  const fitScore = Number(body.fitScore);
  if (!Number.isInteger(fitScore) || fitScore < 0 || fitScore > 100) {
    return invalid("Mức độ phù hợp của góc triển khai không hợp lệ.");
  }
  return {
    id: text(body.id, "Mã góc triển khai", 100, true),
    angleType: body.angleType as ScriptHookAngleType,
    label: text(body.label, "Tên góc triển khai", 80, true),
    angle: text(body.angle, "Góc triển khai", 1000, true),
    hook: text(body.hook, "Hook gợi ý", 1000, true),
    tension: text(body.tension, "Mâu thuẫn sáng tạo", 1000, true),
    development: text(body.development, "Hướng phát triển", 2000, true),
    creatorPrompt: text(body.creatorPrompt, "Câu hỏi cho creator", 1000, true),
    whyItFits: text(body.whyItFits, "Lý do phù hợp", 1000, true),
    fitScore,
  };
}

export function parseCreativeStrategy(value: unknown): ScriptCreativeStrategyDto {
  const body = scriptObject(value);
  return {
    selectedConcept: body.selectedConcept === null || body.selectedConcept === undefined
      ? null
      : parseCreativeConcept(body.selectedConcept),
    creatorExperience: optionalText(body.creatorExperience, "Trải nghiệm thật", 4000),
  };
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
  const hasPlanReference = body.contentPlanId !== undefined || body.contentPlanVersionId !== undefined;
  const hasPlanItem = body.contentPlanItemId !== undefined || body.dayIndex !== undefined;
  const hasPlan = hasPlanReference || hasPlanItem;
  if (body.dayIndex !== undefined && (!Number.isInteger(body.dayIndex) || (body.dayIndex as number) < 0 || (body.dayIndex as number) > 6)) {
    return invalid("Ngày trong kế hoạch không hợp lệ.");
  }
  if (hasPlan && !hasPlanReference) {
    return invalid("Kế hoạch nội dung không hợp lệ.");
  }
  if (hasPlan && !hasPlanItem) return invalid("Hãy chọn một nội dung trong kế hoạch.");
  const targetDurationSeconds = body.targetDurationSeconds === undefined
    ? 60
    : Number(body.targetDurationSeconds);
  if (!Number.isInteger(targetDurationSeconds) || targetDurationSeconds < 5 || targetDurationSeconds > 3600) {
    return invalid("Thời lượng mục tiêu cần từ 5 đến 3600 giây.");
  }
  return {
    mode: body.mode,
    title: text(body.title, "Tên kịch bản", 250, !hasPlan),
    brief: text(body.brief, "Yêu cầu", 3000),
    scheduledFor: date(body.scheduledFor, "Ngày dự kiến"),
    platform: text(body.platform, "Nền tảng", 80),
    format: text(body.format, "Định dạng", 120),
    targetDurationSeconds,
    creatorExperience: optionalText(body.creatorExperience, "Trải nghiệm thật", 4000),
    ctaStyle: optionalText(body.ctaStyle, "Kiểu CTA", 500),
    ...(body.selectedConcept !== undefined && body.selectedConcept !== null
      ? { selectedConcept: parseCreativeConcept(body.selectedConcept) }
      : {}),
    ...(hasPlan ? {
      ...(body.contentPlanId !== undefined ? { contentPlanId: uuid(body.contentPlanId, "Kế hoạch nội dung") } : {}),
      ...(body.contentPlanVersionId !== undefined ? { contentPlanVersionId: uuid(body.contentPlanVersionId, "Phiên bản kế hoạch") } : {}),
      ...(body.contentPlanItemId !== undefined
        ? { contentPlanItemId: text(body.contentPlanItemId, "Mã nội dung", 100, true) }
        : {}),
      ...(body.dayIndex !== undefined ? { dayIndex: body.dayIndex as number } : {}),
    } : {}),
  };
}

export function parseScriptBrainstorm(value: unknown): ScriptBrainstormRequestDto {
  const body = scriptObject(value);
  const optionCount = body.optionCount === undefined ? 6 : Number(body.optionCount);
  if (!Number.isInteger(optionCount) || optionCount < 5 || optionCount > 10) {
    return invalid("Số góc gợi ý cần từ 5 đến 10.");
  }
  const parsed = parseCreateScript({ ...body, mode: "ai", selectedConcept: undefined });
  return {
    title: parsed.title,
    brief: parsed.brief,
    scheduledFor: parsed.scheduledFor,
    platform: parsed.platform,
    format: parsed.format,
    targetDurationSeconds: parsed.targetDurationSeconds ?? 60,
    creatorExperience: parsed.creatorExperience ?? "",
    ctaStyle: parsed.ctaStyle ?? "",
    ...(parsed.contentPlanId ? { contentPlanId: parsed.contentPlanId } : {}),
    ...(parsed.contentPlanVersionId ? { contentPlanVersionId: parsed.contentPlanVersionId } : {}),
    ...(parsed.contentPlanItemId ? { contentPlanItemId: parsed.contentPlanItemId } : {}),
    ...(parsed.dayIndex !== undefined ? { dayIndex: parsed.dayIndex } : {}),
    optionCount,
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
    creativeStrategy: parseCreativeStrategy(body.creativeStrategy),
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
    referenceAssets: parseReferenceAssets(body.referenceAssets),
  };
}

const generatedStoryboardFramesSchema = {
  type: "array",
  minItems: 2,
  maxItems: 10,
  items: {
    type: "object",
    properties: {
      title: { type: "string" },
      visual: { type: "string" },
      visualPurpose: { type: "string" },
      broll: { type: "string" },
      dialogue: { type: "string" },
      emotionalBeat: { type: "string" },
      transition: { type: "string" },
      retentionRole: { type: "string" },
      direction: { type: "string" },
      durationSeconds: { type: "integer", minimum: 0, maximum: 600 },
    },
    required: ["title", "visual", "visualPurpose", "broll", "dialogue", "emotionalBeat", "transition", "retentionRole", "direction", "durationSeconds"],
  },
};

export const generatedScriptResponseSchema = {
  type: "object",
  properties: {
    hook: {
      description: "Lời thoại Hook 3–5 giây, bắt đầu bằng timestamp và nhãn [Nói trực tiếp] hoặc [Voice-over].",
      type: "string",
    },
    body: {
      description: "Bản lời thoại nội dung chính hoàn chỉnh ngay từ lần đề xuất đầu tiên, chia thành nhiều dòng timestamp nhỏ; mỗi dòng có nhãn cách thể hiện.",
      type: "string",
    },
    cta: {
      description: "Lời thoại CTA 3–5 giây, bắt đầu bằng timestamp, có nhãn cách thể hiện và kết thúc đúng tổng thời lượng video.",
      type: "string",
    },
  },
  required: ["hook", "body", "cta"],
};

export const scriptBrainstormResponseSchema = {
  type: "object",
  properties: {
    concepts: {
      type: "array",
      minItems: 5,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          angleType: { type: "string", enum: scriptHookAngleTypes },
          label: { type: "string" },
          angle: { type: "string" },
          hook: { type: "string" },
          tension: { type: "string" },
          development: { type: "string" },
          creatorPrompt: { type: "string" },
          whyItFits: { type: "string" },
          fitScore: { type: "integer", minimum: 0, maximum: 100 },
        },
        required: ["angleType", "label", "angle", "hook", "tension", "development", "creatorPrompt", "whyItFits", "fitScore"],
      },
    },
  },
  required: ["concepts"],
};

export const textSuggestionResponseSchema = {
  type: "object",
  properties: { suggestion: { type: "string" } },
  required: ["suggestion"],
};

export const ctaAlternativesResponseSchema = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: { type: "string" },
    },
  },
  required: ["suggestions"],
};

export const storyboardSuggestionResponseSchema = {
  type: "object",
  properties: { frames: generatedStoryboardFramesSchema },
  required: ["frames"],
};
