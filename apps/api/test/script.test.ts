import assert from "node:assert/strict";
import { test } from "node:test";
import type { ContentPlanVersionDto, ScriptDocumentDto, UpdateScriptRequestDto } from "@creator-flow/contracts";
import { parseCreateScript, parseScriptAssist, parseUpdateScript } from "../src/modules/scripts/script.schema.js";
import { synchronizeScriptWithPlan } from "../src/modules/scripts/scriptPlanSync.js";

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
    contentPlanId: "9df5a911-92c4-4a71-b218-881cd73d59a2", contentPlanItemId: "item-3", dayIndex: 3,
  });
  assert.equal(scheduled.contentPlanItemId, "item-3");
  assert.equal(scheduled.dayIndex, 3);

  for (const input of [
    { mode: "manual", title: "", brief: "", scheduledFor: null, platform: "", format: "" },
    { mode: "manual", title: "Kịch bản", brief: "", scheduledFor: "2026-02-30", platform: "", format: "" },
    { mode: "ai", title: "", brief: "", scheduledFor: null, platform: "", format: "", contentPlanVersionId: "bad", dayIndex: 7 },
  ]) assert.throws(() => parseCreateScript(input));
});

test("syncs untouched plan fields and preserves script edits", () => {
  const sourceSnapshot = {
    title: "Tiêu đề cũ", angle: "Góc cũ", hook: "Hook cũ", cta: "CTA cũ",
    platform: "TikTok", format: "Video ngắn", objective: "Giá trị",
    productionNotes: "Quay gần cửa sổ", scheduledFor: "2026-09-07",
  };
  const script = {
    id: "script-1", revision: 2, title: sourceSnapshot.title, status: "draft", source: "content-plan",
    model: null, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
    planReference: {
      contentPlanId: "plan-1", contentPlanVersionId: "version-1", contentPlanVersion: 1,
      contentPlanItemId: "item-1",
      dayIndex: 0, weekStart: "2026-09-07", planName: "Kế hoạch 01", planTitle: sourceSnapshot.title,
      sourceSnapshot, sync: { state: "current", syncedAt: "2026-09-01T00:00:00.000Z", appliedFields: [], preservedFields: [] },
    },
    content: { hook: sourceSnapshot.hook, body: "Phần tôi đã tự sửa", cta: sourceSnapshot.cta, storyboard: [] },
    settings: { platform: sourceSnapshot.platform, format: sourceSnapshot.format, scheduledFor: sourceSnapshot.scheduledFor, targetDurationSeconds: 60, aspectRatio: "9:16", objective: sourceSnapshot.objective, audience: "", tone: "" },
    advancedSettings: { hookStyle: "", pacing: "balanced", ctaStyle: "", language: "Tiếng Việt", productionNotes: sourceSnapshot.productionNotes },
  } as ScriptDocumentDto;
  const nextItem = {
    id: "item-1", dayIndex: 0, pillarIndex: 0, objective: "Kết nối" as const, platform: "Instagram", format: "Reel",
    title: "Tiêu đề mới", angle: "Góc mới", hook: "Hook mới", cta: "CTA mới", productionNotes: "Quay ngoài trời",
  };
  const plan = {
    id: "version-2", planId: "plan-1", version: 2, status: "approved", source: "manual", model: null,
    createdAt: "2026-09-02T00:00:00.000Z",
    brief: { name: "Kế hoạch 01", weekStart: "2026-09-14", focus: "", availableDays: [0], weeklyVideoTarget: 1 },
    items: [nextItem],
  } as unknown as ContentPlanVersionDto;
  const synced = synchronizeScriptWithPlan(script, plan, "Kế hoạch 01", nextItem, "2026-09-02T00:00:00.000Z");
  assert.equal(synced.title, "Tiêu đề mới");
  assert.equal(synced.content.hook, "Hook mới");
  assert.equal(synced.content.body, "Phần tôi đã tự sửa");
  assert.equal(synced.planReference?.contentPlanItemId, "item-1");
  assert.equal(synced.settings.scheduledFor, "2026-09-14");
  assert.ok(synced.planReference?.sync.appliedFields.includes("hook"));
  assert.ok(synced.planReference?.sync.preservedFields.includes("body"));
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
