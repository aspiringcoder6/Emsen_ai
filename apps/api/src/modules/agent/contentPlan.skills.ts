import type {
  ContentPlanBriefDto,
  ContentPlanItemDto,
  ContentPlanStateDto,
  ContentPlanVersionDto,
  DirectionVersionDto,
} from "@creator-flow/contracts";
import { HttpError } from "../../shared/http.js";
import {
  generateContentPlan,
  getContentPlanState,
} from "../content-plan/contentPlan.service.js";
import type { AgentSkillDefinition } from "./agentSkill.registry.js";

export type GetCurrentContentPlanInput = {
  planId: string;
  planName: string;
};

export type ContentPlanDraftSkillInput = {
  availableDays: number[] | null;
  focus: string;
  instruction: string;
  planId: string;
  planName: string;
  replaceAvailableDays: boolean;
  replaceFocus: boolean;
  replaceWeekStart: boolean;
  replaceWeeklyVideoTarget: boolean;
  weekStart: string;
  weeklyVideoTarget: number | null;
};

export type ContentPlanSkillOutput = {
  changed: boolean;
  reply: string;
  version: ContentPlanVersionDto | null;
};

const dayLabels = [
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
  "Chủ nhật",
];

const contentPlanDraftInputSchema = {
  properties: {
    availableDays: {
      items: { maximum: 6, minimum: 0, type: "integer" },
      maxItems: 7,
      type: ["array", "null"],
    },
    focus: { maxLength: 2_000, type: "string" },
    instruction: { maxLength: 4_000, type: "string" },
    planId: { type: "string" },
    planName: { maxLength: 120, type: "string" },
    replaceAvailableDays: { type: "boolean" },
    replaceFocus: { type: "boolean" },
    replaceWeekStart: { type: "boolean" },
    replaceWeeklyVideoTarget: { type: "boolean" },
    weekStart: { type: "string" },
    weeklyVideoTarget: { maximum: 7, minimum: 1, type: ["integer", "null"] },
  },
  required: [
    "availableDays",
    "focus",
    "instruction",
    "planId",
    "planName",
    "replaceAvailableDays",
    "replaceFocus",
    "replaceWeekStart",
    "replaceWeeklyVideoTarget",
    "weekStart",
    "weeklyVideoTarget",
  ],
  type: "object",
} satisfies Record<string, unknown>;

const contentPlanSkillOutputSchema = {
  properties: {
    changed: { type: "boolean" },
    reply: { type: "string" },
    version: { type: ["object", "null"] },
  },
  required: ["changed", "reply", "version"],
  type: "object",
} satisfies Record<string, unknown>;

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase("vi-VN")
    .trim();
}

function validWeekStart(value: string) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function currentWeekStartForAgent(offsetWeeks = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const date = new Date(`${values.year}-${values.month}-${values.day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) + offsetWeeks * 7);
  return date.toISOString().slice(0, 10);
}

function validatePlanSelector(input: GetCurrentContentPlanInput) {
  if (
    !input ||
    typeof input.planId !== "string" ||
    (input.planId !== "" &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        input.planId,
      )) ||
    typeof input.planName !== "string" ||
    input.planName.length > 120
  ) {
    throw new HttpError(400, "INVALID_SKILL_INPUT", "Kế hoạch cần xem không hợp lệ.");
  }
}

function validateDraftInput(input: ContentPlanDraftSkillInput) {
  if (
    !input ||
    typeof input.planId !== "string" ||
    typeof input.planName !== "string" ||
    input.planName.length > 120 ||
    typeof input.focus !== "string" ||
    input.focus.length > 2_000 ||
    typeof input.instruction !== "string" ||
    input.instruction.length > 4_000 ||
    typeof input.weekStart !== "string" ||
    typeof input.replaceAvailableDays !== "boolean" ||
    typeof input.replaceFocus !== "boolean" ||
    typeof input.replaceWeekStart !== "boolean" ||
    typeof input.replaceWeeklyVideoTarget !== "boolean" ||
    (input.weekStart !== "" && !validWeekStart(input.weekStart)) ||
    (input.weeklyVideoTarget !== null &&
      (!Number.isInteger(input.weeklyVideoTarget) ||
        input.weeklyVideoTarget < 1 ||
        input.weeklyVideoTarget > 7)) ||
    (input.availableDays !== null &&
      (!Array.isArray(input.availableDays) ||
        input.availableDays.length < 1 ||
        input.availableDays.length > 7 ||
        input.availableDays.some(
          (day) => !Number.isInteger(day) || day < 0 || day > 6,
        ) ||
        new Set(input.availableDays).size !== input.availableDays.length))
  ) {
    throw new HttpError(400, "INVALID_SKILL_INPUT", "Yêu cầu lập kế hoạch nội dung không hợp lệ.");
  }
}

async function selectedPlanState(
  userId: string,
  input: GetCurrentContentPlanInput,
) {
  validatePlanSelector(input);
  if (input.planId.trim()) {
    return getContentPlanState(userId, { planId: input.planId.trim() });
  }
  const initial = await getContentPlanState(userId);
  const requestedName = normalizeSearch(input.planName);
  if (!requestedName) return initial;
  const matches = initial.plans.filter((plan) => {
    const name = normalizeSearch(plan.name);
    return name === requestedName || name.includes(requestedName) || requestedName.includes(name);
  });
  if (matches.length === 0) {
    throw new HttpError(404, "CONTENT_PLAN_NOT_FOUND", `Không tìm thấy kế hoạch “${input.planName.trim()}”.`);
  }
  if (matches.length > 1) {
    throw new HttpError(409, "CONTENT_PLAN_AMBIGUOUS", "Có nhiều kế hoạch trùng tên gần giống nhau. Hãy nói rõ tên kế hoạch cần chỉnh.");
  }
  return getContentPlanState(userId, { planId: matches[0]!.id });
}

function requireLatestDirection(state: ContentPlanStateDto) {
  if (!state.latestDirection) {
    throw new HttpError(
      400,
      "DIRECTION_REQUIRED",
      "Hãy tạo Định hướng trước để Emsen lập kế hoạch nội dung.",
    );
  }
  return state.latestDirection;
}

function rebaseItems(
  items: ContentPlanItemDto[],
  direction: DirectionVersionDto,
) {
  const pillarCount = direction.content.pillars.length;
  return items.map((item) => ({
    ...item,
    pillarIndex: Math.abs(item.pillarIndex) % pillarCount,
  }));
}

function defaultPlanName(count: number) {
  return `Kế hoạch nội dung ${String(count + 1).padStart(2, "0")}`;
}

function compact(value: string, maximum = 160) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maximum
    ? `${normalized.slice(0, maximum - 1).trimEnd()}…`
    : normalized;
}

export function formatContentPlanForChat(version: ContentPlanVersionDto) {
  const status = version.status === "approved" ? "đã chốt" : "bản nháp cần xem lại";
  const schedule = version.items.map(
    (item) => `• ${dayLabels[item.dayIndex]}: ${compact(item.title)}`,
  );
  return [
    `${version.brief.name} — phiên bản ${version.version}, ${status}`,
    `Tuần bắt đầu: ${version.brief.weekStart}`,
    `Định hướng sử dụng: phiên bản ${version.direction.version} · ${version.direction.status === "approved" ? "Đã chốt" : "Nháp"}`,
    ...(version.brief.focus ? [`Trọng tâm: ${compact(version.brief.focus, 240)}`] : []),
    `Lịch ${version.items.length} nội dung:`,
    ...schedule,
  ].join("\n");
}

function createBrief(
  state: ContentPlanStateDto,
  input: ContentPlanDraftSkillInput,
): ContentPlanBriefDto {
  return {
    availableDays: input.availableDays,
    focus: input.focus.trim(),
    name: input.planName.trim() || defaultPlanName(state.plans.length),
    weekStart: input.weekStart || currentWeekStartForAgent(),
    weeklyVideoTarget: input.weeklyVideoTarget,
  };
}

function updateBrief(
  current: ContentPlanVersionDto,
  input: ContentPlanDraftSkillInput,
): ContentPlanBriefDto {
  if (input.replaceWeekStart && !input.weekStart) {
    throw new HttpError(400, "PLAN_WEEK_REQUIRED", "Hãy cho Emsen biết tuần cần chuyển kế hoạch tới.");
  }
  return {
    availableDays: input.replaceAvailableDays
      ? input.availableDays
      : current.brief.availableDays,
    focus: input.replaceFocus ? input.focus.trim() : current.brief.focus,
    name: current.brief.name,
    weekStart: input.replaceWeekStart ? input.weekStart : current.brief.weekStart,
    weeklyVideoTarget: input.replaceWeeklyVideoTarget
      ? input.weeklyVideoTarget
      : current.brief.weeklyVideoTarget,
  };
}

export const getCurrentContentPlanSkill: AgentSkillDefinition<
  GetCurrentContentPlanInput,
  ContentPlanSkillOutput
> = {
  confirmationPolicy: "none",
  description: "Đọc và giải thích kế hoạch nội dung mới nhất hoặc kế hoạch được gọi tên.",
  inputSchema: {
    properties: { planId: { type: "string" }, planName: { type: "string" } },
    required: ["planId", "planName"],
    type: "object",
  },
  mode: "read",
  name: "content_plan.get_current",
  outputSchema: contentPlanSkillOutputSchema,
  target: "content-plan",
  async execute(context, input) {
    const state = await selectedPlanState(context.userId, input);
    const version = state.versions[0] ?? null;
    if (!version) {
      return {
        output: {
          changed: false,
          reply: "Bạn chưa có kế hoạch nội dung. Mình có thể tạo một bản nháp từ Định hướng hiện tại.",
          version: null,
        },
        summary: "Chưa có kế hoạch nội dung để đọc.",
      };
    }
    return {
      output: { changed: false, reply: formatContentPlanForChat(version), version },
      summary: `Đã đọc ${version.brief.name}, phiên bản ${version.version}.`,
      targetId: version.planId,
      targetVersion: version.version,
    };
  },
};

export const generateContentPlanDraftSkill: AgentSkillDefinition<
  ContentPlanDraftSkillInput,
  ContentPlanSkillOutput
> = {
  confirmationPolicy: "review-draft",
  description: "Tạo một kế hoạch nội dung mới dưới dạng bản nháp từ Định hướng hiện tại.",
  inputSchema: contentPlanDraftInputSchema,
  mode: "draft-write",
  name: "content_plan.generate_draft",
  outputSchema: contentPlanSkillOutputSchema,
  target: "content-plan",
  async execute(context, input) {
    validateDraftInput(input);
    const state = await getContentPlanState(context.userId);
    const direction = requireLatestDirection(state);
    const version = await generateContentPlan(context.userId, {
      baseVersion: 0,
      brief: createBrief(state, input),
      directionId: direction.id,
      instruction: input.instruction,
      planId: null,
    });
    return {
      output: {
        changed: true,
        reply: `Mình đã tạo bản nháp kế hoạch mới. Mình chưa chốt thay bạn — hãy xem lại lịch và nội dung trước khi duyệt.\n\n${formatContentPlanForChat(version)}`,
        version,
      },
      summary: `Đã tạo ${version.brief.name}, phiên bản nháp ${version.version}.`,
      targetId: version.planId,
      targetVersion: version.version,
    };
  },
};

export const updateContentPlanDraftSkill: AgentSkillDefinition<
  ContentPlanDraftSkillInput,
  ContentPlanSkillOutput
> = {
  confirmationPolicy: "review-draft",
  description: "Điều chỉnh kế hoạch được chọn và lưu thành phiên bản nháp mới; không tự chốt.",
  inputSchema: contentPlanDraftInputSchema,
  mode: "draft-write",
  name: "content_plan.update_draft",
  outputSchema: contentPlanSkillOutputSchema,
  target: "content-plan",
  async execute(context, input) {
    validateDraftInput(input);
    const state = await selectedPlanState(context.userId, input);
    const current = state.versions[0];
    if (!current) {
      throw new HttpError(404, "CONTENT_PLAN_NOT_FOUND", "Chưa có kế hoạch nội dung để điều chỉnh.");
    }
    const direction = requireLatestDirection(state);
    const version = await generateContentPlan(context.userId, {
      baseVersion: current.version,
      brief: updateBrief(current, input),
      directionId: direction.id,
      instruction: input.instruction,
      items: rebaseItems(current.items, direction),
      planId: current.planId,
    });
    return {
      output: {
        changed: true,
        reply: `Mình đã điều chỉnh kế hoạch thành phiên bản nháp ${version.version}. Phiên bản đã chốt trước đó (nếu có) vẫn được giữ nguyên.\n\n${formatContentPlanForChat(version)}`,
        version,
      },
      summary: `Đã cập nhật ${version.brief.name} thành phiên bản nháp ${version.version}.`,
      targetId: version.planId,
      targetVersion: version.version,
    };
  },
};
