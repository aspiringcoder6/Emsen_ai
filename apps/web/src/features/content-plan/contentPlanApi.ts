import type { ContentPlanStateDto, ContentPlanVersionDto, GenerateContentPlanRequestDto, SaveContentPlanRequestDto } from "@creator-flow/contracts";
import { apiRequest } from "../../lib/apiClient";
export const getContentPlan = (weekStart: string) => apiRequest<ContentPlanStateDto>(`/content-plan?weekStart=${encodeURIComponent(weekStart)}`);
export const generateContentPlan = (body: GenerateContentPlanRequestDto) => apiRequest<ContentPlanVersionDto>("/content-plan/generate", { method: "POST", body });
export const saveContentPlan = (body: SaveContentPlanRequestDto) => apiRequest<ContentPlanVersionDto>("/content-plan/versions", { method: "POST", body });
