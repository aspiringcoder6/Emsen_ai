import type {
  CreatorDnaInsightDto,
  CreatorDnaLearningSignalDto,
  CreatorDnaLearningSource as SharedLearningSource,
  CreatorDnaOnboardingStatus as SharedOnboardingStatus,
  CreatorDnaProfileDto,
  CreatorDnaSignalCategory as SharedSignalCategory,
  CreatorDnaStateDto,
} from "@creator-flow/contracts";

export type CreatorDnaProfile = CreatorDnaProfileDto;
export type CreatorDnaInsight = CreatorDnaInsightDto;
export type CreatorDnaLearningSource = SharedLearningSource;
export type CreatorDnaSignalCategory = SharedSignalCategory;

export type CreatorDnaSignalSuggestion = {
  category: CreatorDnaSignalCategory;
  confidence: number;
  evidence: string;
  summary: string;
};

export type CreatorDnaLearningSignal = CreatorDnaLearningSignalDto;
export type CreatorDnaLearningState = CreatorDnaStateDto["learning"];

export type CreatorDnaOnboardingStatus = SharedOnboardingStatus;
export type CreatorDnaState = CreatorDnaStateDto;

export type CreatorDnaQuestionId = keyof CreatorDnaProfile;

export type CreatorDnaQuestion = {
  id: CreatorDnaQuestionId;
  phase: "Danh tính" | "Nội dung" | "Chất giọng" | "Ranh giới";
  title: string;
  description: string;
  required: boolean;
  signal: string;
  kind: "text" | "single" | "multi" | "textarea";
  placeholder?: string;
  options?: string[];
};
