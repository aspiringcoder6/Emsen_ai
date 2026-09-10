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
  id: string;
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
export type ContentPlanBriefDto = {
  name: string;
  weekStart: string;
  focus: string;
  availableDays: number[] | null;
  weeklyVideoTarget: number | null;
};
export type ContentPlanVersionDto = {
  id: string;
  planId: string;
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
export type ContentPlanSummaryDto = {
  id: string;
  name: string;
  weekStart: string;
  latestVersion: number;
  latestStatus: "draft" | "approved" | null;
  updatedAt: string;
};
export type ContentPlanStateDto = {
  plans: ContentPlanSummaryDto[];
  activePlanId: string | null;
  versions: ContentPlanVersionDto[];
  latestApprovedDirection: DirectionVersionDto | null;
  aiConfigured: boolean;
};
export type SaveContentPlanRequestDto = {
  planId?: string | null;
  baseVersion: number;
  brief: ContentPlanBriefDto;
  directionId: string;
  items: ContentPlanItemDto[];
  status: "draft" | "approved";
};
export type GenerateContentPlanRequestDto = Omit<SaveContentPlanRequestDto, "items" | "status"> & {
  itemId?: string;
  dayIndex?: number;
  items?: ContentPlanItemDto[];
};
