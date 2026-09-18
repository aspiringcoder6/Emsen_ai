import type {
  ScriptAssistSection,
  ScriptDocumentDto,
  ScriptScheduleOptionDto,
  UpdateScriptRequestDto,
} from "@creator-flow/contracts";
import { HttpError } from "../../shared/http.js";
import {
  assistScript,
  createScript,
  getScriptWorkspace,
  updateScript,
} from "../scripts/script.service.js";
import type { AgentSkillDefinition } from "./agentSkill.registry.js";

export type ScriptSkillInput = {
  contentTitle: string;
  instruction: string;
  planName: string;
  scriptDurationSeconds: number;
  scriptFormat: string;
  scriptId: string;
  scriptMode: "ai" | "manual";
  scriptPlatform: string;
  scriptSection: ScriptAssistSection | "none";
  scriptTitle: string;
};

export type ScriptSkillOutput = {
  changed: boolean;
  reply: string;
  script: ScriptDocumentDto | null;
};

const inputSchema = {
  properties: {
    contentTitle: { maxLength: 200, type: "string" },
    instruction: { maxLength: 4_000, type: "string" },
    planName: { maxLength: 120, type: "string" },
    scriptDurationSeconds: { maximum: 3_600, minimum: 0, type: "integer" },
    scriptFormat: { maxLength: 80, type: "string" },
    scriptId: { type: "string" },
    scriptMode: { enum: ["ai", "manual"], type: "string" },
    scriptPlatform: { maxLength: 80, type: "string" },
    scriptSection: { enum: ["none", "hook", "body", "cta", "storyboard"], type: "string" },
    scriptTitle: { maxLength: 200, type: "string" },
  },
  required: [
    "contentTitle", "instruction", "planName", "scriptDurationSeconds",
    "scriptFormat", "scriptId", "scriptMode", "scriptPlatform", "scriptSection", "scriptTitle",
  ],
  type: "object",
} satisfies Record<string, unknown>;

const outputSchema = {
  properties: {
    changed: { type: "boolean" },
    reply: { type: "string" },
    script: { type: ["object", "null"] },
  },
  required: ["changed", "reply", "script"],
  type: "object",
} satisfies Record<string, unknown>;

function validate(input: ScriptSkillInput) {
  if (!input || typeof input !== "object" ||
    typeof input.contentTitle !== "string" || input.contentTitle.length > 200 ||
    typeof input.instruction !== "string" || input.instruction.length > 4_000 ||
    typeof input.planName !== "string" || input.planName.length > 120 ||
    !Number.isInteger(input.scriptDurationSeconds) || input.scriptDurationSeconds < 0 || input.scriptDurationSeconds > 3_600 ||
    typeof input.scriptFormat !== "string" || input.scriptFormat.length > 80 ||
    typeof input.scriptId !== "string" ||
    (input.scriptMode !== "ai" && input.scriptMode !== "manual") ||
    typeof input.scriptPlatform !== "string" || input.scriptPlatform.length > 80 ||
    !["none", "hook", "body", "cta", "storyboard"].includes(input.scriptSection) ||
    typeof input.scriptTitle !== "string" || input.scriptTitle.length > 200) {
    throw new HttpError(400, "INVALID_SKILL_INPUT", "Yêu cầu về kịch bản chưa hợp lệ.");
  }
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[đĐ]/g, "d").toLocaleLowerCase("vi-VN").trim();
}

function matchingName(value: string, requested: string) {
  const name = normalize(value);
  const search = normalize(requested);
  const expanded = search.replace(/^ke hoach\s+(\d+)$/, "ke hoach noi dung $1");
  return name === search || name.includes(search) || search.includes(name) || name === expanded || name.includes(expanded);
}

function compact(value: string, max = 180) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function formatScript(script: ScriptDocumentDto, detailed = false) {
  const status = {
    draft: "bản nháp", "in-progress": "đang thực hiện", ready: "sẵn sàng",
    completed: "đã thực hiện", archived: "đã lưu trữ",
  }[script.status];
  return [
    `“${script.title}” · ${status} · bản ${script.revision}`,
    script.planReference ? `Thuộc ${script.planReference.planName} / ${script.planReference.planTitle}` : "Kịch bản độc lập",
    `Thời lượng: ${script.settings.targetDurationSeconds} giây`,
    script.content.hook ? `Hook: ${detailed ? script.content.hook : compact(script.content.hook)}` : "Hook: chưa có",
    script.content.body ? `Nội dung: ${detailed ? script.content.body : compact(script.content.body)}` : "Nội dung: chưa có",
    script.content.cta ? `CTA: ${detailed ? script.content.cta : compact(script.content.cta)}` : "CTA: chưa có",
    detailed
      ? `Storyboard (${script.content.storyboard.length} cảnh):\n${script.content.storyboard.map((frame, index) => `${index + 1}. ${frame.title} (${frame.durationSeconds}s) — ${frame.visual}\nLời thoại: ${frame.dialogue}\nChỉ dẫn: ${frame.direction}`).join("\n")}`
      : `Storyboard: ${script.content.storyboard.length} cảnh`,
  ].join("\n");
}

function selectScript(scripts: ScriptDocumentDto[], input: ScriptSkillInput) {
  if (input.scriptId.trim()) {
    const match = scripts.find((script) => script.id === input.scriptId.trim());
    if (!match) throw new HttpError(404, "SCRIPT_NOT_FOUND", "Không tìm thấy kịch bản được chọn.");
    return match;
  }
  const matches = scripts.filter((script) =>
    (!input.scriptTitle.trim() || matchingName(script.title, input.scriptTitle)) &&
    (!input.planName.trim() || (script.planReference && matchingName(script.planReference.planName, input.planName))),
  );
  if (matches.length === 0) throw new HttpError(404, "SCRIPT_NOT_FOUND", "Mình chưa tìm thấy kịch bản đó. Bạn cho mình tên chính xác nhé.");
  if (matches.length > 1) throw new HttpError(409, "SCRIPT_AMBIGUOUS", "Có nhiều kịch bản phù hợp. Bạn cho mình tên kịch bản và kế hoạch nội dung để chọn đúng nhé.");
  return matches[0]!;
}

function selectSchedule(options: ScriptScheduleOptionDto[], input: ScriptSkillInput) {
  const matches = options.filter((option) =>
    (!input.planName.trim() || matchingName(option.contentPlanName, input.planName)) &&
    (!input.contentTitle.trim() || matchingName(option.title, input.contentTitle)),
  );
  if (!matches.length) throw new HttpError(404, "PLAN_ITEM_NOT_FOUND", "Không tìm thấy nội dung đó trong kế hoạch đã chốt. Hãy kiểm tra tên kế hoạch và nội dung.");
  if (matches.length > 1) throw new HttpError(409, "PLAN_ITEM_AMBIGUOUS", "Có nhiều nội dung phù hợp. Hãy nói rõ tên kế hoạch và nội dung muốn viết kịch bản.");
  if (matches[0]!.alreadyLinked) throw new HttpError(409, "SCRIPT_ALREADY_LINKED", "Nội dung này đã có kịch bản. Hãy yêu cầu mình chỉnh kịch bản hiện có, hoặc tạo kịch bản độc lập.");
  return matches[0]!;
}

export const getCurrentScriptSkill: AgentSkillDefinition<ScriptSkillInput, ScriptSkillOutput> = {
  confirmationPolicy: "none",
  description: "Liệt kê kịch bản hoặc đọc kịch bản được gọi tên; không sửa dữ liệu.",
  inputSchema,
  mode: "read",
  name: "script.get_current",
  outputSchema,
  target: "script",
  async execute(context, input) {
    validate(input);
    const workspace = await getScriptWorkspace(context.userId);
    if (!workspace.scripts.length) return {
      output: { changed: false, reply: "Bạn chưa có kịch bản. Hãy cho mình chủ đề hoặc chọn một nội dung trong kế hoạch đã chốt để bắt đầu.", script: null },
      summary: "Chưa có kịch bản để đọc.",
    };
    const listed = input.planName.trim()
      ? workspace.scripts.filter((script) => script.planReference && matchingName(script.planReference.planName, input.planName))
      : workspace.scripts;
    if (!input.scriptId && !input.scriptTitle && listed.length > 1) return {
      output: {
        changed: false,
        reply: `Bạn có ${listed.length} kịch bản${input.planName ? ` trong ${input.planName}` : ""}:\n${listed.slice(0, 8).map((script) => `• ${script.title}${script.planReference ? ` (${script.planReference.planName})` : ""} — ${script.status}`).join("\n")}\nNói tên kịch bản nếu bạn muốn mình xem hoặc chỉnh một bản cụ thể.`,
        script: null,
      },
      summary: `Đã liệt kê ${listed.length} kịch bản.`,
    };
    const script = selectScript(workspace.scripts, input);
    return {
      output: { changed: false, reply: formatScript(script, true), script },
      summary: `Đã đọc “${script.title}”, bản ${script.revision}.`,
      targetId: script.id,
      targetVersion: script.revision,
    };
  },
};

export const createScriptDraftSkill: AgentSkillDefinition<ScriptSkillInput, ScriptSkillOutput> = {
  confirmationPolicy: "review-draft",
  description: "Tạo kịch bản độc lập hoặc từ một nội dung trong kế hoạch đã chốt; chỉ lưu bản nháp.",
  inputSchema,
  mode: "draft-write",
  name: "script.create_draft",
  outputSchema,
  target: "script",
  async execute(context, input) {
    validate(input);
    const workspace = await getScriptWorkspace(context.userId);
    const linked = input.planName.trim() || input.contentTitle.trim()
      ? selectSchedule(workspace.scheduleOptions, input)
      : null;
    const title = input.scriptTitle.trim() || linked?.title || "";
    if (!title) throw new HttpError(400, "SCRIPT_TITLE_REQUIRED", "Bạn muốn viết kịch bản về chủ đề gì? Hãy cho mình tên hoặc chọn nội dung trong kế hoạch.");
    if (input.scriptDurationSeconds > 0 && input.scriptDurationSeconds < 5) throw new HttpError(400, "SCRIPT_DURATION_INVALID", "Thời lượng video cần từ 5 giây trở lên.");
    if (input.scriptMode === "ai" && !workspace.aiConfigured) throw new HttpError(503, "AI_NOT_CONFIGURED", "Hãy thêm Google API key trong Cài đặt để Emsen viết kịch bản bằng AI.");
    const script = await createScript(context.userId, {
      mode: input.scriptMode,
      title,
      brief: input.instruction,
      scheduledFor: linked?.scheduledFor ?? null,
      platform: input.scriptPlatform.trim() || linked?.platform || "TikTok",
      format: input.scriptFormat.trim() || linked?.format || "Video ngắn",
      ...(input.scriptDurationSeconds ? { targetDurationSeconds: input.scriptDurationSeconds } : {}),
      ...(linked ? { contentPlanId: linked.contentPlanId, contentPlanItemId: linked.contentPlanItemId } : {}),
    });
    return {
      output: { changed: true, reply: `Mình đã tạo kịch bản nháp. Bạn xem và sửa trước khi sử dụng nhé.\n\n${formatScript(script)}`, script },
      summary: `Đã tạo kịch bản nháp “${script.title}”.`,
      targetId: script.id,
      targetVersion: script.revision,
    };
  },
};

export const updateScriptDraftSkill: AgentSkillDefinition<ScriptSkillInput, ScriptSkillOutput> = {
  confirmationPolicy: "review-draft",
  description: "Chỉnh riêng hook, nội dung, CTA, storyboard hoặc thời lượng/nền tảng/định dạng của một kịch bản đang làm; giữ các phần khác và không tự hoàn tất.",
  inputSchema,
  mode: "draft-write",
  name: "script.update_draft",
  outputSchema,
  target: "script",
  async execute(context, input) {
    validate(input);
    const workspace = await getScriptWorkspace(context.userId);
    const current = selectScript(workspace.scripts, input);
    if (current.status !== "draft" && current.status !== "in-progress") throw new HttpError(409, "SCRIPT_NOT_EDITABLE", "Kịch bản này đã sẵn sàng hoặc hoàn thành. Hãy mở trang Kịch bản để chuyển lại trạng thái đang làm trước khi sửa.");
    const hasSettingsChange = input.scriptDurationSeconds > 0 || Boolean(input.scriptPlatform.trim()) || Boolean(input.scriptFormat.trim());
    if (input.scriptSection === "none" && !hasSettingsChange) throw new HttpError(400, "SCRIPT_SECTION_REQUIRED", "Bạn muốn mình chỉnh phần nào: hook, nội dung, CTA, storyboard hay thông số video?");
    if (!input.instruction.trim()) throw new HttpError(400, "SCRIPT_INSTRUCTION_REQUIRED", "Bạn muốn mình chỉnh phần này theo hướng nào?");
    if (input.scriptDurationSeconds > 0 && input.scriptDurationSeconds < 5) throw new HttpError(400, "SCRIPT_DURATION_INVALID", "Thời lượng video cần từ 5 giây trở lên.");
    const draft: UpdateScriptRequestDto = {
      revision: current.revision,
      title: current.title,
      status: current.status,
      creativeStrategy: current.creativeStrategy,
      content: current.content,
      settings: current.settings,
      advancedSettings: current.advancedSettings,
    };
    const suggestion = input.scriptSection === "none" ? null : await assistScript(context.userId, current.id, {
      section: input.scriptSection,
      instruction: input.instruction,
      draft,
    });
    const script = await updateScript(context.userId, current.id, {
      ...draft,
      content: { ...current.content, ...suggestion?.patch },
      settings: input.scriptSection === "none" ? {
        ...current.settings,
        ...(input.scriptDurationSeconds ? { targetDurationSeconds: input.scriptDurationSeconds } : {}),
        ...(input.scriptPlatform.trim() ? { platform: input.scriptPlatform.trim() } : {}),
        ...(input.scriptFormat.trim() ? { format: input.scriptFormat.trim() } : {}),
      } : current.settings,
    });
    return {
      output: { changed: true, reply: `Mình đã chỉnh ${input.scriptSection === "none" ? "thông số video" : `phần ${input.scriptSection}`} trong bản nháp; các phần khác được giữ nguyên. Bạn xem lại nhé.\n\n${formatScript(script)}`, script },
      summary: `Đã chỉnh ${input.scriptSection === "none" ? "thông số" : input.scriptSection} của “${script.title}”, bản ${script.revision}.`,
      targetId: script.id,
      targetVersion: script.revision,
    };
  },
};
