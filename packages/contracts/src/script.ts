export type ScriptStatus = "draft" | "in-progress" | "ready" | "completed" | "archived";
export type ScriptSource = "manual" | "content-plan" | "ai";
export type ScriptAssistSection = "hook" | "body" | "cta" | "storyboard";

export type ScriptStoryboardFrameDto = {
  id: string;
  title: string;
  visual: string;
  dialogue: string;
  direction: string;
  durationSeconds: number;
};

export type ScriptContentDto = {
  hook: string;
  body: string;
  cta: string;
  storyboard: ScriptStoryboardFrameDto[];
};

export type ScriptSettingsDto = {
  platform: string;
  format: string;
  scheduledFor: string | null;
  targetDurationSeconds: number;
  aspectRatio: "9:16" | "1:1" | "16:9" | "4:5";
  objective: string;
  audience: string;
  tone: string;
};

export type ScriptAdvancedSettingsDto = {
  hookStyle: string;
  pacing: "slow" | "balanced" | "fast";
  ctaStyle: string;
  language: string;
  productionNotes: string;
};

export type ScriptPlanReferenceDto = {
  contentPlanVersionId: string;
  dayIndex: number;
  weekStart: string;
  planTitle: string;
};

export type ScriptDocumentDto = {
  id: string;
  revision: number;
  title: string;
  status: ScriptStatus;
  source: ScriptSource;
  model: string | null;
  createdAt: string;
  updatedAt: string;
  planReference: ScriptPlanReferenceDto | null;
  content: ScriptContentDto;
  settings: ScriptSettingsDto;
  advancedSettings: ScriptAdvancedSettingsDto;
};

export type ScriptScheduleOptionDto = {
  id: string;
  contentPlanVersionId: string;
  dayIndex: number;
  scheduledFor: string;
  title: string;
  angle: string;
  hook: string;
  cta: string;
  platform: string;
  format: string;
  objective: string;
  weekStart: string;
  alreadyLinked: boolean;
};

export type ScriptWorkspaceDto = {
  scripts: ScriptDocumentDto[];
  scheduleOptions: ScriptScheduleOptionDto[];
  aiConfigured: boolean;
};

export type CreateScriptRequestDto = {
  mode: "manual" | "ai";
  title: string;
  brief: string;
  scheduledFor: string | null;
  platform: string;
  format: string;
  contentPlanVersionId?: string;
  dayIndex?: number;
};

export type UpdateScriptRequestDto = Pick<
  ScriptDocumentDto,
  "revision" | "title" | "status" | "content" | "settings" | "advancedSettings"
>;

export type ScriptAssistRequestDto = {
  section: ScriptAssistSection;
  instruction: string;
  draft: UpdateScriptRequestDto;
};

export type ScriptAssistResponseDto = {
  section: ScriptAssistSection;
  patch: Partial<ScriptContentDto>;
  model: string;
};
