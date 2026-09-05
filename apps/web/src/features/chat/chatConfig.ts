export const chatDraftStorageKey = "emsen.chat.draft";
export const chatOpenStorageKey = "emsen.chat.open";
export const creatorDnaUpdatedEvent = "emsen:creator-dna-updated";

export function formatChatMessageTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function clearChatStorage() {
  window.localStorage.removeItem(chatDraftStorageKey);
  window.localStorage.setItem(chatOpenStorageKey, "false");
}
