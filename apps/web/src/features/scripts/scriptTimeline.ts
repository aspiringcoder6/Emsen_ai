export type EditableTimelineSegment = {
  endSeconds: number;
  label: string;
  startSeconds: number;
  text: string;
};

const linePattern = /^\s*\[?(\d{1,2}):([0-5]\d)\s*[-–—]\s*(\d{1,2}):([0-5]\d)\]?\s*:?\s*(.*)$/;
const inlinePattern = /\[?\d{1,2}:[0-5]\d\s*[-–—]\s*\d{1,2}:[0-5]\d\]?\s*:?\s*/g;
const deliveryLabelPattern = /\[(?:Nói trực tiếp|Thoại trực tiếp|Voice[- ]?over|Lồng tiếng)\]\s*/giu;

function toSeconds(minutes: string, seconds: string) {
  return Number(minutes) * 60 + Number(seconds);
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function parseTimelineText(value: string): EditableTimelineSegment[] {
  const segments: EditableTimelineSegment[] = [];
  let current: EditableTimelineSegment | null = null;
  let hasContentBeforeTimeline = false;

  for (const line of value.split(/\r?\n/)) {
    const match = line.match(linePattern);
    if (match) {
      const startSeconds = toSeconds(match[1]!, match[2]!);
      const endSeconds = toSeconds(match[3]!, match[4]!);
      if (endSeconds <= startSeconds) return [];
      current = {
        endSeconds,
        label: `${formatTime(startSeconds)}–${formatTime(endSeconds)}`,
        startSeconds,
        text: match[5]?.trim() ?? "",
      };
      segments.push(current);
    } else if (line.trim()) {
      if (!current) hasContentBeforeTimeline = true;
      else current.text = `${current.text}${current.text ? "\n" : ""}${line.trim()}`;
    }
  }

  return hasContentBeforeTimeline ? [] : segments;
}

export function serializeTimelineText(segments: EditableTimelineSegment[]) {
  return segments
    .map((segment) => `[${segment.label}] ${segment.text.trim()}`.trimEnd())
    .join("\n");
}

export function stripTimelineTimestamps(value: string) {
  return value.replace(inlinePattern, "").replace(deliveryLabelPattern, "").trim();
}
