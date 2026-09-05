import type {
  CreateCreatorDnaSignalRequestDto,
  CreatorDnaProfileDto,
  CreatorDnaStateDto,
  SaveCreatorDnaOnboardingRequestDto,
} from "@creator-flow/contracts";
import { apiRequest } from "../../lib/apiClient";

export function getCreatorDna() {
  return apiRequest<CreatorDnaStateDto>("/creator-dna");
}

export function saveCreatorDnaOnboarding(input: SaveCreatorDnaOnboardingRequestDto) {
  return apiRequest<CreatorDnaStateDto>("/creator-dna/onboarding", {
    body: input,
    method: "PUT",
  });
}

export function completeCreatorDnaOnboarding(profile: CreatorDnaProfileDto) {
  return apiRequest<CreatorDnaStateDto>("/creator-dna/onboarding/complete", {
    body: { profile },
    method: "POST",
  });
}

export function createCreatorDnaSignal(input: CreateCreatorDnaSignalRequestDto) {
  return apiRequest<CreatorDnaStateDto>("/creator-dna/signals", {
    body: input,
    method: "POST",
  });
}

export function removeCreatorDnaSignal(signalId: string) {
  return apiRequest<CreatorDnaStateDto>(`/creator-dna/signals/${signalId}`, {
    method: "DELETE",
  });
}
