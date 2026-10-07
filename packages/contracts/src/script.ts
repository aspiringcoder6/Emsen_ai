export type ScriptStatus = "draft" | "in-progress" | "ready" | "completed" | "archived";
export type ScriptSource = "manual" | "content-plan" | "ai";
export type ScriptAssistSection = "hook" | "body" | "cta" | "storyboard";

export type ScriptHookAngleType =
  | "pain"
  | "curiosity"
  | "contrarian"
  | "story"
  | "confession"
  | "authority"
  | "data"
  | "experience";

export type ScriptCreativeConceptDto = {
  id: string;
  angleType: ScriptHookAngleType;
  label: string;
  angle: string;
  hook: string;
  tension: string;
  development: string;
  creatorPrompt: string;
  whyItFits: string;
  fitScore: number;
};

export type ScriptCreativeStrategyDto = {
  selectedConcept: ScriptCreativeConceptDto | null;
  creatorExperience: string;
};

export type StoryboardTextOverlayDto = {
  text: string;
  font: "sans" | "serif" | "mono";
  color: string;
  backgroundColor: string;
  position: "top" | "center" | "bottom";
  size: "small" | "medium" | "large";
};

export type StoryboardAssetDto = {
  id: string;
  fileName: string;
  imageUrl: string;
  expiresAt: string;
};

export type UploadStoryboardAssetRequestDto = {
  fileName: string;
  mimeType: string;
  dataBase64: string;
};

/** Sketch is retained for existing jobs; new creator scenes use full-color images. */
export type StoryboardImageStyle = "creator" | "sketch" | "cinematic" | "illustration";
export type StoryboardCreatorAction = "auto" | "talk-to-camera" | "show-product" | "unbox" | "demonstrate" | "b-roll";

export type GenerateStoryboardImageRequestDto = {
  requestId: string;
  scriptRevision: number;
  scene: Pick<ScriptStoryboardFrameDto, "id" | "title" | "visual" | "direction" | "locked">;
  aspectRatio: ScriptSettingsDto["aspectRatio"];
  style: StoryboardImageStyle;
  creatorAction?: StoryboardCreatorAction;
  prompt: string;
};

export type StoryboardImageJobDto = {
  id: string;
  sceneId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  progress: number;
  provider: string;
  model: string;
  source: GenerateStoryboardImageRequestDto;
  assetId: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type StoryboardImageWorkspaceDto = {
  configured: boolean;
  configurationMessage: string | null;
  provider: string;
  model: string;
  capabilities: { exactAspectRatio: boolean; referenceImages: boolean };
  usage: { usedToday: number; dailyLimit: number; workspaceUsedToday: number; workspaceDailyLimit: number; resetsAt: string };
  jobs: StoryboardImageJobDto[];
};

export type ScriptStoryboardFrameDto = {
  id: string;
  title: string;
  visual: string;
  visualPurpose: string;
  broll: string;
  dialogue: string;
  emotionalBeat: string;
  transition: string;
  retentionRole: string;
  direction: string;
  durationSeconds: number;
  /** Optional for documents created before visual storyboards. */
  illustrationAssetId?: string | null;
  onScreenText?: StoryboardTextOverlayDto;
  /** Protects the scene from AI rewrites; manual edits are still allowed. */
  locked?: boolean;
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

export type ScriptPlanSourceSnapshotDto = {
  title: string;
  angle: string;
  hook: string;
  cta: string;
  platform: string;
  format: string;
  objective: string;
  productionNotes: string;
  scheduledFor: string;
};

export type ScriptPlanSyncField =
  | "title"
  | "hook"
  | "body"
  | "cta"
  | "storyboard"
  | "schedule"
  | "platform"
  | "format"
  | "objective"
  | "productionNotes";

export type ScriptPlanSyncDto = {
  state: "current" | "updated" | "source-removed";
  syncedAt: string;
  appliedFields: ScriptPlanSyncField[];
  preservedFields: ScriptPlanSyncField[];
};

export type ScriptPlanReferenceDto = {
  contentPlanId: string;
  contentPlanVersionId: string;
  contentPlanVersion: number;
  contentPlanItemId: string;
  dayIndex: number;
  weekStart: string;
  planName: string;
  planTitle: string;
  sourceSnapshot: ScriptPlanSourceSnapshotDto;
  sync: ScriptPlanSyncDto;
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
  creativeStrategy: ScriptCreativeStrategyDto;
  content: ScriptContentDto;
  settings: ScriptSettingsDto;
  advancedSettings: ScriptAdvancedSettingsDto;
};

export type ScriptScheduleOptionDto = {
  id: string;
  contentPlanId: string;
  contentPlanName: string;
  contentPlanVersionId: string;
  contentPlanVersion: number;
  contentPlanItemId: string;
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
  targetDurationSeconds?: number;
  creatorExperience?: string;
  ctaStyle?: string;
  selectedConcept?: ScriptCreativeConceptDto;
  contentPlanId?: string;
  contentPlanItemId?: string;
  /** @deprecated Kept for requests created before plans received a stable id. */
  contentPlanVersionId?: string;
  dayIndex?: number;
};

export type ScriptBrainstormRequestDto = Omit<
  CreateScriptRequestDto,
  "mode" | "selectedConcept"
> & {
  optionCount?: number;
};

export type ScriptBrainstormResponseDto = {
  concepts: ScriptCreativeConceptDto[];
  recommendedId: string;
  model: string;
};

export type UpdateScriptRequestDto = Pick<
  ScriptDocumentDto,
  | "revision"
  | "title"
  | "status"
  | "creativeStrategy"
  | "content"
  | "settings"
  | "advancedSettings"
>;

export type ScriptAssistRequestDto = {
  section: ScriptAssistSection;
  instruction: string;
  draft: UpdateScriptRequestDto;
  referenceAssets?: ScriptReferenceAssetDto[];
};

export type ScriptReferenceAssetDto = {
  dataBase64: string;
  mimeType: string;
  name: string;
};

export type ScriptAssistResponseDto = {
  section: ScriptAssistSection;
  patch: Partial<ScriptContentDto>;
  model: string;
  alternatives?: string[];
};
