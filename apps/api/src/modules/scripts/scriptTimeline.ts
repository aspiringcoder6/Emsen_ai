import type { ScriptContentDto } from "@creator-flow/contracts";

export type ScriptTimestampRange = {
  endSeconds: number;
  label: string;
  startSeconds: number;
};

const timestampPattern = /\[?(\d{1,2}):([0-5]\d)\s*[-–—]\s*(\d{1,2}):([0-5]\d)\]?/g;
const timestampWithSpacingPattern = /\[?\d{1,2}:[0-5]\d\s*[-–—]\s*\d{1,2}:[0-5]\d\]?\s*:?\s*/g;
const timestampLinePattern = /^\s*\[?(\d{1,2}):([0-5]\d)\s*[-–—]\s*(\d{1,2}):([0-5]\d)\]?\s*:?\s*(.*)$/;
const deliveryLabelPattern = /\[(?:Nói trực tiếp|Thoại trực tiếp|Voice[- ]?over|Lồng tiếng)\]\s*/giu;
const deliveryLabelAtStartPattern = /^\s*\[(?:Nói trực tiếp|Thoại trực tiếp|Voice[- ]?over|Lồng tiếng)\]/iu;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function formatScriptTimestamp(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function range(startSeconds: number, endSeconds: number): ScriptTimestampRange {
  return {
    endSeconds,
    label: `${formatScriptTimestamp(startSeconds)}–${formatScriptTimestamp(endSeconds)}`,
    startSeconds,
  };
}

export function parseScriptTimestampRanges(value: string) {
  return [...value.matchAll(timestampPattern)].map((match) => range(
    Number(match[1]) * 60 + Number(match[2]),
    Number(match[3]) * 60 + Number(match[4]),
  ));
}

export function buildFlexibleTimelineGuide(targetDurationSeconds: number) {
  const duration = clamp(Math.round(targetDurationSeconds), 5, 3_600);
  return {
    bodyBeatCount: duration < 20
      ? { maximum: 3, minimum: 1 }
      : duration <= 60
        ? { maximum: 6, minimum: 2 }
        : { maximum: 8, minimum: 3 },
    constraints: [
      "Bắt đầu tại 0:00 và kết thúc đúng thời lượng mục tiêu.",
      "Các mốc nối tiếp nhau, không chồng lấn và không để khoảng trống.",
      "Độ dài mỗi mốc tỷ lệ với lượng lời thoại và có thể khác nhau.",
      "Tách mốc tại chỗ đổi ý, đổi cảm xúc, đổi cảnh hoặc chuyển vai trò nội dung.",
      "Hook kéo dài 3–5 giây và CTA kéo dài 3–5 giây với video từ 12 giây trở lên.",
      "Mỗi mốc ghi rõ [Nói trực tiếp] hoặc [Voice-over] ngay sau timestamp.",
    ],
    note: "Ngoài khung 3–5 giây cho Hook và CTA, không có tỷ lệ cố định; hãy chọn nhịp nội dung phù hợp chính kịch bản này.",
    targetDurationSeconds: duration,
  };
}

export function stripScriptTimestamps(value: string) {
  return value
    .replace(timestampWithSpacingPattern, "")
    .replace(deliveryLabelPattern, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countSpokenWords(value: string) {
  return stripScriptTimestamps(value).split(/\s+/).filter(Boolean).length;
}

type TimedSegment = ScriptTimestampRange & { text: string };

function parseTimedSegments(value: string): TimedSegment[] {
  const segments: TimedSegment[] = [];
  let current: TimedSegment | null = null;
  let hasTextBeforeFirstTimestamp = false;
  for (const line of value.split(/\r?\n/)) {
    const match = line.match(timestampLinePattern);
    if (match) {
      current = {
        ...range(
          Number(match[1]) * 60 + Number(match[2]),
          Number(match[3]) * 60 + Number(match[4]),
        ),
        text: match[5]?.trim() ?? "",
      };
      segments.push(current);
    } else if (line.trim()) {
      if (!current) hasTextBeforeFirstTimestamp = true;
      else current.text = `${current.text}${current.text ? "\n" : ""}${line.trim()}`;
    }
  }
  return hasTextBeforeFirstTimestamp ? [] : segments;
}

function serializeSegments(segments: TimedSegment[]) {
  return segments.map((segment) => `[${segment.label}] ${segment.text.trim()}`.trimEnd()).join("\n");
}

export function normalizeScriptTimestampFormatting(value: string) {
  const segments = parseTimedSegments(value);
  return segments.length ? serializeSegments(segments) : value.trim();
}

export function normalizeScriptTimeline(content: ScriptContentDto): ScriptContentDto {
  return {
    ...content,
    hook: normalizeScriptTimestampFormatting(content.hook),
    body: normalizeScriptTimestampFormatting(content.body),
    cta: normalizeScriptTimestampFormatting(content.cta),
  };
}

function splitText(value: string, count: number) {
  const clean = stripScriptTimestamps(value);
  if (!clean || count <= 1) return [clean];
  const sentences = clean.split(/(?<=[.!?…])\s+|\n+/).map((entry) => entry.trim()).filter(Boolean);
  const units = sentences.length >= count ? sentences : clean.split(/\s+/).filter(Boolean);
  const chunkCount = Math.min(count, units.length);
  return Array.from({ length: chunkCount }, (_, index) => {
    const start = Math.floor(units.length * index / chunkCount);
    const end = Math.floor(units.length * (index + 1) / chunkCount);
    return units.slice(start, Math.max(start + 1, end)).join(" ").trim();
  });
}

export function preserveOrApplySectionTimeline(value: string, currentValue: string) {
  if (parseTimedSegments(value).length) return normalizeScriptTimestampFormatting(value);
  const ranges = parseScriptTimestampRanges(currentValue);
  if (!ranges.length) return value.trim();
  const chunks = splitText(value, ranges.length);
  return ranges.slice(0, chunks.length).map((entry, index) =>
    `[${entry.label}] ${chunks[index] ?? ""}`.trimEnd(),
  ).join("\n");
}

export function scriptTimelineIssues(content: ScriptContentDto, targetDurationSeconds: number) {
  const duration = clamp(Math.round(targetDurationSeconds), 5, 3_600);
  const hook = parseScriptTimestampRanges(content.hook);
  const body = parseScriptTimestampRanges(content.body);
  const cta = parseScriptTimestampRanges(content.cta);
  const hookSegments = parseTimedSegments(content.hook);
  const bodySegments = parseTimedSegments(content.body);
  const ctaSegments = parseTimedSegments(content.cta);
  const issues: string[] = [];
  if (!hook.length) issues.push("Hook chưa có timestamp.");
  if (!body.length) issues.push("Nội dung chưa được chia theo timestamp.");
  if (!cta.length) issues.push("CTA chưa có timestamp.");
  if (!hook.length || !body.length || !cta.length) return issues;
  if (hookSegments.length !== hook.length || bodySegments.length !== body.length || ctaSegments.length !== cta.length) {
    issues.push("Mỗi timestamp phải nằm ở đầu một dòng lời thoại.");
  }
  if ([...hookSegments, ...bodySegments, ...ctaSegments].some((segment) => !segment.text.trim())) {
    issues.push("Mỗi mốc thời gian cần có lời thoại cụ thể.");
  }
  if ([...hookSegments, ...bodySegments, ...ctaSegments].some((segment) => !deliveryLabelAtStartPattern.test(segment.text))) {
    issues.push("Mỗi mốc thời gian cần ghi rõ [Nói trực tiếp] hoặc [Voice-over].");
  }

  const all = [...hook, ...body, ...cta];
  if (all[0]!.startSeconds !== 0) issues.push("Timeline phải bắt đầu tại 0:00.");
  if (all.at(-1)!.endSeconds !== duration) {
    issues.push(`Timeline phải kết thúc đúng tại ${formatScriptTimestamp(duration)}.`);
  }
  all.forEach((entry, index) => {
    if (entry.endSeconds <= entry.startSeconds) issues.push(`Mốc ${entry.label} không hợp lệ.`);
    const previous = all[index - 1];
    if (previous && entry.startSeconds !== previous.endSeconds) {
      issues.push(`Timeline bị hở hoặc chồng lấn giữa ${previous.label} và ${entry.label}.`);
    }
  });
  if (duration >= 12) {
    const hookDuration = hook.at(-1)!.endSeconds - hook[0]!.startSeconds;
    const ctaDuration = cta.at(-1)!.endSeconds - cta[0]!.startSeconds;
    if (hookDuration < 3 || hookDuration > 5) {
      issues.push(`Hook cần kéo dài 3–5 giây; hiện tại là ${hookDuration} giây.`);
    }
    if (ctaDuration < 3 || ctaDuration > 5) {
      issues.push(`CTA cần kéo dài 3–5 giây; hiện tại là ${ctaDuration} giây.`);
    }
  }
  if (duration >= 30 && body.length < 2) {
    issues.push("Nội dung chính cần ít nhất hai nhịp có timestamp cho video từ 30 giây.");
  }
  return [...new Set(issues)];
}

export function scriptWordBudget(targetDurationSeconds: number) {
  const duration = clamp(targetDurationSeconds, 5, 3_600);
  const totalMin = duration <= 15
    ? Math.round(duration * 35 / 15)
    : duration <= 30
      ? Math.round(35 + (duration - 15) * 35 / 15)
      : duration <= 45
        ? Math.round(70 + (duration - 30) * 30 / 15)
        : duration <= 60
          ? Math.round(100 + (duration - 45) * 30 / 15)
          : Math.round(130 + (duration - 60) * 2.15);
  const totalMax = duration <= 15
    ? Math.round(duration * 50 / 15)
    : duration <= 30
      ? Math.round(50 + (duration - 15) * 40 / 15)
      : duration <= 45
        ? Math.round(90 + (duration - 30) * 40 / 15)
        : duration <= 60
          ? Math.round(130 + (duration - 45) * 40 / 15)
          : Math.round(170 + (duration - 60) * 2.8);
  const hookMin = duration >= 12 ? 6 : Math.max(3, Math.round(totalMin * 0.04));
  const ctaMin = duration >= 12 ? 5 : Math.max(3, Math.round(totalMin * 0.04));
  return {
    body: {
      max: Math.max(15, Math.round(totalMax * 0.9)),
      min: Math.max(8, Math.round(totalMin * 0.55)),
    },
    cta: { max: duration >= 12 ? 16 : Math.max(8, Math.round(totalMax * 0.25)), min: ctaMin },
    hook: { max: duration >= 12 ? 15 : Math.max(8, Math.round(totalMax * 0.3)), min: hookMin },
    total: { max: totalMax, min: totalMin },
  };
}

export function scriptGenerationIssues(content: ScriptContentDto, targetDurationSeconds: number) {
  const budget = scriptWordBudget(targetDurationSeconds);
  const hookWords = countSpokenWords(content.hook);
  const bodyWords = countSpokenWords(content.body);
  const ctaWords = countSpokenWords(content.cta);
  const totalWords = hookWords + bodyWords + ctaWords;
  const issues = scriptTimelineIssues(content, targetDurationSeconds);
  if (totalWords < budget.total.min) issues.push(`Tổng lời thoại có ${totalWords} từ; cần ít nhất ${budget.total.min} từ cho ${targetDurationSeconds} giây.`);
  if (totalWords > budget.total.max) issues.push(`Tổng lời thoại có ${totalWords} từ; nên tối đa ${budget.total.max} từ cho ${targetDurationSeconds} giây.`);
  if (bodyWords < budget.body.min) issues.push(`Phần nội dung có ${bodyWords} từ; cần ít nhất ${budget.body.min} từ.`);
  if (bodyWords > budget.body.max) issues.push(`Phần nội dung có ${bodyWords} từ; nên tối đa ${budget.body.max} từ.`);
  if (hookWords < budget.hook.min) issues.push(`Hook cần ít nhất ${budget.hook.min} từ.`);
  if (hookWords > budget.hook.max) issues.push(`Hook nên tối đa ${budget.hook.max} từ để giữ trong 3–5 giây.`);
  if (ctaWords < budget.cta.min) issues.push(`CTA cần ít nhất ${budget.cta.min} từ.`);
  if (ctaWords > budget.cta.max) issues.push(`CTA nên tối đa ${budget.cta.max} từ để giữ trong 3–5 giây.`);
  return issues;
}
