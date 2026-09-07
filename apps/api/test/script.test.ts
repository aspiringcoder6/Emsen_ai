import assert from "node:assert/strict";
import { test } from "node:test";
import type { UpdateScriptRequestDto } from "@creator-flow/contracts";
import { parseCreateScript, parseScriptAssist, parseUpdateScript } from "../src/modules/scripts/script.schema.js";

const validDraft: UpdateScriptRequestDto = {
  revision: 1,
  title: "Một ngày bắt đầu lại",
  status: "in-progress",
  content: {
    hook: "Bạn không cần đợi đến thứ Hai.",
    body: "Bắt đầu bằng một việc nhỏ có thể làm ngay hôm nay.",
    cta: "Bạn sẽ bắt đầu bằng điều gì?",
    storyboard: [
      {
        id: "frame-1",
        title: "Mở cảnh",
        visual: "Cận cảnh bàn làm việc",
        dialogue: "Bạn không cần đợi đến thứ Hai.",
        direction: "Máy quay cố định",
        durationSeconds: 4,
      },
    ],
  },
  settings: {
    platform: "TikTok",
    format: "Video ngắn",
    scheduledFor: "2026-09-12",
    targetDurationSeconds: 45,
    aspectRatio: "9:16",
    objective: "Kết nối",
    audience: "Người sáng tạo mới",
    tone: "Gần gũi",
  },
  advancedSettings: {
    hookStyle: "Đi thẳng vào vấn đề",
    pacing: "balanced",
    ctaStyle: "Gợi mở",
    language: "Tiếng Việt",
    productionNotes: "Quay cạnh cửa sổ",
  },
};

test("validates manual and scheduled script creation", () => {
  assert.equal(parseCreateScript({
    mode: "manual", title: "Kịch bản mới", brief: "", scheduledFor: null,
    platform: "TikTok", format: "Video ngắn",
  }).title, "Kịch bản mới");

  const scheduled = parseCreateScript({
    mode: "ai", title: "", brief: "Viết gần gũi", scheduledFor: "2026-09-12",
    platform: "Instagram", format: "Reel",
    contentPlanVersionId: "9df5a911-92c4-4a71-b218-881cd73d59a2", dayIndex: 3,
  });
  assert.equal(scheduled.dayIndex, 3);

  for (const input of [
    { mode: "manual", title: "", brief: "", scheduledFor: null, platform: "", format: "" },
    { mode: "manual", title: "Kịch bản", brief: "", scheduledFor: "2026-02-30", platform: "", format: "" },
    { mode: "ai", title: "", brief: "", scheduledFor: null, platform: "", format: "", contentPlanVersionId: "bad", dayIndex: 7 },
  ]) assert.throws(() => parseCreateScript(input));
});

test("validates the editable script and AI section request", () => {
  assert.deepEqual(parseUpdateScript(validDraft), validDraft);
  assert.equal(parseScriptAssist({ section: "hook", instruction: "Ngắn hơn", draft: validDraft }).section, "hook");

  assert.throws(() => parseUpdateScript({ ...validDraft, status: "published" }));
  assert.throws(() => parseUpdateScript({ ...validDraft, settings: { ...validDraft.settings, targetDurationSeconds: 0 } }));
  assert.throws(() => parseUpdateScript({ ...validDraft, content: { ...validDraft.content, storyboard: [{ ...validDraft.content.storyboard[0], durationSeconds: 9999 }] } }));
  assert.throws(() => parseScriptAssist({ section: "everything", instruction: "Viết lại", draft: validDraft }));
  assert.throws(() => parseScriptAssist({ section: "cta", instruction: "", draft: validDraft }));
});
