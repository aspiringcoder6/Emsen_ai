import type { ScriptStoryboardFrameDto } from "@creator-flow/contracts";
import { spokenScriptText, speechSlotStatus, type SpeechTimingOptions, type ScriptContentDto } from "@creator-flow/contracts";
import { HttpError } from "../../shared/http.js";

function dialogueKey(text: string) {
  return spokenScriptText(text).normalize("NFC").toLocaleLowerCase("vi-VN").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Validate the merged board so protected scenes cannot silently add time or
 * leave holes in the approved dialogue. No AI rewrite may shorten the script. */
export function storyboardSuggestionIssues(content: ScriptContentDto, frames: ScriptStoryboardFrameDto[], targetDurationSeconds: number, existing: ScriptStoryboardFrameDto[] = [], timingOptions: SpeechTimingOptions = {}) {
  const issues: string[] = [];
  if (!frames.length || frames.some((frame) => frame.durationSeconds <= 0)) issues.push("Mỗi cảnh cần thời lượng lớn hơn 0 giây.");
  const total = frames.reduce((sum, frame) => sum + frame.durationSeconds, 0);
  if (total !== targetDurationSeconds) issues.push(`Tổng các cảnh là ${total} giây, phải bằng ${targetDurationSeconds} giây sau khi giữ các cảnh đã khóa/minh họa.`);
  if (dialogueKey(frames.map((frame) => frame.dialogue).join(" ")) !== dialogueKey([content.hook, content.body, content.cta].join(" "))) issues.push("Lời thoại các cảnh phải khớp toàn bộ Hook → Nội dung → CTA theo đúng thứ tự, không tóm tắt, thêm, bỏ hoặc lặp câu. Có thể chia một đoạn thoại qua nhiều cảnh.");
  frames.forEach((frame, index) => {
    if (existing.some((current) => current.id === frame.id && current.locked)) return;
    const timing = speechSlotStatus(frame.dialogue, frame.durationSeconds, timingOptions);
    if (timing.status === "short" || timing.status === "long") issues.push(`Cảnh ${index + 1}: thoại đọc ước tính ${timing.minSeconds}–${timing.maxSeconds} giây nhưng cảnh dài ${frame.durationSeconds} giây. Chia lại thời lượng/shot; phần hành động không thoại phải thành shot riêng có chỉ dẫn cụ thể, không kéo thời gian đọc.`);
    if (!frame.visual.trim() || !frame.direction.trim() || !frame.shotSize?.trim() || !frame.cameraAngle?.trim() || !frame.cameraMovement?.trim() || !frame.setup?.trim()) issues.push(`Cảnh ${index + 1} cần hành động nhìn thấy được, chỉ dẫn thao tác, cỡ cảnh, góc máy, chuyển động và chuẩn bị quay cụ thể.`);
  });
  return issues;
}

/** AI may change shooting notes but never discard visual work already chosen by the creator. */
export function mergeStoryboardSuggestions(existing: ScriptStoryboardFrameDto[], suggested: ScriptStoryboardFrameDto[]) {
  const byId = new Map(existing.map((frame) => [frame.id, frame]));
  const merged = suggested.map((frame) => {
    const current = byId.get(frame.id);
    if (!current) return frame;
    if (current.locked) return current;
    return { ...frame, illustrationAssetId: current.illustrationAssetId ?? null, ...(current.onScreenText ? { onScreenText: current.onScreenText } : {}), locked: current.locked ?? false };
  });
  existing.forEach((frame, index) => {
    if ((frame.locked || frame.illustrationAssetId || frame.onScreenText?.text) && !merged.some((entry) => entry.id === frame.id)) merged.splice(Math.min(index, merged.length), 0, frame);
  });
  if (merged.length > 16) throw new HttpError(422, "STORYBOARD_SCENE_LIMIT", "Đề xuất có quá nhiều cảnh để giữ nguyên các cảnh đã minh họa. Hãy yêu cầu chỉnh các cảnh hiện có.");
  return merged;
}
