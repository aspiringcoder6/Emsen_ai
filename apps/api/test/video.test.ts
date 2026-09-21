import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpError } from "../src/shared/http.js";
import {
  acceptedVideoMimeTypes,
  maxVideoBytes,
  parseCreateVideoProject,
  parseCreateVideoUpload,
  parseStartVideoTranscription,
  parseUpdateVideoTranscript,
} from "../src/modules/video/video.schema.js";

test("validates creation of a video project linked to a script", () => {
  assert.deepEqual(parseCreateVideoProject({
    captionPreset: "emsen-clean",
    idempotencyKey: "create-video-project-01",
    scriptId: "13fcdccd-2431-4e4f-b9a2-eb89808065d4",
    title: "Dựng video đầu tiên",
  }), {
    captionPreset: "emsen-clean",
    idempotencyKey: "create-video-project-01",
    scriptId: "13fcdccd-2431-4e4f-b9a2-eb89808065d4",
    title: "Dựng video đầu tiên",
  });

  assert.throws(() => parseCreateVideoProject({
    captionPreset: "unknown",
    idempotencyKey: "create-video-project-02",
    scriptId: "13fcdccd-2431-4e4f-b9a2-eb89808065d4",
    title: "",
  }), (error) => error instanceof HttpError && error.code === "INVALID_CAPTION_PRESET");
});

test("accepts only supported source videos inside the MVP size limit", () => {
  assert.deepEqual([...acceptedVideoMimeTypes], ["video/mp4", "video/quicktime", "video/webm"]);
  assert.deepEqual(parseCreateVideoUpload({
    fileName: "video-tho-01.mp4",
    idempotencyKey: "upload-video-01",
    mimeType: "video/mp4",
    origin: "upload",
    sizeBytes: 25_000_000,
  }), {
    fileName: "video-tho-01.mp4",
    idempotencyKey: "upload-video-01",
    mimeType: "video/mp4",
    origin: "upload",
    sizeBytes: 25_000_000,
  });

  assert.equal(parseCreateVideoUpload({
    fileName: "quay-truc-tiep.webm",
    idempotencyKey: "record-video-01",
    mimeType: "video/webm;codecs=vp8,opus",
    origin: "recording",
    sizeBytes: 12_000_000,
  }).mimeType, "video/webm");

  assert.throws(() => parseCreateVideoUpload({
    fileName: "video.avi",
    idempotencyKey: "upload-video-02",
    mimeType: "video/x-msvideo",
    origin: "upload",
    sizeBytes: 25_000_000,
  }), (error) => error instanceof HttpError && error.code === "VIDEO_TYPE_NOT_SUPPORTED");
  assert.throws(() => parseCreateVideoUpload({
    fileName: "too-large.mp4",
    idempotencyKey: "upload-video-03",
    mimeType: "video/mp4",
    origin: "upload",
    sizeBytes: maxVideoBytes + 1,
  }), (error) => error instanceof HttpError && error.code === "VIDEO_SIZE_NOT_SUPPORTED");
});

test("validates starting and editing timestamped video transcripts", () => {
  assert.deepEqual(parseStartVideoTranscription({ idempotencyKey: "transcribe-video-01" }), {
    idempotencyKey: "transcribe-video-01",
  });

  const firstId = "84d33e08-c006-4325-89d4-4308394166b3";
  const secondId = "b886d902-f10c-4b16-90dd-54fdbd95be41";
  assert.deepEqual(parseUpdateVideoTranscript({
    revision: 2,
    status: "approved",
    segments: [
      { id: firstId, startSeconds: 0, endSeconds: 4.5, text: "  Mở đầu video  " },
      { id: secondId, startSeconds: 4.5, endSeconds: 12, text: "Nội dung chính" },
    ],
  }), {
    revision: 2,
    status: "approved",
    segments: [
      { id: firstId, startSeconds: 0, endSeconds: 4.5, text: "Mở đầu video" },
      { id: secondId, startSeconds: 4.5, endSeconds: 12, text: "Nội dung chính" },
    ],
  });

  assert.throws(() => parseUpdateVideoTranscript({
    revision: 2,
    status: "draft",
    segments: [
      { id: firstId, startSeconds: 0, endSeconds: 6, text: "Đoạn một" },
      { id: secondId, startSeconds: 5, endSeconds: 10, text: "Đoạn bị chồng" },
    ],
  }), (error) => error instanceof HttpError && error.code === "TRANSCRIPT_SEGMENTS_OVERLAP");
});
