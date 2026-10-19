/** Estimates for planning a read-through, not measured audio durations. Vietnamese
 * space-delimited units are syllables (tiếng), not English-style words. */
export type SpeechTimingOptions = { pacing?: "slow" | "balanced" | "fast"; language?: string };

export function spokenScriptText(value: string) {
  return value
    .replace(/\[?\d{1,2}:[0-5]\d\s*[-–—]\s*\d{1,2}:[0-5]\d\]?\s*:?\s*/g, "")
    .replace(/\[[^\]\n]*\]/g, "")
    .replace(/^(?:\s*(?:[-*•]|\d+[.)]|#{1,6})\s+|\s*(?:Hook|Nội dung|CTA)\s*:\s*)/gimu, "")
    .replace(/[*_]/g, "").replace(/\s+/g, " ").trim();
}

export function countSpeechUnits(value: string) {
  return spokenScriptText(value).split(/\s+/).filter((unit) => /[\p{L}\p{N}]/u.test(unit)).length;
}

export function speechTimingProfile(options: SpeechTimingOptions = {}) {
  const vietnamese = !options.language || /vi(?:et|ệt)?|vietnam/i.test(options.language);
  const rate = (vietnamese ? { slow: 3.7, balanced: 4.5, fast: 5.2 } : { slow: 2, balanced: 2.5, fast: 3 })[options.pacing ?? "balanced"];
  return { rate, unit: vietnamese ? "tiếng" : "từ", minRate: rate * 0.88, maxRate: rate * 1.12 };
}

export function speechUnitBudget(seconds: number, options: SpeechTimingOptions = {}) {
  const { minRate, maxRate } = speechTimingProfile(options);
  return { min: Math.ceil(Math.max(0, seconds) * minRate), max: Math.floor(Math.max(0, seconds) * maxRate) };
}

export function estimateSpeech(value: string, options: SpeechTimingOptions = {}) {
  const count = countSpeechUnits(value);
  const profile = speechTimingProfile(options);
  return { count, unit: profile.unit, seconds: count / profile.rate,
    minSeconds: count ? Math.max(1, Math.floor(count / profile.maxRate)) : 0,
    maxSeconds: count ? Math.max(1, Math.ceil(count / profile.minRate)) : 0 };
}

export function speechSlotStatus(value: string, seconds: number, options: SpeechTimingOptions = {}) {
  const estimate = estimateSpeech(value, options);
  return { ...estimate, status: !estimate.count ? "silent" as const
    : estimate.seconds < seconds * 0.72 ? "short" as const
      : estimate.seconds > seconds * 1.3 ? "long" as const : "balanced" as const };
}
