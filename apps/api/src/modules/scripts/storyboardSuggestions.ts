import type { ScriptStoryboardFrameDto } from "@creator-flow/contracts";
import { HttpError } from "../../shared/http.js";

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
