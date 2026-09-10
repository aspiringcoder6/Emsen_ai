import type { ContentPlanStateDto, ContentPlanVersionDto, GenerateContentPlanRequestDto, SaveContentPlanRequestDto } from "@creator-flow/contracts";
import { apiRequest } from "../../lib/apiClient";
export const getContentPlan = (selector?: string | { planId?: string; weekStart?: string }) => {
  const normalized = typeof selector === "string" ? { weekStart: selector } : selector;
  const query = new URLSearchParams();
  if (normalized?.planId) query.set("planId", normalized.planId);
  if (normalized?.weekStart) query.set("weekStart", normalized.weekStart);
  return apiRequest<ContentPlanStateDto>(`/content-plan${query.size ? `?${query.toString()}` : ""}`);
};
export const generateContentPlan = (body: GenerateContentPlanRequestDto) => apiRequest<ContentPlanVersionDto>("/content-plan/generate", { method: "POST", body });
export const saveContentPlan = (body: SaveContentPlanRequestDto) => apiRequest<ContentPlanVersionDto>("/content-plan/versions", { method: "POST", body });
