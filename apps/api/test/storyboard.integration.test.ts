import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { database } from "../src/database/pool.js";
import { migrateDatabase } from "../src/database/migrate.js";
import { createScript, deleteScript, getScript, updateScript } from "../src/modules/scripts/script.service.js";
import { getStoryboardAsset, uploadStoryboardAsset } from "../src/modules/scripts/storyboardAssets.service.js";
import { parseStoryboard, parseUpdateScript } from "../src/modules/scripts/script.schema.js";
import { parseStoryboardUpload } from "../src/modules/scripts/storyboard.schema.js";

test("private storyboard images persist, stay scoped to their script and protect revision writes", async () => {
  const userId = randomUUID();
  const otherUser = randomUUID();
  const createdScripts: string[] = [];
  try {
    await migrateDatabase();
    for (const id of [userId, otherUser]) await database.query("INSERT INTO users (id, email, display_name, password_hash, terms_accepted_at) VALUES ($1,$2,'Storyboard test','unused-test-hash',NOW())", [id, `storyboard-${id}@example.invalid`]);
    const create = async () => {
      const script = await createScript(userId, { mode: "manual", title: "Storyboard test", brief: "", scheduledFor: null, platform: "TikTok", format: "Video ngắn", targetDurationSeconds: 30 });
      createdScripts.push(script.id);
      return script;
    };
    const script = await create();
    const otherScript = await create();
    const asset = await uploadStoryboardAsset(userId, script.id, parseStoryboardUpload({ fileName: "cảnh.png", mimeType: "image/png", dataBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZc0AAAAASUVORK5CYII=" }));
    assert.match(asset.imageUrl, /X-Amz-Signature=/);
    assert.equal((await fetch(asset.imageUrl)).status, 200);
    const frames = parseStoryboard([{ id: "scene-1", title: "Cảnh 1", visual: "Cận cảnh", dialogue: "Xin chào", direction: "Máy cố định", durationSeconds: 30, illustrationAssetId: asset.id, locked: true, onScreenText: { text: "Bắt đầu hôm nay", font: "serif", color: "#FFFF00", backgroundColor: "#284D31", size: "large", position: "top" } }]);
    const saved = await updateScript(userId, script.id, parseUpdateScript({ ...script, content: { ...script.content, storyboard: frames } }));
    const reopened = await getScript(userId, script.id);
    assert.deepEqual(reopened.content.storyboard, saved.content.storyboard);
    assert.equal(reopened.revision, script.revision + 1);
    await assert.rejects(() => updateScript(userId, script.id, parseUpdateScript(script)), /đã thay đổi/);
    await assert.rejects(() => getStoryboardAsset(otherUser, script.id, asset.id), /Không tìm thấy/);
    await assert.rejects(() => getStoryboardAsset(userId, otherScript.id, asset.id), /Không tìm thấy/);
    await assert.rejects(() => updateScript(userId, otherScript.id, parseUpdateScript({ ...otherScript, content: { ...otherScript.content, storyboard: frames } })), /thuộc đúng kịch bản/);
    await deleteScript(userId, script.id);
    assert.equal((await fetch(asset.imageUrl)).status, 404);
  } finally {
    for (const id of createdScripts) await deleteScript(userId, id).catch(() => undefined);
    await database.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [[userId, otherUser]]).catch(() => undefined);
    await database.end();
  }
});
