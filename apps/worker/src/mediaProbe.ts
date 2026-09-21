import { spawn } from "node:child_process";
import { path as ffprobePath } from "ffprobe-static";

type ProbeOutput = {
  format?: { duration?: string; format_name?: string };
  streams?: Array<{
    codec_name?: string;
    codec_type?: "audio" | "video";
    duration?: string;
    height?: number;
    r_frame_rate?: string;
    side_data_list?: Array<{ rotation?: number }>;
    tags?: { rotate?: string };
    width?: number;
  }>;
};

export type VideoProbeResult = {
  audioCodec: string | null;
  durationSeconds: number;
  format: string;
  fps: number | null;
  height: number;
  rotation: number;
  videoCodec: string;
  width: number;
};

function frameRate(value?: string) {
  if (!value) return null;
  const [numerator, denominator] = value.split("/").map(Number);
  if (!numerator || !denominator) return null;
  return Math.round(numerator / denominator * 100) / 100;
}

export function probeVideo(path: string) {
  return new Promise<VideoProbeResult>((resolve, reject) => {
    const process = spawn(ffprobePath, [
      "-v", "error",
      "-print_format", "json",
      "-show_format",
      "-show_streams",
      path,
    ], { windowsHide: true });
    let output = "";
    let errorOutput = "";
    const timeout = setTimeout(() => {
      process.kill("SIGKILL");
      reject(new Error("FFprobe mất quá nhiều thời gian để kiểm tra video."));
    }, 60_000);
    process.stdout.setEncoding("utf8");
    process.stderr.setEncoding("utf8");
    process.stdout.on("data", (chunk: string) => { if (output.length < 2_000_000) output += chunk; });
    process.stderr.on("data", (chunk: string) => { if (errorOutput.length < 4_000) errorOutput += chunk; });
    process.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    process.once("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(errorOutput.trim() || "FFprobe không đọc được video."));
        return;
      }
      try {
        const parsed = JSON.parse(output) as ProbeOutput;
        const video = parsed.streams?.find((stream) => stream.codec_type === "video");
        const audio = parsed.streams?.find((stream) => stream.codec_type === "audio");
        const durationSeconds = Number(parsed.format?.duration ?? video?.duration);
        if (!video?.codec_name || !video.width || !video.height || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
          throw new Error("Video không có hình ảnh hoặc thời lượng hợp lệ.");
        }
        const rotation = Number(video.side_data_list?.find((item) => Number.isFinite(item.rotation))?.rotation ?? video.tags?.rotate ?? 0);
        const rotated = Math.abs(rotation) % 180 === 90;
        resolve({
          audioCodec: audio?.codec_name ?? null,
          durationSeconds,
          format: parsed.format?.format_name ?? "unknown",
          fps: frameRate(video.r_frame_rate),
          height: rotated ? video.width : video.height,
          rotation: Number.isFinite(rotation) ? rotation : 0,
          videoCodec: video.codec_name,
          width: rotated ? video.height : video.width,
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}
