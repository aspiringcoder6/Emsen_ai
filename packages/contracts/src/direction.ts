import type { CreatorDnaStateDto } from "./index.js";

export type DirectionBriefDto = { goal: string; notes: string };
export type ContentPillarDto = {
  name: string;
  description: string;
  percentage: number;
  examples: string[];
};
export type DirectionContentDto = {
  positioning: string;
  tone: string;
  audience: string;
  pillars: ContentPillarDto[];
};
export type DirectionSection = keyof DirectionContentDto;
export type DirectionGoalSuggestionDto = {
  label: string;
  value: string;
};
export type DirectionGoalSuggestionsDto = {
  generatedAt: string;
  model: string;
  provider: "google-gemini";
  suggestions: DirectionGoalSuggestionDto[];
};
export type DirectionVersionDto = {
  id: string;
  version: number;
  status: "draft" | "approved";
  source: "ai" | "manual";
  model: string | null;
  createdAt: string;
  brief: DirectionBriefDto;
  content: DirectionContentDto;
  dnaSnapshot: CreatorDnaStateDto;
};
export type DirectionStateDto = {
  versions: DirectionVersionDto[];
  creatorDna: CreatorDnaStateDto;
  aiConfigured: boolean;
};
export type SaveDirectionRequestDto = {
  baseVersion: number;
  brief: DirectionBriefDto;
  content: DirectionContentDto;
  status: "draft" | "approved";
};
export type GenerateDirectionRequestDto = {
  baseVersion: number;
  brief: DirectionBriefDto;
  section: DirectionSection | "all";
  content?: DirectionContentDto;
};
