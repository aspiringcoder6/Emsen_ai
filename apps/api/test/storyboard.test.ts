import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { parseStoryboard } from "../src/modules/scripts/script.schema.js";
import { parseStoryboardUpload } from "../src/modules/scripts/storyboard.schema.js";
import { mergeStoryboardSuggestions } from "../src/modules/scripts/storyboardSuggestions.js";

const legacy = { id: "scene-1", title: "Cảnh mở đầu", visual: "Cận bàn làm việc", dialogue: "Bắt đầu từ hôm nay", direction: "Máy cố định", durationSeconds: 5 };
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZc0AAAAASUVORK5CYII=";

test("legacy scenes receive defaults and visual scenes survive a JSON save/reopen", () => {
  const frame = parseStoryboard([legacy])[0]!;
  assert.equal(frame.illustrationAssetId, null);
  assert.equal(frame.locked, false);
  assert.equal(frame.onScreenText?.text, "");
  const illustrated = { ...frame, illustrationAssetId: randomUUID(), locked: true, onScreenText: { ...frame.onScreenText!, text: "Đừng đợi thứ Hai", color: "#FFFF00" } };
  assert.deepEqual(parseStoryboard(JSON.parse(JSON.stringify([illustrated])))[0], illustrated);
  assert.throws(() => parseStoryboard([legacy, legacy]), /không được trùng/);
  assert.throws(() => parseStoryboard([{ ...frame, onScreenText: { ...frame.onScreenText, color: "url(https://example.invalid)" } }]), /Màu chữ/);
  assert.throws(() => parseStoryboard([{ ...frame, illustrationAssetId: "../../other-user.png" }]), /Mã ảnh/);
  assert.throws(() => parseStoryboard([{ ...frame, locked: "true" }]), /khóa cảnh/);
});

test("uploads are bounded raster images and cannot disguise an SVG or a different MIME type", () => {
  const uploaded = parseStoryboardUpload({ fileName: "cảnh.png", mimeType: "image/png", dataBase64: png });
  assert.equal(uploaded.bytes.length, Buffer.from(png, "base64").length);
  assert.throws(() => parseStoryboardUpload({ fileName: "cảnh.jpg", mimeType: "image/jpeg", dataBase64: png }), /không khớp/);
  assert.throws(() => parseStoryboardUpload({ fileName: "x.svg", mimeType: "image/svg+xml", dataBase64: Buffer.from("<svg/>").toString("base64") }), /PNG/);
  assert.throws(() => parseStoryboardUpload({ fileName: "x.png", mimeType: "image/png", dataBase64: "a".repeat(4_194_305) }), /3 MB/);
  assert.throws(() => parseStoryboardUpload({ fileName: "x.png", mimeType: "image/png", dataBase64: "YQ" }), /hợp lệ/);
});

test("AI rewrites preserve locked scenes, selected images, overlay text and omitted visual work", () => {
  const locked = parseStoryboard([{ ...legacy, locked: true }])[0]!;
  const illustrated = parseStoryboard([{ ...legacy, id: "scene-2", illustrationAssetId: randomUUID(), onScreenText: { text: "Một việc nhỏ", font: "serif", color: "#FFFF00", backgroundColor: "#284D31", size: "large", position: "top" } }])[0]!;
  const changes = parseStoryboard([{ ...legacy, visual: "AI đổi cảnh khóa" }, { ...legacy, id: "scene-2", dialogue: "Lời thoại mới" }]);
  const merged = mergeStoryboardSuggestions([locked, illustrated], changes);
  assert.deepEqual(merged[0], locked);
  assert.equal(merged[1]!.dialogue, "Lời thoại mới");
  assert.equal(merged[1]!.illustrationAssetId, illustrated.illustrationAssetId);
  assert.deepEqual(merged[1]!.onScreenText, illustrated.onScreenText);
  assert.deepEqual(mergeStoryboardSuggestions([locked, illustrated], []), [locked, illustrated]);
  const protectedScenes = Array.from({ length: 16 }, (_, i) => ({ ...locked, id: `protected-${i}` }));
  assert.throws(() => mergeStoryboardSuggestions(protectedScenes, [{ ...illustrated, id: "extra" }]), /quá nhiều cảnh/);
});
