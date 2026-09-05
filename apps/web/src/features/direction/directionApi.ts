import type { DirectionStateDto, DirectionVersionDto, GenerateDirectionRequestDto, SaveDirectionRequestDto } from "@creator-flow/contracts";
import { apiRequest } from "../../lib/apiClient";

export const getDirection = () => apiRequest<DirectionStateDto>("/direction");
export const saveDirection = (body: SaveDirectionRequestDto) => apiRequest<DirectionVersionDto>("/direction/versions", { body, method: "POST" });
export const generateDirection = (body: GenerateDirectionRequestDto) => apiRequest<DirectionVersionDto>("/direction/generate", { body, method: "POST" });
