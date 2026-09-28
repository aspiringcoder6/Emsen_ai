import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { test } from "node:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPathValue from "ffmpeg-static";
import { probeVideo } from "../src/mediaProbe.js";
import { buildKeptIntervals, createCutPreview } from "../src/videoPreview.js";

const execFileAsync = promisify(execFile);
const ffmpegPath = ffmpegPathValue as unknown as string | null;

test("builds stable kept intervals and absorbs flash-length gaps", () => {
  assert.deepEqual(buildKeptIntervals(10, [
    { action: "cut", startSeconds: 2, endSeconds: 4 },
    { action: "cut", startSeconds: 4.1, endSeconds: 5 },
    { action: "keep", startSeconds: 6, endSeconds: 7 },
  ]), [
    { startSeconds: 0, endSeconds: 2 },
    { startSeconds: 5, endSeconds: 10 },
  ]);
});

test("renders a playable vertical Smart Cut proxy with softened audio seams", async () => {
  assert.ok(ffmpegPath, "ffmpeg-static must provide a binary for this platform");
  const directory = await mkdtemp(join(tmpdir(), "emsen-preview-test-"));
  try {
    const source = join(directory, "source-a.mp4");
    const silentSource = join(directory, "source-b.mp4");
    const normalized = join(directory, "normalized.mp4");
    const output = join(directory, "preview.mp4");
    await execFileAsync(ffmpegPath!, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "color=c=0x7DBA72:s=360x640:r=30:d=1",
      "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=1",
      "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", source,
    ]);
    await execFileAsync(ffmpegPath!, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "color=c=0xDCA7B5:s=360x640:r=30:d=1",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", silentSource,
    ]);
    const progress: number[] = [];
    const result = await createCutPreview(
      [
        { durationSeconds: 1, hasAudio: true, localPath: source },
        { durationSeconds: 1, hasAudio: false, localPath: silentSource },
      ],
      [{ action: "cut", startSeconds: 0.8, endSeconds: 1.2 }],
      normalized,
      output,
      async (value) => { progress.push(value); },
    );
    const file = await stat(output);
    const probe = await probeVideo(output);
    assert.ok(file.size > 1_000);
    assert.equal(probe.width, 360);
    assert.equal(probe.height, 640);
    assert.ok(probe.audioCodec);
    assert.ok(result.durationSeconds > 1.4 && result.durationSeconds < 1.8);
    assert.ok(progress.some((value) => value >= 90));
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});
