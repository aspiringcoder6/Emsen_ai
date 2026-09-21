import type { ScriptStatus } from "./script.js";

export type VideoProjectStatus =
  | "setup"
  | "uploaded"
  | "analyzing"
  | "transcribing"
  | "transcript-ready"
  | "cut-review"
  | "ready-to-render"
  | "rendering"
  | "completed"
  | "failed";

export type VideoAssetStatus =
  | "pending-upload"
  | "uploaded"
  | "processing"
  | "ready"
  | "failed";

export type VideoJobType = "probe" | "transcribe" | "suggest-cuts" | "render";
export type VideoJobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";
export type VideoCaptionPreset = "emsen-clean" | "none";

export type VideoProjectScriptDto = {
  aspectRatio: "9:16" | "1:1" | "16:9" | "4:5";
  id: string;
  revision: number;
  status: ScriptStatus;
  targetDurationSeconds: number;
  title: string;
  updatedAt: string;
};

export type VideoProjectScriptOptionDto = VideoProjectScriptDto & {
  compatible: boolean;
  incompatibilityReason: string | null;
  projectCount: number;
};

export type VideoProjectSettingsDto = {
  aspectRatio: "9:16";
  captionPreset: VideoCaptionPreset;
  targetDurationSeconds: number;
};

export type VideoTeleprompterDto = {
  body: string;
  cta: string;
  hook: string;
  scriptRevision: number;
};

export type VideoTranscriptSegmentDto = {
  endSeconds: number;
  id: string;
  startSeconds: number;
  text: string;
};

export type VideoTranscriptDto = {
  durationSeconds: number;
  language: string;
  model: string | null;
  revision: number;
  segments: VideoTranscriptSegmentDto[];
  source: "ai";
  status: "draft" | "approved";
  updatedAt: string;
};

export type VideoAssetDto = {
  createdAt: string;
  fileName: string;
  id: string;
  kind: "source" | "output";
  mimeType: string;
  sizeBytes: number;
  status: VideoAssetStatus;
  updatedAt: string;
};

export type VideoJobDto = {
  createdAt: string;
  errorMessage: string | null;
  id: string;
  progress: number;
  status: VideoJobStatus;
  type: VideoJobType;
  updatedAt: string;
};

export type VideoProjectDto = {
  assets: VideoAssetDto[];
  createdAt: string;
  id: string;
  jobs: VideoJobDto[];
  revision: number;
  script: VideoProjectScriptDto | null;
  settings: VideoProjectSettingsDto;
  status: VideoProjectStatus;
  teleprompter: VideoTeleprompterDto;
  title: string;
  transcript: VideoTranscriptDto | null;
  updatedAt: string;
};

export type VideoWorkspaceDto = {
  projects: VideoProjectDto[];
  scriptOptions: VideoProjectScriptOptionDto[];
  transcriptionConfigured: boolean;
  upload: {
    acceptedMimeTypes: string[];
    configured: boolean;
    maxFiles: number;
    maxTotalBytes: number;
  };
};

export type CreateVideoProjectRequestDto = {
  captionPreset: VideoCaptionPreset;
  idempotencyKey: string;
  scriptId: string;
  title: string;
};

export type CreateVideoUploadRequestDto = {
  fileName: string;
  idempotencyKey: string;
  mimeType: string;
  origin: "recording" | "upload";
  sizeBytes: number;
};

export type StartVideoTranscriptionRequestDto = {
  idempotencyKey: string;
};

export type UpdateVideoTranscriptRequestDto = {
  revision: number;
  segments: VideoTranscriptSegmentDto[];
  status: "approved" | "draft";
};

export type VideoUploadTicketDto = {
  asset: VideoAssetDto;
  expiresAt: string;
  headers: Record<string, string>;
  method: "PUT";
  uploadUrl: string;
};

export type CompleteVideoUploadResponseDto = {
  asset: VideoAssetDto;
  project: VideoProjectDto;
};

export type VideoPlaybackTicketDto = {
  assetId: string;
  expiresAt: string;
  playbackUrl: string;
};
