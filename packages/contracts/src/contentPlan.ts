import type { CreatorDnaStateDto, DirectionVersionDto } from "./index.js";

export type AiKeySettingsDto = {
  hasPersonalKey: boolean;
  maskedKey: string | null;
  source: "personal" | "workspace" | "none";
  model: string;
  updatedAt: string | null;
};
export type ContentObjective = "Giá trị" | "Kết nối" | "Chuyển đổi";
export type ContentPlanItemDto = {
  dayIndex: number;
  pillarIndex: number;
  objective: ContentObjective;
  platform: string;
  format: string;
  title: string;
  angle: string;
  hook: string;
  cta: string;
  productionNotes: string;
};
export type ContentPlanBriefDto = { weekStart: string; focus: string };
export type ContentPlanVersionDto = {
  id: string;
  version: number;
  status: "draft" | "approved";
  source: "ai" | "manual";
  model: string | null;
  createdAt: string;
  brief: ContentPlanBriefDto;
  direction: DirectionVersionDto;
  dnaSnapshot: CreatorDnaStateDto;
  items: ContentPlanItemDto[];
};
export type ContentPlanStateDto = {
  versions: ContentPlanVersionDto[];
  latestApprovedDirection: DirectionVersionDto | null;
  aiConfigured: boolean;
};
export type SaveContentPlanRequestDto = {
  baseVersion: number;
  brief: ContentPlanBriefDto;
  directionId: string;
  items: ContentPlanItemDto[];
  status: "draft" | "approved";
};
export type GenerateContentPlanRequestDto = Omit<SaveContentPlanRequestDto, "items" | "status"> & {
  dayIndex?: number;
  items?: ContentPlanItemDto[];
};
