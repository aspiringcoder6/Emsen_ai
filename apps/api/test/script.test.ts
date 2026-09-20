import assert from "node:assert/strict";
import { test } from "node:test";
import type { ContentPlanVersionDto, ScriptDocumentDto, UpdateScriptRequestDto } from "@creator-flow/contracts";
import { parseCreateScript, parseScriptAssist, parseScriptBrainstorm, parseStoryboard, parseUpdateScript } from "../src/modules/scripts/script.schema.js";
import { synchronizeScriptWithPlan } from "../src/modules/scripts/scriptPlanSync.js";
import { buildFlexibleTimelineGuide, countSpokenWords, normalizeScriptTimeline, scriptGenerationIssues, scriptTimelineIssues, scriptWordBudget } from "../src/modules/scripts/scriptTimeline.js";

const validDraft: UpdateScriptRequestDto = {
  revision: 1,
  title: "Một ngày bắt đầu lại",
  status: "in-progress",
  creativeStrategy: {
    selectedConcept: {
      id: "concept-1",
      angleType: "experience",
      label: "Trải nghiệm thật",
      angle: "Bắt đầu lại từ một việc nhỏ",
      hook: "Bạn không cần đợi đến thứ Hai.",
      tension: "Muốn bắt đầu hoàn hảo nhưng càng chờ càng trì hoãn.",
      development: "Kể một lần đã trì hoãn rồi rút ra bước nhỏ có thể làm ngay.",
      creatorPrompt: "Lần gần nhất bạn trì hoãn vì muốn hoàn hảo là khi nào?",
      whyItFits: "Phù hợp với giọng kể gần gũi.",
      fitScore: 92,
    },
    creatorExperience: "Tôi từng đợi đầu tuần mới bắt đầu rồi lại bỏ lỡ.",
  },
  content: {
    hook: "Bạn không cần đợi đến thứ Hai.",
    body: "Bắt đầu bằng một việc nhỏ có thể làm ngay hôm nay.",
    cta: "Bạn sẽ bắt đầu bằng điều gì?",
    storyboard: [
      {
        id: "frame-1",
        title: "Mở cảnh",
        visual: "Cận cảnh bàn làm việc",
        visualPurpose: "Tạo cảm giác mọi thứ đang bị trì hoãn.",
        broll: "Lịch bị gạch nhiều ngày",
        dialogue: "Bạn không cần đợi đến thứ Hai.",
        emotionalBeat: "Nhận ra",
        transition: "Cắt theo động tác mở sổ",
        retentionRole: "Mở câu hỏi cần lời giải",
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
  const manual = parseCreateScript({
    mode: "manual", title: "Kịch bản mới", brief: "", scheduledFor: null,
    platform: "TikTok", format: "Video ngắn",
  });
  assert.equal(manual.title, "Kịch bản mới");
  assert.equal(manual.targetDurationSeconds, 60);

  const scheduled = parseCreateScript({
    mode: "ai", title: "", brief: "Viết gần gũi", scheduledFor: "2026-09-12",
    platform: "Instagram", format: "Reel", targetDurationSeconds: 30,
    creatorExperience: "Tôi từng xóa video đầu tiên.", ctaStyle: "Mở hội thoại",
    selectedConcept: validDraft.creativeStrategy.selectedConcept,
    contentPlanId: "9df5a911-92c4-4a71-b218-881cd73d59a2", contentPlanItemId: "item-3", dayIndex: 3,
  });
  assert.equal(scheduled.contentPlanItemId, "item-3");
  assert.equal(scheduled.dayIndex, 3);
  assert.equal(scheduled.targetDurationSeconds, 30);
  assert.equal(scheduled.selectedConcept?.angleType, "experience");

  for (const input of [
    { mode: "manual", title: "", brief: "", scheduledFor: null, platform: "", format: "" },
    { mode: "manual", title: "Kịch bản", brief: "", scheduledFor: "2026-02-30", platform: "", format: "" },
    { mode: "ai", title: "", brief: "", scheduledFor: null, platform: "", format: "", contentPlanVersionId: "bad", dayIndex: 7 },
  ]) assert.throws(() => parseCreateScript(input));
});

test("accepts flexible timestamp layouts that cover the selected duration", () => {
  const guide = buildFlexibleTimelineGuide(60);
  assert.equal(guide.targetDurationSeconds, 60);
  assert.match(guide.note, /Không có tỷ lệ/);

  const words = Array.from({ length: 104 }, (_, index) => `từ${index + 1}`);
  const content = normalizeScriptTimeline({
    hook: "0:00-0:04: Một hook đủ cụ thể để người xem dừng lại và muốn nghe tiếp câu chuyện này.",
    body: [
      `[0:04-0:19] ${words.slice(0, 34).join(" ")}`,
      `[0:19-0:42] ${words.slice(34, 75).join(" ")}`,
      `[0:42-0:54] ${words.slice(75).join(" ")}`,
    ].join("\n"),
    cta: "[0:54-1:00] Bạn từng gặp điều này chưa, hãy kể trải nghiệm thật của bạn ở phần bình luận nhé.",
    storyboard: [],
  });
  assert.match(content.hook, /^\[0:00–0:04\]/);
  assert.match(content.cta, /^\[0:54–1:00\]/);
  assert.equal(countSpokenWords(content.body), 104);
  assert.deepEqual(scriptGenerationIssues(content, 60), []);

  const differentButValid = {
    ...content,
    hook: "[0:00–0:07] Hook dài hơn vì mở bằng một tình huống cụ thể đủ lời thoại để dẫn vào câu chuyện.",
    body: `[0:07–0:30] ${words.slice(0, 52).join(" ")}\n[0:30–0:50] ${words.slice(52).join(" ")}`,
    cta: "[0:50–1:00] Bạn từng gặp điều này chưa, hãy kể trải nghiệm thật của bạn ở phần bình luận nhé.",
  };
  assert.deepEqual(scriptTimelineIssues(differentButValid, 60), []);
});

test("rejects a visibly short script for its selected duration", () => {
  const budget = scriptWordBudget(60);
  assert.deepEqual(budget.total, { min: 130, max: 170 });
  const issues = scriptGenerationIssues({
    hook: "Có những hôm ăn uống đến phát khóc.",
    body: "Tâm sự thật lòng.",
    cta: "Bạn có đang gặp khó khăn nào khi ăn uống không?",
    storyboard: [],
  }, 60);
  assert.ok(issues.some((issue) => issue.includes("Tổng lời thoại")));
  assert.ok(issues.some((issue) => issue.includes("Phần nội dung")));
});

test("validates creative brainstorming inputs", () => {
  const input = parseScriptBrainstorm({
    title: "Video đầu tiên",
    brief: "Gần gũi",
    scheduledFor: null,
    platform: "TikTok",
    format: "Video ngắn",
    targetDurationSeconds: 45,
    creatorExperience: "Tôi đã quay đi quay lại nhiều lần.",
    ctaStyle: "Mở hội thoại",
    optionCount: 6,
  });
  assert.equal(input.optionCount, 6);
  assert.equal(input.targetDurationSeconds, 45);
  assert.equal("mode" in input, false);
  assert.throws(() => parseScriptBrainstorm({ ...input, optionCount: 3 }));
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
    creativeStrategy: { selectedConcept: null, creatorExperience: "" },
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
  const legacyFrame = parseStoryboard([{
    id: "legacy-frame",
    title: "Cảnh cũ",
    visual: "Cận cảnh",
    dialogue: "Lời thoại cũ",
    direction: "Máy cố định",
    durationSeconds: 4,
  }])[0]!;
  assert.equal(legacyFrame.visualPurpose, "");
  assert.equal(legacyFrame.retentionRole, "");

  assert.throws(() => parseUpdateScript({ ...validDraft, status: "published" }));
  assert.throws(() => parseUpdateScript({ ...validDraft, settings: { ...validDraft.settings, targetDurationSeconds: 0 } }));
  assert.throws(() => parseUpdateScript({ ...validDraft, content: { ...validDraft.content, storyboard: [{ ...validDraft.content.storyboard[0], durationSeconds: 9999 }] } }));
  assert.throws(() => parseScriptAssist({ section: "everything", instruction: "Viết lại", draft: validDraft }));
  assert.throws(() => parseScriptAssist({ section: "cta", instruction: "", draft: validDraft }));
});
