import { spawn } from "node:child_process";
import ffmpegPathValue from "ffmpeg-static";

const ffmpegPath = ffmpegPathValue as unknown as string | null;

export type PreviewCutDecision = {
  action: "cut" | "keep";
  endSeconds: number;
  startSeconds: number;
};

export type PreviewSourceAsset = {
  durationSeconds: number;
  hasAudio: boolean;
  localPath: string;
};

export type KeptInterval = {
  endSeconds: number;
  startSeconds: number;
};

const round = (value: number) => Math.round(value * 1_000) / 1_000;

export function buildKeptIntervals(
  durationSeconds: number,
  decisions: PreviewCutDecision[],
): KeptInterval[] {
  const cuts = decisions
    .filter((item) => item.action === "cut")
    .map((item) => ({
      endSeconds: Math.max(0, Math.min(durationSeconds, Number(item.endSeconds))),
      startSeconds: Math.max(0, Math.min(durationSeconds, Number(item.startSeconds))),
    }))
    .filter((item) => Number.isFinite(item.startSeconds) && Number.isFinite(item.endSeconds) && item.endSeconds - item.startSeconds >= 0.05)
    .sort((left, right) => left.startSeconds - right.startSeconds);
  const merged: KeptInterval[] = [];
  for (const cut of cuts) {
    const previous = merged.at(-1);
    // Một nhịp giữ ngắn hơn 180 ms giữa hai cuts sẽ tạo flash/click, nên gộp lại.
    if (previous && cut.startSeconds - previous.endSeconds < 0.18) {
      previous.endSeconds = Math.max(previous.endSeconds, cut.endSeconds);
    } else {
      merged.push({ ...cut });
    }
  }
  const kept: KeptInterval[] = [];
  let cursor = 0;
  for (const cut of merged) {
    if (cut.startSeconds - cursor >= 0.12) {
      kept.push({ startSeconds: round(cursor), endSeconds: round(cut.startSeconds) });
    }
    cursor = Math.max(cursor, cut.endSeconds);
  }
  if (durationSeconds - cursor >= 0.12) {
    kept.push({ startSeconds: round(cursor), endSeconds: round(durationSeconds) });
  }
  return kept;
}

function runFfmpeg(
  args: string[],
  expectedDurationSeconds: number,
  onProgress: (progress: number) => Promise<void>,
  range: { end: number; start: number },
) {
  if (!ffmpegPath) throw new Error("Worker chưa có FFmpeg phù hợp với hệ điều hành này.");
  return new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, ["-hide_banner", "-y", "-progress", "pipe:1", "-nostats", ...args], {
      windowsHide: true,
    });
    let stderr = "";
    let stdout = "";
    let lastProgress = -1;
    let progressQueue = Promise.resolve();
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("FFmpeg tạo preview quá thời gian cho phép."));
    }, Math.max(10 * 60_000, expectedDurationSeconds * 4_000));

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      const lines = stdout.split(/\r?\n/);
      stdout = lines.pop() ?? "";
      for (const line of lines) {
        const match = /^(?:out_time_us|out_time_ms)=(\d+)$/.exec(line);
        if (!match) continue;
        const seconds = Number(match[1]) / 1_000_000;
        const ratio = expectedDurationSeconds > 0 ? Math.min(1, seconds / expectedDurationSeconds) : 0;
        const progress = Math.round(range.start + ratio * (range.end - range.start));
        if (progress > lastProgress) {
          lastProgress = progress;
          progressQueue = progressQueue.then(() => onProgress(progress)).catch(() => undefined);
        }
      }
    });
    child.stderr.on("data", (chunk: string) => {
      if (stderr.length < 12_000) stderr += chunk;
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      void progressQueue.finally(() => {
        if (code === 0) resolve();
        else reject(new Error(stderr.trim().slice(-4_000) || `FFmpeg dừng với mã ${code}.`));
      });
    });
  });
}

async function normalizeSources(
  assets: PreviewSourceAsset[],
  destination: string,
  onProgress: (progress: number) => Promise<void>,
) {
  const filter: string[] = [];
  const labels: string[] = [];
  for (const [index, asset] of assets.entries()) {
    const duration = round(asset.durationSeconds);
    filter.push(
      `[${index}:v:0]trim=duration=${duration},setpts=PTS-STARTPTS,scale=360:640:force_original_aspect_ratio=decrease,pad=360:640:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=30,format=yuv420p[v${index}]`,
    );
    if (asset.hasAudio) {
      filter.push(
        `[${index}:a:0]aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo,apad=whole_dur=${duration},atrim=duration=${duration},asetpts=PTS-STARTPTS[a${index}]`,
      );
    } else {
      filter.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${duration},asetpts=PTS-STARTPTS[a${index}]`);
    }
    labels.push(`[v${index}][a${index}]`);
  }
  filter.push(`${labels.join("")}concat=n=${assets.length}:v=1:a=1[vout][aout]`);
  const durationSeconds = assets.reduce((total, asset) => total + asset.durationSeconds, 0);
  await runFfmpeg([
    ...assets.flatMap((asset) => ["-i", asset.localPath]),
    "-filter_complex", filter.join(";"),
    "-map", "[vout]", "-map", "[aout]",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "31",
    "-c:a", "aac", "-b:a", "96k", "-ar", "48000",
    "-movflags", "+faststart", "-shortest", destination,
  ], durationSeconds, onProgress, { start: 25, end: 55 });
}

async function applyCutPlan(
  source: string,
  destination: string,
  intervals: KeptInterval[],
  onProgress: (progress: number) => Promise<void>,
) {
  const filter: string[] = [];
  const labels: string[] = [];
  for (const [index, interval] of intervals.entries()) {
    const length = interval.endSeconds - interval.startSeconds;
    const fade = Math.min(0.07, Math.max(0.02, length / 5));
    filter.push(
      `[0:v]trim=start=${interval.startSeconds}:end=${interval.endSeconds},setpts=PTS-STARTPTS[v${index}]`,
    );
    const fades = [
      index > 0 ? `afade=t=in:st=0:d=${round(fade)}` : "",
      index < intervals.length - 1 ? `afade=t=out:st=${round(Math.max(0, length - fade))}:d=${round(fade)}` : "",
    ].filter(Boolean).join(",");
    filter.push(
      `[0:a]atrim=start=${interval.startSeconds}:end=${interval.endSeconds},asetpts=PTS-STARTPTS${fades ? `,${fades}` : ""}[a${index}]`,
    );
    labels.push(`[v${index}][a${index}]`);
  }
  filter.push(`${labels.join("")}concat=n=${intervals.length}:v=1:a=1[vout][aout]`);
  const durationSeconds = intervals.reduce((total, item) => total + item.endSeconds - item.startSeconds, 0);
  await runFfmpeg([
    "-i", source,
    "-filter_complex", filter.join(";"),
    "-map", "[vout]", "-map", "[aout]",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "30",
    "-c:a", "aac", "-b:a", "96k", "-ar", "48000",
    "-movflags", "+faststart", "-shortest", destination,
  ], durationSeconds, onProgress, { start: 55, end: 92 });
  return round(durationSeconds);
}

export async function createCutPreview(
  assets: PreviewSourceAsset[],
  decisions: PreviewCutDecision[],
  normalizedPath: string,
  outputPath: string,
  onProgress: (progress: number) => Promise<void>,
) {
  const sourceDurationSeconds = assets.reduce((total, asset) => total + asset.durationSeconds, 0);
  const intervals = buildKeptIntervals(sourceDurationSeconds, decisions);
  if (!intervals.length) throw new Error("Bản Smart Cut không còn đoạn nào để tạo preview.");
  await normalizeSources(assets, normalizedPath, onProgress);
  const durationSeconds = await applyCutPlan(normalizedPath, outputPath, intervals, onProgress);
  return { durationSeconds, intervalCount: intervals.length };
}
