import type {
  DirectionSection,
  DirectionStateDto,
  DirectionVersionDto,
} from "@creator-flow/contracts";
import { HttpError } from "../../shared/http.js";
import {
  generateDirection,
  getDirectionState,
} from "../direction/direction.service.js";
import type { AgentSkillDefinition } from "./agentSkill.registry.js";

export type GetCurrentDirectionInput = Record<string, never>;

export type DirectionDraftSkillInput = {
  goal: string;
  instruction: string;
  section: DirectionSection | "all";
};

export type DirectionSkillOutput = {
  changed: boolean;
  reply: string;
  version: DirectionVersionDto | null;
};

const directionDraftInputSchema = {
  properties: {
    goal: { maxLength: 1_000, type: "string" },
    instruction: { maxLength: 4_000, type: "string" },
    section: {
      enum: ["all", "positioning", "tone", "audience", "pillars"],
      type: "string",
    },
  },
  required: ["goal", "instruction", "section"],
  type: "object",
} satisfies Record<string, unknown>;

const directionSkillOutputSchema = {
  properties: {
    changed: { type: "boolean" },
    reply: { type: "string" },
    version: { type: ["object", "null"] },
  },
  required: ["changed", "reply", "version"],
  type: "object",
} satisfies Record<string, unknown>;

const directionSections = new Set<DirectionSection | "all">([
  "all",
  "positioning",
  "tone",
  "audience",
  "pillars",
]);

function validateDraftInput(input: DirectionDraftSkillInput) {
  if (
    !input ||
    typeof input.goal !== "string" ||
    input.goal.length > 1_000 ||
    typeof input.instruction !== "string" ||
    input.instruction.length > 4_000 ||
    !directionSections.has(input.section)
  ) {
    throw new HttpError(
      400,
      "INVALID_SKILL_INPUT",
      "Yêu cầu thay đổi Định hướng không hợp lệ.",
    );
  }
}

function compact(value: string, maximum = 260) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maximum
    ? `${normalized.slice(0, maximum - 1).trimEnd()}…`
    : normalized;
}

export function formatDirectionForChat(version: DirectionVersionDto) {
  const status = version.status === "approved" ? "đã chốt" : "bản nháp cần bạn xem lại";
  const pillars = version.content.pillars
    .map(({ name, percentage }) => `${name} (${percentage}%)`)
    .join(" · ");
  return [
    `Định hướng phiên bản ${version.version} — ${status}`,
    `Mục tiêu: ${compact(version.brief.goal)}`,
    `Định vị: ${compact(version.content.positioning)}`,
    `Giọng điệu: ${compact(version.content.tone)}`,
    `Khán giả: ${compact(version.content.audience)}`,
    `Trụ cột: ${pillars}`,
  ].join("\n");
}

function currentVersion(state: DirectionStateDto) {
  return state.versions[0] ?? null;
}

function goalForDraft(
  state: DirectionStateDto,
  requestedGoal: string,
  latest: DirectionVersionDto | null,
) {
  const cleanGoal = requestedGoal.trim();
  if (cleanGoal) {
    return cleanGoal.slice(0, 1_000);
  }
  if (latest?.brief.goal.trim()) {
    return latest.brief.goal;
  }
  const niche = state.creatorDna.profile.niche.trim();
  if (!niche) {
    throw new HttpError(
      400,
      "DNA_NICHE_REQUIRED",
      "Hãy bổ sung chủ đề nội dung trong Creator DNA trước để Emsen tạo định hướng sát với bạn.",
    );
  }
  return `Xây dựng một kênh nội dung hữu ích và nhất quán về ${niche}.`;
}

function notesForDraft(latest: DirectionVersionDto | null, instruction: string) {
  const cleanInstruction = instruction.replace(/\s+/g, " ").trim();
  const requestNote = (cleanInstruction
    ? `Yêu cầu qua Emsen chat: ${cleanInstruction}`
    : "Yêu cầu qua Emsen chat: Đề xuất định hướng phù hợp với Creator DNA hiện tại."
  ).slice(0, 4_000);
  const currentNotes = latest?.brief.notes.trim() ?? "";
  if (!currentNotes) return requestNote;
  const availableForCurrent = Math.max(0, 4_000 - requestNote.length - 1);
  return `${currentNotes.slice(0, availableForCurrent)}\n${requestNote}`.slice(-4_000);
}

async function createDraft(
  userId: string,
  input: DirectionDraftSkillInput,
  operation: "generate" | "update",
) {
  validateDraftInput(input);
  const state = await getDirectionState(userId);
  const latest = currentVersion(state);
  const requestedSection = operation === "update" && latest ? input.section : "all";
  const version = await generateDirection(userId, {
    baseVersion: latest?.version ?? 0,
    brief: {
      goal: goalForDraft(state, input.goal, latest),
      notes: notesForDraft(latest, input.instruction),
    },
    section: requestedSection,
    ...(latest ? { content: latest.content } : {}),
  });
  return version;
}

export const getCurrentDirectionSkill: AgentSkillDefinition<
  GetCurrentDirectionInput,
  DirectionSkillOutput
> = {
  confirmationPolicy: "none",
  description: "Đọc và giải thích phiên bản định hướng mới nhất của người dùng.",
  inputSchema: { properties: {}, type: "object" },
  mode: "read",
  name: "direction.get_current",
  outputSchema: directionSkillOutputSchema,
  target: "direction",
  async execute(context) {
    const state = await getDirectionState(context.userId);
    const version = currentVersion(state);
    if (!version) {
      return {
        output: {
          changed: false,
          reply: "Bạn chưa có định hướng kênh. Mình có thể tạo một bản nháp từ Creator DNA để bạn xem và chốt.",
          version: null,
        },
        summary: "Chưa có định hướng để đọc.",
      };
    }
    return {
      output: { changed: false, reply: formatDirectionForChat(version), version },
      summary: `Đã đọc định hướng phiên bản ${version.version}.`,
      targetId: version.id,
      targetVersion: version.version,
    };
  },
};

export const generateDirectionDraftSkill: AgentSkillDefinition<
  DirectionDraftSkillInput,
  DirectionSkillOutput
> = {
  confirmationPolicy: "review-draft",
  description: "Tạo một bản nháp định hướng mới từ Creator DNA và yêu cầu trong chat; không tự chốt.",
  inputSchema: directionDraftInputSchema,
  mode: "draft-write",
  name: "direction.generate_draft",
  outputSchema: directionSkillOutputSchema,
  target: "direction",
  async execute(context, input) {
    const version = await createDraft(context.userId, input, "generate");
    return {
      output: {
        changed: true,
        reply: `Mình đã tạo bản nháp định hướng phiên bản ${version.version}. Mình chưa chốt thay bạn — hãy mở mục Định hướng để xem lại và xác nhận.\n\n${formatDirectionForChat(version)}`,
        version,
      },
      summary: `Đã tạo bản nháp định hướng phiên bản ${version.version}.`,
      targetId: version.id,
      targetVersion: version.version,
    };
  },
};

export const updateDirectionDraftSkill: AgentSkillDefinition<
  DirectionDraftSkillInput,
  DirectionSkillOutput
> = {
  confirmationPolicy: "review-draft",
  description: "Thay đổi toàn bộ hoặc một phần định hướng bằng cách tạo phiên bản nháp mới; không tự chốt.",
  inputSchema: directionDraftInputSchema,
  mode: "draft-write",
  name: "direction.update_draft",
  outputSchema: directionSkillOutputSchema,
  target: "direction",
  async execute(context, input) {
    const version = await createDraft(context.userId, input, "update");
    return {
      output: {
        changed: true,
        reply: `Mình đã cập nhật thành bản nháp định hướng phiên bản ${version.version}. Mình chỉ tạo bản nháp; mọi phiên bản đã chốt trước đó (nếu có) vẫn được giữ nguyên.\n\n${formatDirectionForChat(version)}`,
        version,
      },
      summary: `Đã cập nhật bản nháp định hướng phiên bản ${version.version}.`,
      targetId: version.id,
      targetVersion: version.version,
    };
  },
};
