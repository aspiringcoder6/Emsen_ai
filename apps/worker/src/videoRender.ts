import { access, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  createEditedVideo,
  runFfmpeg,
  type KeptInterval,
  type PreviewCutDecision,
  type PreviewSourceAsset,
} from "./videoPreview.js";

export type RenderSettings = {
  captionAccentColor: string;
  captionPosition: "center" | "lower-third";
  captionPreset: "emsen-clean" | "none";
  captionTextColor: string;
  renderSettingsRevision: number;
  showBrandMark: boolean;
};

export type RenderTranscriptSegment = {
  endSeconds: number;
  startSeconds: number;
  text: string;
};

export type TimedCaption = {
  endSeconds: number;
  startSeconds: number;
  text: string;
};

const round = (value: number) => Math.round(value * 1_000) / 1_000;

function splitCaptionText(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current: string[] = [];
  for (const word of words) {
    const candidate = [...current, word].join(" ");
    if (current.length && (current.length >= 7 || candidate.length > 36)) {
      chunks.push(current.join(" "));
      current = [word];
    } else {
      current.push(word);
    }
  }
  if (current.length) chunks.push(current.join(" "));
  return chunks;
}

export function remapCaptionSegments(
  segments: RenderTranscriptSegment[],
  intervals: KeptInterval[],
): TimedCaption[] {
  const captions: TimedCaption[] = [];
  let outputOffset = 0;
  for (const interval of intervals) {
    for (const segment of segments) {
      const startSeconds = Math.max(interval.startSeconds, Number(segment.startSeconds));
      const endSeconds = Math.min(interval.endSeconds, Number(segment.endSeconds));
      if (!segment.text.trim() || endSeconds - startSeconds < 0.08) continue;
      const mappedStart = outputOffset + startSeconds - interval.startSeconds;
      const mappedEnd = outputOffset + endSeconds - interval.startSeconds;
      const chunks = splitCaptionText(segment.text);
      const weights = chunks.map((chunk) => Math.max(1, chunk.split(/\s+/).length));
      const totalWeight = weights.reduce((total, value) => total + value, 0);
      let cursor = mappedStart;
      chunks.forEach((chunk, index) => {
        const isLast = index === chunks.length - 1;
        const chunkEnd = isLast
          ? mappedEnd
          : cursor + (mappedEnd - mappedStart) * (weights[index]! / totalWeight);
        captions.push({
          endSeconds: round(chunkEnd),
          startSeconds: round(cursor),
          text: chunk,
        });
        cursor = chunkEnd;
      });
    }
    outputOffset += interval.endSeconds - interval.startSeconds;
  }
  return captions.sort((left, right) => left.startSeconds - right.startSeconds);
}

function assColor(value: string, fallback: string) {
  const color = /^#[0-9a-f]{6}$/i.test(value) ? value.slice(1) : fallback;
  return `&H00${color.slice(4, 6)}${color.slice(2, 4)}${color.slice(0, 2)}`.toUpperCase();
}

function assTime(seconds: number) {
  const centiseconds = Math.max(0, Math.round(seconds * 100));
  const hours = Math.floor(centiseconds / 360_000);
  const minutes = Math.floor((centiseconds % 360_000) / 6_000);
  const remainingSeconds = Math.floor((centiseconds % 6_000) / 100);
  const fraction = centiseconds % 100;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}.${String(fraction).padStart(2, "0")}`;
}

function assText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replace(/\r?\n/g, "\\N");
}

export function createAssDocument(captions: TimedCaption[], settings: RenderSettings) {
  const alignment = settings.captionPosition === "center" ? 5 : 2;
  const marginV = settings.captionPosition === "center" ? 0 : 210;
  const events = captions.map((caption) =>
    `Dialogue: 0,${assTime(caption.startSeconds)},${assTime(caption.endSeconds)},Emsen,,0,0,0,,${assText(caption.text)}`,
  );
  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 720",
    "PlayResY: 1280",
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "YCbCr Matrix: TV.709",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Emsen,Arial,54,${assColor(settings.captionTextColor, "FFFFFF")},${assColor(settings.captionAccentColor, "A8D694")},${assColor(settings.captionAccentColor, "A8D694")},&H9A142218,-1,0,0,0,100,100,0,0,3,3,0,${alignment},46,46,${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...events,
    "",
  ].join("\n");
}

function escapeFilterPath(value: string) {
  return value
    .replaceAll("\\", "/")
    .replace(":", "\\:")
    .replaceAll("'", "\\'");
}

export async function findBrandMarkPath() {
  const path = fileURLToPath(new URL("../../web/public/Avatar.png", import.meta.url));
  try {
    await access(path);
    return path;
  } catch {
    return null;
  }
}

export async function createFinalVideo(
  assets: PreviewSourceAsset[],
  decisions: PreviewCutDecision[],
  transcript: RenderTranscriptSegment[],
  settings: RenderSettings,
  paths: {
    brandMarkPath: string | null;
    editedPath: string;
    normalizedPath: string;
    outputPath: string;
    subtitlePath: string;
  },
  onProgress: (progress: number) => Promise<void>,
) {
  const edited = await createEditedVideo(
    assets,
    decisions,
    paths.normalizedPath,
    paths.editedPath,
    onProgress,
    {
      audioBitrate: "160k",
      cutProgress: { start: 47, end: 68 },
      height: 1280,
      normalizeCrf: 24,
      normalizeProgress: { start: 25, end: 47 },
      outputCrf: 24,
      preset: "faster",
      width: 720,
    },
  );
  const captions = settings.captionPreset === "emsen-clean"
    ? remapCaptionSegments(transcript, edited.intervals)
    : [];
  if (captions.length) {
    await writeFile(paths.subtitlePath, createAssDocument(captions, settings), "utf8");
  }

  const includeBrand = settings.showBrandMark && Boolean(paths.brandMarkPath);
  const inputs = ["-i", paths.editedPath];
  if (includeBrand) {
    inputs.push("-framerate", "30", "-loop", "1", "-i", paths.brandMarkPath!);
  }
  const filters: string[] = [];
  if (captions.length) {
    filters.push(`[0:v]ass=filename='${escapeFilterPath(paths.subtitlePath)}'[captioned]`);
  } else {
    filters.push("[0:v]null[captioned]");
  }
  if (includeBrand) {
    filters.push("[1:v]scale=112:112:force_original_aspect_ratio=decrease,format=rgba,colorchannelmixer=aa=0.88[brand]");
    filters.push("[captioned][brand]overlay=W-w-28:28:shortest=1[vout]");
  } else {
    filters.push("[captioned]null[vout]");
  }
  await runFfmpeg([
    ...inputs,
    "-filter_complex", filters.join(";"),
    "-map", "[vout]", "-map", "0:a:0",
    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
    "-c:v", "libx264", "-preset", "medium", "-crf", "22",
    "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
    "-movflags", "+faststart", "-pix_fmt", "yuv420p", "-shortest", paths.outputPath,
  ], edited.durationSeconds, onProgress, { start: 68, end: 94 });
  return {
    captionCount: captions.length,
    durationSeconds: edited.durationSeconds,
    intervalCount: edited.intervalCount,
  };
}
