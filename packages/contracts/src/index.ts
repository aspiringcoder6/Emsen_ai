export type * from "./direction.js";
export type * from "./contentPlan.js";
export type * from "./script.js";

export type ServiceStatus = {
  service: string;
  status: "ok" | "starting";
  timestamp: string;
};

export type AuthUserDto = {
  createdAt: string;
  id: string;
  name: string;
  phoneNumber: string | null;
};

export type CreatorDnaOnboardingStatus =
  | "not-started"
  | "in-progress"
  | "completed"
  | "skipped";

export type CreatorDnaProfileDto = {
  audience: string;
  boundaries: string;
  displayName: string;
  niche: string;
  platforms: string[];
  toneTraits: string[];
};

export type CreatorDnaInsightDto = {
  generatedAt: string;
  headline: string;
  model: string;
  note: string;
  provider: "google-gemini" | "fallback";
  readiness: number;
  signals: string[];
  stage: "signup" | "onboarding";
};

export type CreatorDnaLearningSource =
  | "daily-story"
  | "script-feedback"
  | "direct-update"
  | "ai-chat";

export type CreatorDnaSignalCategory =
  | "Kho câu chuyện"
  | "Chủ đề quen thuộc"
  | "Giọng điệu"
  | "Khán giả"
  | "Sản phẩm phù hợp"
  | "Điều cần tránh";

export type CreatorDnaLearningSignalDto = {
  category: CreatorDnaSignalCategory;
  confidence: number;
  createdAt: string;
  evidence: string;
  id: string;
  source: CreatorDnaLearningSource;
  summary: string;
};

export type CreatorDnaStateDto = {
  currentStep: number;
  insight: CreatorDnaInsightDto | null;
  learning: {
    lastCapturedAt: string | null;
    promptCursor: number;
    signals: CreatorDnaLearningSignalDto[];
  };
  profile: CreatorDnaProfileDto;
  status: CreatorDnaOnboardingStatus;
  updatedAt: string | null;
};

export type AuthResponseDto = {
  creatorDna: CreatorDnaStateDto;
  user: AuthUserDto;
};

export type ApiErrorDto = {
  error: {
    code: string;
    message: string;
  };
};

export type SignupRequestDto = {
  acceptedTerms: boolean;
  creatorDnaChoice: "start" | "skip";
  name: string;
  password: string;
  phoneNumber: string;
};

export type LoginRequestDto = {
  password: string;
  phoneNumber: string;
  remember: boolean;
};

export type SaveCreatorDnaOnboardingRequestDto = {
  currentStep: number;
  profile: CreatorDnaProfileDto;
  status: CreatorDnaOnboardingStatus;
};

export type CreateCreatorDnaSignalRequestDto = Omit<
  CreatorDnaLearningSignalDto,
  "createdAt" | "id"
>;

export type AiProactiveFrequency = "off" | "gentle" | "balanced" | "frequent";

export type AiPreferencesDto = {
  proactiveFrequency: AiProactiveFrequency;
  lastProactiveAt: string | null;
  nextProactiveAt: string | null;
};

export type UpdateAiPreferencesRequestDto = {
  proactiveFrequency: AiProactiveFrequency;
};

export type ChatCollectionIntentDto = {
  dimension: string;
  group: "daily-idea" | "creative-direction" | "concrete-work" | "inspiration";
  kind: "creator-dna";
  priority: "high" | "medium" | "inspiration";
  promptId: string;
  question: string;
};

export type ChatMessageDto = {
  collectionIntent: ChatCollectionIntentDto | null;
  content: string;
  createdAt: string;
  id: string;
  learnedSignals: CreatorDnaLearningSignalDto[];
  model: string | null;
  provider: "google-gemini" | "fallback" | "system" | null;
  role: "assistant" | "user";
};

export type ChatStateDto = {
  ai: {
    configured: boolean;
    model: string;
  };
  conversationId: string;
  messages: ChatMessageDto[];
  preferences: AiPreferencesDto;
};

export type SendChatMessageRequestDto = {
  content: string;
  currentPage: string;
};

export type SendChatMessageResponseDto = {
  assistantMessage: ChatMessageDto;
  preferences: AiPreferencesDto;
  userMessage: ChatMessageDto;
};
