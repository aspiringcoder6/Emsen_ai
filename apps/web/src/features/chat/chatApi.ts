import type {
  AiPreferencesDto,
  AiProactiveFrequency,
  ChatStateDto,
  SendChatMessageResponseDto,
} from "@creator-flow/contracts";
import { apiRequest } from "../../lib/apiClient";

export function getChat() {
  return apiRequest<ChatStateDto>("/chat");
}

export function sendChatMessage(content: string, currentPage: string) {
  return apiRequest<SendChatMessageResponseDto>("/chat/messages", {
    body: { content, currentPage },
    method: "POST",
  });
}

export function getAiPreferences() {
  return apiRequest<AiPreferencesDto>("/chat/preferences");
}

export function updateAiPreferences(proactiveFrequency: AiProactiveFrequency) {
  return apiRequest<AiPreferencesDto>("/chat/preferences", {
    body: { proactiveFrequency },
    method: "PUT",
  });
}
