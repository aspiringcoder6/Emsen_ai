import { stripTimelineTimestamps } from "./scriptTimeline";

export const scriptDurationPresets = [15, 30, 45, 60] as const;

export function recommendedScriptWords(durationSeconds: number) {
  const anchors = [
    { seconds: 15, min: 35, max: 50 },
    { seconds: 30, min: 70, max: 90 },
    { seconds: 45, min: 100, max: 130 },
    { seconds: 60, min: 130, max: 170 },
  ];
  if (durationSeconds <= anchors[0]!.seconds) {
    return {
      min: Math.round(durationSeconds * anchors[0]!.min / anchors[0]!.seconds),
      max: Math.round(durationSeconds * anchors[0]!.max / anchors[0]!.seconds),
    };
  }
  for (let index = 1; index < anchors.length; index += 1) {
    const previous = anchors[index - 1]!;
    const next = anchors[index]!;
    if (durationSeconds <= next.seconds) {
      const progress = (durationSeconds - previous.seconds) / (next.seconds - previous.seconds);
      return {
        min: Math.round(previous.min + (next.min - previous.min) * progress),
        max: Math.round(previous.max + (next.max - previous.max) * progress),
      };
    }
  }
  return {
    min: Math.round(130 + (durationSeconds - 60) * 2.15),
    max: Math.round(170 + (durationSeconds - 60) * 2.8),
  };
}

export function countScriptWords(parts: string[]) {
  return parts.map(stripTimelineTimestamps).join(" ").trim().split(/\s+/).filter(Boolean).length;
}
