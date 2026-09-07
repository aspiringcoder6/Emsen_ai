import type {
  CreateScriptRequestDto,
  ScriptAssistRequestDto,
  ScriptAssistResponseDto,
  ScriptDocumentDto,
  ScriptWorkspaceDto,
  UpdateScriptRequestDto,
} from "@creator-flow/contracts";
import { apiRequest } from "../../lib/apiClient";

export const getScriptWorkspace = () => apiRequest<ScriptWorkspaceDto>("/scripts");
export const createScript = (body: CreateScriptRequestDto) =>
  apiRequest<ScriptDocumentDto>("/scripts", { method: "POST", body });
export const updateScript = (id: string, body: UpdateScriptRequestDto) =>
  apiRequest<ScriptDocumentDto>(`/scripts/${id}`, { method: "PUT", body });
export const assistScript = (id: string, body: ScriptAssistRequestDto) =>
  apiRequest<ScriptAssistResponseDto>(`/scripts/${id}/assist`, { method: "POST", body });
