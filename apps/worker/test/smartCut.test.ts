import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSmartCutDecisions } from "../src/smartCut.js";

test("Smart Cut protects opening, ending and leaves padding around long pauses", () => {
  const segments = [
    { id: "11111111-1111-4111-8111-111111111111", startSeconds: 2, endSeconds: 5, text: "Mở đầu" },
    { id: "22222222-2222-4222-8222-222222222222", startSeconds: 8, endSeconds: 10, text: "Một câu lặp" },
    { id: "33333333-3333-4333-8333-333333333333", startSeconds: 12, endSeconds: 15, text: "Kết video" },
  ];
  const result = buildSmartCutDecisions(17, segments, segments.map((segment) => ({
    action: "cut",
    confidence: 0.95,
    continuity: "safe",
    reason: "Có thể bỏ",
    segmentId: segment.id,
  })));

  const speech = result.decisions.filter((item) => item.kind === "speech");
  assert.equal(speech[0]?.action, "keep");
  assert.equal(speech[1]?.action, "cut");
  assert.equal(speech[2]?.action, "keep");
  const firstPause = result.decisions.find((item) => item.kind === "pause");
  assert.ok(firstPause);
  assert.ok(firstPause.startSeconds > 0);
  assert.ok(firstPause.endSeconds < 2);
  assert.ok(result.estimatedDurationSeconds > 0);
  assert.ok(result.estimatedDurationSeconds < 17);
});

test("Smart Cut keeps speech when semantic continuity is uncertain", () => {
  const result = buildSmartCutDecisions(8, [
    { id: "11111111-1111-4111-8111-111111111111", startSeconds: 0, endSeconds: 2, text: "Hook" },
    { id: "22222222-2222-4222-8222-222222222222", startSeconds: 2, endSeconds: 5, text: "Ý phụ thuộc câu trước" },
    { id: "33333333-3333-4333-8333-333333333333", startSeconds: 5, endSeconds: 8, text: "CTA" },
  ], [{
    action: "cut",
    confidence: 0.99,
    continuity: "review",
    reason: "Chưa chắc điểm nối",
    segmentId: "22222222-2222-4222-8222-222222222222",
  }]);
  assert.equal(result.decisions.find((item) => item.segmentId?.startsWith("2222"))?.action, "keep");
});
