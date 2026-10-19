import type { ScriptContentDto } from "@creator-flow/contracts";
import { countSpeechUnits, speechTimingProfile, speechSlotStatus, speechUnitBudget, type SpeechTimingOptions } from "@creator-flow/contracts";

export type ScriptTimestampRange = {
  endSeconds: number;
  label: string;
  startSeconds: number;
};

const timestampPattern = /\[?(\d{1,2}):([0-5]\d)\s*[-–—]\s*(\d{1,2}):([0-5]\d)\]?/g;
const timestampWithSpacingPattern = /\[?\d{1,2}:[0-5]\d\s*[-–—]\s*\d{1,2}:[0-5]\d\]?\s*:?\s*/g;
const timestampLinePattern = /^\s*(?:(?:[-*•]|\d+[.)])\s+|#{1,6}\s+)?(?:\*{1,2})?\[?(\d{1,2}):([0-5]\d)\s*[-–—]\s*(\d{1,2}):([0-5]\d)\]?(?:\*{1,2})?\s*:?\s*(.*)$/;
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
  return countSpeechUnits(value);
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
        text: (match[5]?.trim() ?? "").replace(/^(?:\*{1,2})|(?:\*{1,2})$/g, "").trim(),
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

function cleanGeneratedSpeech(value: string) {
  return stripScriptTimestamps(value)
    .split(/\r?\n/)
    .map((line) => line
      .replace(/^\s*(?:[-*•]|\d+[.)]|#{1,6})\s+/, "")
      .replace(/\*{1,2}/g, "")
      .replace(/^\s*(?:Hook|Nội dung|CTA)\s*:\s*/iu, "")
      .trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function preferredDeliveryLabel(value: string) {
  const label = value.match(/\[(Nói trực tiếp|Thoại trực tiếp|Voice[- ]?over|Lồng tiếng)\]/iu)?.[1] ?? "";
  return /voice|lồng/iu.test(label) ? "[Voice-over]" : "[Nói trực tiếp]";
}

function spokenDuration(wordCount: number, minimum: number, maximum: number) {
  return clamp(Math.round(wordCount / speechTimingProfile().rate), minimum, maximum);
}

function serializeTimedSpeech(
  chunks: string[],
  startSeconds: number,
  endSeconds: number,
  deliveryLabel: string,
) {
  const safeChunks = chunks.length ? chunks : [""];
  const availableSeconds = Math.max(1, endSeconds - startSeconds);
  const limitedChunks = safeChunks.slice(0, availableSeconds);
  const weights = limitedChunks.map((chunk) => Math.max(1, countSpokenWords(chunk)));
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  let elapsedWeight = 0;
  let cursor = startSeconds;
  return limitedChunks.map((chunk, index) => {
    elapsedWeight += weights[index]!;
    const remaining = limitedChunks.length - index - 1;
    const proposedEnd = index === limitedChunks.length - 1
      ? endSeconds
      : startSeconds + Math.round(availableSeconds * elapsedWeight / totalWeight);
    const segmentEnd = index === limitedChunks.length - 1
      ? endSeconds
      : clamp(proposedEnd, cursor + 1, endSeconds - remaining);
    const output = `[${formatScriptTimestamp(cursor)}–${formatScriptTimestamp(segmentEnd)}] ${deliveryLabel} ${chunk}`.trim();
    cursor = segmentEnd;
    return output;
  }).join("\n");
}

/**
 * Repairs formatting/timing deterministically without inventing new claims or dialogue.
 * AI remains responsible for the words; this function only redistributes those words
 * across a continuous, flexible timeline.
 */
export function repairScriptTimeline(content: ScriptContentDto, targetDurationSeconds: number): ScriptContentDto {
  const duration = clamp(Math.round(targetDurationSeconds), 5, 3_600);
  const hookText = cleanGeneratedSpeech(content.hook);
  const bodyText = cleanGeneratedSpeech(content.body);
  const ctaText = cleanGeneratedSpeech(content.cta);
  const hookWords = countSpokenWords(hookText);
  const ctaWords = countSpokenWords(ctaText);
  const hookDuration = duration >= 12
    ? spokenDuration(hookWords, 3, 5)
    : Math.max(1, Math.min(duration - 2, Math.round(duration * 0.25)));
  const ctaDuration = duration >= 12
    ? spokenDuration(ctaWords, 3, 5)
    : Math.max(1, Math.min(duration - hookDuration - 1, Math.round(duration * 0.25)));
  const bodyStart = hookDuration;
  const bodyEnd = Math.max(bodyStart + 1, duration - ctaDuration);
  const bodySeconds = bodyEnd - bodyStart;
  const guide = buildFlexibleTimelineGuide(duration);
  const existingBeatCount = parseScriptTimestampRanges(content.body).length;
  const sentenceCount = bodyText.split(/(?<=[.!?…])\s+/).filter(Boolean).length;
  const naturalBeatCount = Math.max(sentenceCount, Math.ceil(Math.max(1, countSpokenWords(bodyText)) / 28));
  const requestedBeatCount = existingBeatCount || naturalBeatCount;
  const beatCount = clamp(
    requestedBeatCount,
    Math.min(guide.bodyBeatCount.minimum, bodySeconds),
    Math.min(guide.bodyBeatCount.maximum, bodySeconds),
  );
  const bodyChunks = splitText(bodyText, beatCount);
  return {
    ...content,
    hook: serializeTimedSpeech(
      [hookText],
      0,
      bodyStart,
      preferredDeliveryLabel(content.hook),
    ),
    body: serializeTimedSpeech(
      bodyChunks,
      bodyStart,
      bodyEnd,
      preferredDeliveryLabel(content.body),
    ),
    cta: serializeTimedSpeech(
      [ctaText],
      bodyEnd,
      duration,
      preferredDeliveryLabel(content.cta),
    ),
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

export function scriptWordBudget(targetDurationSeconds: number, options: SpeechTimingOptions = {}) {
  const duration = clamp(targetDurationSeconds, 5, 3_600);
  const total = speechUnitBudget(duration, options);
  const edge = duration >= 12
    ? { min: speechUnitBudget(3, options).min, max: speechUnitBudget(5, options).max }
    : speechUnitBudget(Math.max(1, duration * 0.25), options);
  return {
    body: {
      max: Math.max(1, total.max - edge.min * 2),
      min: Math.max(1, total.min - edge.max * 2),
    },
    cta: { ...edge }, hook: { ...edge }, total,
  };
}

/** A continuous timestamp alone cannot make a short sentence fill its time slot. */
export function scriptSpeechTimingIssues(content: ScriptContentDto, options: SpeechTimingOptions = {}) {
  return [content.hook, content.body, content.cta].flatMap((section) => parseTimedSegments(section).flatMap((segment) => {
    const slot = segment.endSeconds - segment.startSeconds;
    const timing = speechSlotStatus(segment.text, slot, options);
    if (timing.status === "balanced") return [];
    const budget = speechUnitBudget(slot, options);
    return [`Mốc ${segment.label}: ${timing.count} ${timing.unit}, đọc ước tính ${timing.minSeconds}–${timing.maxSeconds} giây nhưng được gán ${slot} giây; cần khoảng ${budget.min}–${budget.max} ${timing.unit}. ${timing.status === "long" ? "Rút gọn lời thoại hoặc chia lại nhịp." : "Phát triển thêm lời thoại có nội dung, không kéo timestamp để bù."}`];
  }));
}

export function scriptSectionSuggestionIssues(value: string, currentValue: string, options: SpeechTimingOptions = {}) {
  const segments = parseTimedSegments(value);
  const current = parseScriptTimestampRanges(currentValue);
  const issues = scriptSpeechTimingIssues({ hook: "", body: value, cta: "", storyboard: [] }, options);
  if (!segments.length) return [...issues, "Phần viết lại cần các mốc thời gian và lời thoại cụ thể."];
  if (current.length && (segments[0]!.startSeconds !== current[0]!.startSeconds || segments.at(-1)!.endSeconds !== current.at(-1)!.endSeconds)) issues.push("Giữ nguyên điểm bắt đầu và kết thúc của phần đang chỉnh; phát triển lời thoại thay vì rút thời gian.");
  segments.forEach((segment, index) => {
    if (segment.endSeconds <= segment.startSeconds || (index > 0 && segment.startSeconds !== segments[index - 1]!.endSeconds)) issues.push("Các mốc trong phần đang chỉnh phải nối tiếp, không hở hoặc chồng lấn.");
    if (!deliveryLabelAtStartPattern.test(segment.text)) issues.push("Mỗi mốc cần nhãn [Nói trực tiếp] hoặc [Voice-over].");
  });
  return [...new Set(issues)];
}

export function scriptGenerationIssues(content: ScriptContentDto, targetDurationSeconds: number, options: SpeechTimingOptions = {}) {
  const budget = scriptWordBudget(targetDurationSeconds, options);
  const unit = speechTimingProfile(options).unit;
  const hookWords = countSpokenWords(content.hook);
  const bodyWords = countSpokenWords(content.body);
  const ctaWords = countSpokenWords(content.cta);
  const totalWords = hookWords + bodyWords + ctaWords;
  const issues = [...scriptTimelineIssues(content, targetDurationSeconds), ...scriptSpeechTimingIssues(content, options)];
  if (totalWords < budget.total.min) issues.push(`Tổng lời thoại có ${totalWords} ${unit}; cần ít nhất ${budget.total.min} ${unit} cho ${targetDurationSeconds} giây.`);
  if (totalWords > budget.total.max) issues.push(`Tổng lời thoại có ${totalWords} ${unit}; nên tối đa ${budget.total.max} ${unit} cho ${targetDurationSeconds} giây.`);
  if (bodyWords < budget.body.min) issues.push(`Phần nội dung có ${bodyWords} ${unit}; cần ít nhất ${budget.body.min} ${unit}.`);
  if (bodyWords > budget.body.max) issues.push(`Phần nội dung có ${bodyWords} ${unit}; nên tối đa ${budget.body.max} ${unit}.`);
  if (hookWords < budget.hook.min) issues.push(`Hook cần ít nhất ${budget.hook.min} ${unit}.`);
  if (hookWords > budget.hook.max) issues.push(`Hook nên tối đa ${budget.hook.max} ${unit} để giữ trong 3–5 giây.`);
  if (ctaWords < budget.cta.min) issues.push(`CTA cần ít nhất ${budget.cta.min} ${unit}.`);
  if (ctaWords > budget.cta.max) issues.push(`CTA nên tối đa ${budget.cta.max} ${unit} để giữ trong 3–5 giây.`);
  return issues;
}

/**
 * Reject misleading timing after the bounded repair attempt; never pad a short
 * script by stretching timestamps and present it as a complete timed script.
 */
export function scriptGenerationBlockingIssues(content: ScriptContentDto, targetDurationSeconds: number, options: SpeechTimingOptions = {}) {
  const budget = scriptWordBudget(targetDurationSeconds, options);
  const unit = speechTimingProfile(options).unit;
  const hookWords = countSpokenWords(content.hook);
  const bodyWords = countSpokenWords(content.body);
  const ctaWords = countSpokenWords(content.cta);
  const totalWords = hookWords + bodyWords + ctaWords;
  const issues = [...scriptTimelineIssues(content, targetDurationSeconds), ...scriptSpeechTimingIssues(content, options)];
  const minimumUsableTotal = Math.max(6, Math.ceil(budget.total.min * 0.95));
  const minimumUsableBody = Math.max(4, Math.ceil(budget.body.min * 0.7));
  const maximumUsableTotal = Math.ceil(budget.total.max * 1.35);
  if (totalWords < minimumUsableTotal) {
    issues.push(`Kịch bản chỉ có ${totalWords} ${unit}, dưới mức tối thiểu có thể sử dụng là ${minimumUsableTotal} ${unit}.`);
  }
  if (totalWords > maximumUsableTotal) {
    issues.push(`Kịch bản có ${totalWords} ${unit}, vượt mức tối đa có thể sử dụng là ${maximumUsableTotal} ${unit}.`);
  }
  if (bodyWords < minimumUsableBody) {
    issues.push(`Phần nội dung chỉ có ${bodyWords} ${unit}, dưới mức tối thiểu có thể sử dụng là ${minimumUsableBody} ${unit}.`);
  }
  if (hookWords < Math.max(2, Math.floor(budget.hook.min * 0.5))) {
    issues.push("Hook chưa có đủ lời thoại để sử dụng.");
  }
  if (ctaWords < Math.max(2, Math.floor(budget.cta.min * 0.5))) {
    issues.push("CTA chưa có đủ lời thoại để sử dụng.");
  }
  const spokenText = [content.hook, content.body, content.cta].map(stripScriptTimestamps).join(" ");
  if (/\b(?:tâm sự thật lòng|nói thêm ở đây|viết thêm ở đây|điền nội dung|placeholder)\b/iu.test(spokenText)) {
    issues.push("Kịch bản còn chứa câu giữ chỗ thay vì lời thoại hoàn chỉnh.");
  }
  return [...new Set(issues)];
}
