import type { AgentSkillName, DirectionSection } from "@creator-flow/contracts";

export const directionChatSkillNames = [
  "none",
  "direction.get_current",
  "direction.generate_draft",
  "direction.update_draft",
] as const;

export type DirectionChatSkillName =
  | Extract<AgentSkillName, `direction.${string}`>
  | "none";

export type DirectionChatSkillCall = {
  goal: string;
  instruction: string;
  name: DirectionChatSkillName;
  section: DirectionSection | "all";
};

const directionSections = ["all", "positioning", "tone", "audience", "pillars"] as const;

export function isDirectionChatSkillCall(value: unknown): value is DirectionChatSkillCall {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<DirectionChatSkillCall>;
  return Boolean(
    typeof candidate.name === "string" &&
      directionChatSkillNames.includes(candidate.name as (typeof directionChatSkillNames)[number]) &&
      typeof candidate.section === "string" &&
      directionSections.includes(candidate.section as (typeof directionSections)[number]) &&
      typeof candidate.goal === "string" &&
      candidate.goal.length <= 1_000 &&
      typeof candidate.instruction === "string" &&
      candidate.instruction.length <= 4_000,
  );
}

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase("vi-VN");
}

function inferSection(content: string): DirectionSection | "all" {
  if (/dinh vi|position/.test(content)) return "positioning";
  if (/giong dieu|cach noi|tone/.test(content)) return "tone";
  if (/khan gia|doi tuong|audience/.test(content)) return "audience";
  if (/tru cot|pillar|nhom chu de/.test(content)) return "pillars";
  return "all";
}

export function inferDirectionSkillCall(content: string): DirectionChatSkillCall {
  const clean = content.trim().slice(0, 4_000);
  const plain = normalized(clean);
  const mentionsDirection =
    /dinh huong|master direction|dinh vi|tru cot noi dung|giong dieu kenh|khan gia muc tieu/.test(
      plain,
    );
  if (!mentionsDirection) {
    return { goal: "", instruction: "", name: "none", section: "all" };
  }

  const section = inferSection(plain);
  const blockedWriteRequest =
    /\b(neu|co nen|lam sao|the nao|vi sao|tai sao|chot|phe duyet|approve|xac nhan)\b|\bcach (nao|tao|xay dung|lap|dieu chinh|thay doi)\b/;
  if (blockedWriteRequest.test(plain)) {
    return { goal: "", instruction: "", name: "none", section: "all" };
  }
  const requestLead = /(^|\b)(hay|giup|vui long|minh muon|toi muon|minh can|toi can)\b/;
  const startsWithChange = /^(sua|chinh sua|chinh lai|doi|thay|cap nhat|dieu chinh|lam lai|viet lai)\b/;
  const changeVerb = /\b(sua|chinh sua|chinh lai|doi|thay|cap nhat|dieu chinh|lam lai|viet lai)\b/;
  if (startsWithChange.test(plain) || (requestLead.test(plain) && changeVerb.test(plain))) {
    return {
      goal: "",
      instruction: clean,
      name: "direction.update_draft",
      section,
    };
  }
  const startsWithCreate = /^(tao|lap|xay dung|de xuat|goi y)\b/;
  const createVerb = /\b(tao|lap|xay dung|de xuat|goi y)\b/;
  if (startsWithCreate.test(plain) || (requestLead.test(plain) && createVerb.test(plain))) {
    return {
      goal: "",
      instruction: clean,
      name: "direction.generate_draft",
      section: "all",
    };
  }
  return {
    goal: "",
    instruction: clean,
    name: "direction.get_current",
    section,
  };
}

export function resolveDirectionSkillCall(
  content: string,
  modelCall: DirectionChatSkillCall,
): DirectionChatSkillCall {
  const inferred = inferDirectionSkillCall(content);
  if (inferred.name === "none") {
    const plain = normalized(content);
    if (
      (modelCall.name === "direction.generate_draft" ||
        modelCall.name === "direction.update_draft") &&
      /\b(neu|co nen|lam sao|the nao|vi sao|tai sao|chot|phe duyet|approve|xac nhan)\b|\bcach (nao|tao|xay dung|lap|dieu chinh|thay doi)\b/.test(plain)
    ) {
      return { goal: "", instruction: "", name: "none", section: "all" };
    }
    return modelCall;
  }
  return {
    ...modelCall,
    instruction: content.trim().slice(0, 4_000),
    name: inferred.name,
    section: inferred.section,
  };
}
