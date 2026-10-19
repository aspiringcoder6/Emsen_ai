import { countSpeechUnits, speechUnitBudget, type SpeechTimingOptions } from "@creator-flow/contracts";

export const scriptDurationPresets = [15, 30, 45, 60] as const;

export function recommendedScriptWords(durationSeconds: number, options: SpeechTimingOptions = {}) {
  return speechUnitBudget(durationSeconds, options);
}

export function countScriptWords(parts: string[]) {
  return countSpeechUnits(parts.join(" "));
}
