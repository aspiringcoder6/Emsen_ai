import type { AgentSkillName, DirectionSection } from "@creator-flow/contracts";

export const agentChatSkillNames = [
  "none",
  "direction.get_current",
  "direction.generate_draft",
  "direction.update_draft",
  "content_plan.get_current",
  "content_plan.generate_draft",
  "content_plan.update_draft",
] as const;

export type AgentChatSkillName =
  | Exclude<AgentSkillName, `creator_dna.${string}`>
  | "none";

export type AgentChatSkillCall = {
  availableDays: number[];
  focus: string;
  goal: string;
  instruction: string;
  name: AgentChatSkillName;
  planId: string;
  planName: string;
  replaceAvailableDays: boolean;
  replaceFocus: boolean;
  replaceWeekStart: boolean;
  replaceWeeklyVideoTarget: boolean;
  section: DirectionSection | "all";
  weekStart: string;
  weeklyVideoTarget: number;
};

const directionSections = ["all", "positioning", "tone", "audience", "pillars"] as const;

export function emptyAgentChatSkillCall(): AgentChatSkillCall {
  return {
    availableDays: [],
    focus: "",
    goal: "",
    instruction: "",
    name: "none",
    planId: "",
    planName: "",
    replaceAvailableDays: false,
    replaceFocus: false,
    replaceWeekStart: false,
    replaceWeeklyVideoTarget: false,
    section: "all",
    weekStart: "",
    weeklyVideoTarget: 0,
  };
}

export function isAgentChatSkillCall(value: unknown): value is AgentChatSkillCall {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AgentChatSkillCall>;
  return Boolean(
    typeof candidate.name === "string" &&
      agentChatSkillNames.includes(candidate.name as (typeof agentChatSkillNames)[number]) &&
      typeof candidate.section === "string" &&
      directionSections.includes(candidate.section as (typeof directionSections)[number]) &&
      typeof candidate.goal === "string" &&
      candidate.goal.length <= 1_000 &&
      typeof candidate.instruction === "string" &&
      candidate.instruction.length <= 4_000 &&
      typeof candidate.planId === "string" &&
      typeof candidate.planName === "string" &&
      candidate.planName.length <= 120 &&
      typeof candidate.weekStart === "string" &&
      typeof candidate.focus === "string" &&
      candidate.focus.length <= 2_000 &&
      Array.isArray(candidate.availableDays) &&
      candidate.availableDays.length <= 7 &&
      candidate.availableDays.every(
        (day) => Number.isInteger(day) && day >= 0 && day <= 6,
      ) &&
      new Set(candidate.availableDays).size === candidate.availableDays.length &&
      typeof candidate.weeklyVideoTarget === "number" &&
      Number.isInteger(candidate.weeklyVideoTarget) &&
      candidate.weeklyVideoTarget >= 0 &&
      candidate.weeklyVideoTarget <= 7 &&
      typeof candidate.replaceAvailableDays === "boolean" &&
      typeof candidate.replaceFocus === "boolean" &&
      typeof candidate.replaceWeekStart === "boolean" &&
      typeof candidate.replaceWeeklyVideoTarget === "boolean",
  );
}

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase("vi-VN");
}

function currentWeekStart(offsetWeeks = 0) {
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

function inferSection(content: string): DirectionSection | "all" {
  if (/dinh vi|position/.test(content)) return "positioning";
  if (/giong dieu|cach noi|tone/.test(content)) return "tone";
  if (/khan gia|doi tuong|audience/.test(content)) return "audience";
  if (/tru cot|pillar|nhom chu de/.test(content)) return "pillars";
  return "all";
}

const requestLead = /(^|\b)(hay|giup|vui long|minh muon|toi muon|minh can|toi can)\b/;
const changeVerb = /\b(sua|chinh sua|chinh lai|doi|thay|cap nhat|dieu chinh|lam lai|viet lai|sap lai)\b/;
const startsWithChange = /^(sua|chinh sua|chinh lai|doi|thay|cap nhat|dieu chinh|lam lai|viet lai|sap lai)\b/;
const createVerb = /\b(tao|lap|xay dung|de xuat|goi y|len ke hoach|len lich)\b/;
const startsWithCreate = /^(tao|lap|xay dung|de xuat|goi y|len ke hoach|len lich)\b/;
const blockedWriteRequest = /\b(neu|co nen|lam sao|the nao|vi sao|tai sao|chot|phe duyet|approve|xac nhan|xoa)\b|\bcach (nao|tao|xay dung|lap|dieu chinh|thay doi)\b/;

function directChangeRequest(content: string) {
  return startsWithChange.test(content) || (requestLead.test(content) && changeVerb.test(content));
}

function directCreateRequest(content: string) {
  return startsWithCreate.test(content) || (requestLead.test(content) && createVerb.test(content));
}

function inferDirectionCall(clean: string, plain: string): AgentChatSkillCall {
  const call = emptyAgentChatSkillCall();
  const mentionsDirection =
    /dinh huong|master direction|dinh vi|tru cot noi dung|giong dieu kenh|khan gia muc tieu/.test(
      plain,
    );
  if (!mentionsDirection || blockedWriteRequest.test(plain)) return call;
  if (directChangeRequest(plain)) {
    return {
      ...call,
      instruction: clean,
      name: "direction.update_draft",
      section: inferSection(plain),
    };
  }
  if (directCreateRequest(plain)) {
    return {
      ...call,
      instruction: clean,
      name: "direction.generate_draft",
    };
  }
  return { ...call, instruction: clean, name: "direction.get_current" };
}

function inferAvailableDays(plain: string) {
  const patterns: Array<[RegExp, number]> = [
    [/\bthu (2|hai)\b/, 0],
    [/\bthu (3|ba)\b/, 1],
    [/\bthu (4|tu)\b/, 2],
    [/\bthu (5|nam)\b/, 3],
    [/\bthu (6|sau)\b/, 4],
    [/\bthu (7|bay)\b/, 5],
    [/\bchu nhat\b/, 6],
  ];
  if (/\bca tuan|moi ngay|tat ca cac ngay\b/.test(plain)) {
    return { days: [0, 1, 2, 3, 4, 5, 6], specified: true };
  }
  const days = patterns.filter(([pattern]) => pattern.test(plain)).map(([, day]) => day);
  const aiDecides = /ai tu (quyet dinh|sap|chon)|emsen tu (quyet dinh|sap|chon)|tu dong sap lich/.test(
    plain,
  );
  return { days, specified: days.length > 0 || aiDecides };
}

function inferPlanCall(clean: string, plain: string): AgentChatSkillCall {
  const call = emptyAgentChatSkillCall();
  const mentionsPlan = /ke hoach noi dung|content plan|lich noi dung|len ke hoach|len lich content/.test(
    plain,
  );
  if (!mentionsPlan || blockedWriteRequest.test(plain)) return call;
  const available = inferAvailableDays(plain);
  const targetMatch = plain.match(/\b([1-7])\s*(video|clip|noi dung)\b/);
  const targetSpecified = Boolean(targetMatch) || /so luong.*ai tu|ai tu.*so luong/.test(plain);
  const weekMatch = plain.match(/\b20\d{2}-\d{2}-\d{2}\b/);
  const thisWeek = /\btuan nay\b/.test(plain);
  const nextWeek = /\btuan sau\b/.test(plain);
  const planName = plain.match(/\bke hoach noi dung\s+\d{1,3}\b/)?.[0] ?? "";
  const inferred: AgentChatSkillCall = {
    ...call,
    availableDays: available.days,
    instruction: clean,
    planName,
    replaceAvailableDays: available.specified,
    replaceWeekStart: Boolean(weekMatch || thisWeek || nextWeek),
    replaceWeeklyVideoTarget: targetSpecified,
    weekStart: weekMatch?.[0] ?? (nextWeek ? currentWeekStart(1) : thisWeek ? currentWeekStart() : ""),
    weeklyVideoTarget: targetMatch ? Number(targetMatch[1]) : 0,
  };
  if (directChangeRequest(plain)) {
    return { ...inferred, name: "content_plan.update_draft" };
  }
  if (directCreateRequest(plain)) {
    return { ...inferred, name: "content_plan.generate_draft" };
  }
  return { ...inferred, name: "content_plan.get_current" };
}

export function inferAgentSkillCall(content: string): AgentChatSkillCall {
  const clean = content.trim().slice(0, 4_000);
  const plain = normalized(clean);
  if (/ke hoach noi dung|content plan|lich noi dung|len ke hoach|len lich content/.test(plain)) {
    return inferPlanCall(clean, plain);
  }
  return inferDirectionCall(clean, plain);
}

export function resolveAgentSkillCall(
  content: string,
  modelCall: AgentChatSkillCall,
): AgentChatSkillCall {
  const inferred = inferAgentSkillCall(content);
  const plain = normalized(content);
  if (inferred.name === "none") {
    if (
      modelCall.name !== "none" &&
      modelCall.name !== "direction.get_current" &&
      modelCall.name !== "content_plan.get_current" &&
      (blockedWriteRequest.test(plain) ||
        (!directChangeRequest(plain) && !directCreateRequest(plain)))
    ) {
      return emptyAgentChatSkillCall();
    }
    return modelCall;
  }
  return {
    ...modelCall,
    availableDays: inferred.replaceAvailableDays
      ? inferred.availableDays
      : modelCall.availableDays,
    instruction: content.trim().slice(0, 4_000),
    name: inferred.name,
    planName: inferred.planName || modelCall.planName,
    replaceAvailableDays:
      inferred.replaceAvailableDays || modelCall.replaceAvailableDays,
    replaceWeekStart: inferred.replaceWeekStart || modelCall.replaceWeekStart,
    replaceWeeklyVideoTarget:
      inferred.replaceWeeklyVideoTarget || modelCall.replaceWeeklyVideoTarget,
    section: inferred.section,
    weekStart: inferred.replaceWeekStart ? inferred.weekStart : modelCall.weekStart,
    weeklyVideoTarget: inferred.replaceWeeklyVideoTarget
      ? inferred.weeklyVideoTarget
      : modelCall.weeklyVideoTarget,
  };
}
