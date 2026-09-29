import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { test } from "node:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPathValue from "ffmpeg-static";
import { probeVideo } from "../src/mediaProbe.js";
import {
  createAssDocument,
  createFinalVideo,
  findBrandMarkPath,
  remapCaptionSegments,
} from "../src/videoRender.js";

const execFileAsync = promisify(execFile);
const ffmpegPath = ffmpegPathValue as unknown as string | null;

const settings = {
  captionAccentColor: "#A8D694",
  captionPosition: "lower-third" as const,
  captionPreset: "emsen-clean" as const,
  captionTextColor: "#FFFFFF",
  renderSettingsRevision: 2,
  showBrandMark: true,
};

test("remaps captions to the shortened Smart Cut timeline", () => {
  const captions = remapCaptionSegments([
    { startSeconds: 0, endSeconds: 2, text: "Mở đầu thật rõ ràng" },
    { startSeconds: 3, endSeconds: 5, text: "Và tiếp tục câu chuyện" },
  ], [
    { startSeconds: 0, endSeconds: 2 },
    { startSeconds: 3, endSeconds: 5 },
  ]);
  assert.equal(captions[0]?.startSeconds, 0);
  assert.equal(captions.at(-1)?.endSeconds, 4);
  assert.match(createAssDocument(captions, settings), /PlayResX: 720/);
  assert.match(createAssDocument(captions, settings), /Mở đầu thật rõ ràng/);
});

test("renders a final vertical MP4 with captions, brand mark and normalized audio", async () => {
  assert.ok(ffmpegPath, "ffmpeg-static must provide a binary for this platform");
  const directory = await mkdtemp(join(tmpdir(), "emsen-final-test-"));
  try {
    const source = join(directory, "source.mp4");
    const normalized = join(directory, "normalized.mp4");
    const edited = join(directory, "edited.mp4");
    const subtitle = join(directory, "captions.ass");
    const output = join(directory, "final.mp4");
    await execFileAsync(ffmpegPath!, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "color=c=0x7DBA72:s=360x640:r=30:d=2",
      "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=2",
      "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", source,
    ]);
    const progress: number[] = [];
    const result = await createFinalVideo(
      [{ durationSeconds: 2, hasAudio: true, localPath: source }],
      [{ action: "cut", startSeconds: 0.8, endSeconds: 1.05 }],
      [
        { startSeconds: 0.05, endSeconds: 0.75, text: "Xin chào bạn" },
        { startSeconds: 1.1, endSeconds: 1.9, text: "Đây là bản xuất hoàn chỉnh" },
      ],
      settings,
      {
        brandMarkPath: await findBrandMarkPath(),
        editedPath: edited,
        normalizedPath: normalized,
        outputPath: output,
        subtitlePath: subtitle,
      },
      async (value) => { progress.push(value); },
    );
    const file = await stat(output);
    const probe = await probeVideo(output);
    assert.ok(file.size > 5_000);
    assert.equal(probe.width, 720);
    assert.equal(probe.height, 1280);
    assert.ok(probe.audioCodec);
    assert.ok(result.captionCount >= 2);
    assert.ok(progress.some((value) => value >= 90));
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});
