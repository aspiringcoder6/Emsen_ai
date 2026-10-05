import type {
  CreateScriptRequestDto,
  ScriptAssistRequestDto,
  ScriptAssistResponseDto,
  ScriptBrainstormRequestDto,
  ScriptBrainstormResponseDto,
  ScriptDocumentDto,
  ScriptWorkspaceDto,
  UpdateScriptRequestDto,
  StoryboardAssetDto,
  UploadStoryboardAssetRequestDto,
  GenerateStoryboardImageRequestDto,
  StoryboardImageJobDto,
  StoryboardImageWorkspaceDto,
} from "@creator-flow/contracts";
import { apiRequest } from "../../lib/apiClient";

export const getScriptWorkspace = () => apiRequest<ScriptWorkspaceDto>("/scripts");
export const createScript = (body: CreateScriptRequestDto) =>
  apiRequest<ScriptDocumentDto>("/scripts", { method: "POST", body });
export const brainstormScript = (body: ScriptBrainstormRequestDto) =>
  apiRequest<ScriptBrainstormResponseDto>("/scripts/brainstorm", { method: "POST", body });
export const updateScript = (id: string, body: UpdateScriptRequestDto) =>
  apiRequest<ScriptDocumentDto>(`/scripts/${id}`, { method: "PUT", body });
export const deleteScript = (id: string) =>
  apiRequest<void>(`/scripts/${id}`, { method: "DELETE" });
export const assistScript = (id: string, body: ScriptAssistRequestDto) =>
  apiRequest<ScriptAssistResponseDto>(`/scripts/${id}/assist`, { method: "POST", body });

export const uploadStoryboardAsset = (scriptId: string, body: UploadStoryboardAssetRequestDto) =>
  apiRequest<StoryboardAssetDto>(`/scripts/${scriptId}/storyboard-assets`, { method: "POST", body });
export const getStoryboardAsset = (scriptId: string, assetId: string) =>
  apiRequest<StoryboardAssetDto>(`/scripts/${scriptId}/storyboard-assets/${assetId}`);

export const getStoryboardImageWorkspace = (scriptId: string) =>
  apiRequest<StoryboardImageWorkspaceDto>(`/scripts/${scriptId}/storyboard-images`);
export const generateStoryboardImage = (scriptId: string, body: GenerateStoryboardImageRequestDto) =>
  apiRequest<StoryboardImageJobDto>(`/scripts/${scriptId}/storyboard-images`, { method: "POST", body });
