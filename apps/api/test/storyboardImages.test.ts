import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mock, test } from "node:test";
import { config } from "../src/config.js";
import { database } from "../src/database/pool.js";
import { parseGenerateStoryboardImage } from "../src/modules/scripts/storyboardImages.schema.js";
import { getStoryboardImageWorkspace, queueStoryboardImage } from "../src/modules/scripts/storyboardImages.service.js";

function request() { return parseGenerateStoryboardImage({ requestId: randomUUID(), scriptRevision: 2, scene: { id: "scene-1", title: "Bàn làm việc", visual: "Mở sổ trên bàn", direction: "Cận cảnh" }, aspectRatio: "9:16", style: "sketch", prompt: "" }); }

test("image requests validate scenes, revisions, prompt bounds and locks", () => {
  const input = request();
  assert.equal(input.scene.locked, false);
  assert.throws(() => parseGenerateStoryboardImage({ ...input, scene: { ...input.scene, locked: true } }), /Mở khóa/);
  assert.throws(() => parseGenerateStoryboardImage({ ...input, scene: { ...input.scene, visual: "" } }), /mô tả/);
  assert.throws(() => parseGenerateStoryboardImage({ ...input, scriptRevision: 0 }), /phiên bản/);
  assert.throws(() => parseGenerateStoryboardImage({ ...input, prompt: "x".repeat(1_201) }), /không hợp lệ/);
  assert.throws(() => parseGenerateStoryboardImage({ ...input, style: "unknown" }), /Phong cách/);
  assert.throws(() => parseGenerateStoryboardImage({ ...input, requestId: "not-uuid" }), /UUID/);
});

test("queue is user scoped, idempotent, reserves quota once and never invokes image generation", async () => {
  const original = { ...config.imageGeneration };
  Object.assign(config.imageGeneration, { provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-1-schnell", accountId: "b".repeat(32), apiToken: "test-token", dailyUserLimit: 2, dailyWorkspaceLimit: 3 });
  const userId = randomUUID(), scriptId = randomUUID();
  const jobs: Array<Record<string, any>> = [];
  let usage = 0, total = 0, locks = 0, assetCount = 0, revision = 2, locked = false, externalCalls = 0;
  const query = async (sql: string, values: any[] = []) => {
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) return { rows: [], rowCount: 0 };
    if (sql.includes("pg_advisory_xact_lock")) { locks++; return { rows: [], rowCount: 1 }; }
    if (sql.includes("FROM script_documents")) return { rows: values[0] === scriptId && values[1] === userId ? [{ revision, payload: { content: { storyboard: [{ id: "scene-1", locked }] } } }] : [], rowCount: values[0] === scriptId && values[1] === userId ? 1 : 0 };
    if (sql.includes("request_id = $2")) {
      const found = jobs.find((job) => job.input.requestId === values[1] && job.user_id === values[0]);
      // Real JSONB returns a different key order; idempotency must be semantic.
      return { rows: found ? [{ ...found, input: { ...found.input, scene: { direction: found.input.scene.direction, visual: found.input.scene.visual, title: found.input.scene.title, id: found.input.scene.id, locked: false } } }] : [], rowCount: found ? 1 : 0 };
    }
    if (sql.includes("SELECT scene_id, script_id")) return { rows: jobs.filter((job) => job.status === "queued" || job.status === "running"), rowCount: jobs.length };
    if (sql.includes("FROM storyboard_image_usage") && sql.includes("COUNT")) { assert.match(sql, /AT TIME ZONE 'UTC'/); return { rows: [{ own: String(usage), total: String(total) }], rowCount: 1 }; }
    if (sql.startsWith("SELECT (SELECT COUNT")) return { rows: [{ count: String(assetCount) }], rowCount: 1 };
    if (sql.startsWith("INSERT INTO storyboard_image_jobs")) {
      const [id, requestId, script_id, user_id, scene_id, provider, model, input] = values;
      const row = { id, requestId, script_id, user_id, scene_id, provider, model, input, status: "queued", progress: 0, asset_id: null, error_message: null, created_at: new Date() };
      jobs.push(row); return { rows: [row], rowCount: 1 };
    }
    if (sql.startsWith("INSERT INTO storyboard_image_usage")) { usage++; total++; return { rows: [], rowCount: 1 }; }
    if (sql.includes("ORDER BY created_at DESC")) { assert.equal(values[1], userId); return { rows: jobs, rowCount: jobs.length }; }
    throw new Error(`Unexpected query ${sql}`);
  };
  mock.method(database, "query", query);
  mock.method(database, "connect", async () => ({ query, release() {} }));
  mock.method(globalThis, "fetch", async (url: string | URL) => { assert.equal(String(url).includes("api.cloudflare.com"), false); externalCalls++; return new Response(null, { status: 200 }); });
  try {
    const input = request();
    const first = await queueStoryboardImage(userId, scriptId, input);
    const replay = await queueStoryboardImage(userId, scriptId, input);
    assert.equal(first.id, replay.id); assert.equal(usage, 1); assert.equal(jobs.length, 1);
    assert.ok(locks >= 2); assert.equal(externalCalls, 1); // only storage readiness
    await assert.rejects(() => queueStoryboardImage(randomUUID(), scriptId, input), /Không tìm thấy/);
    await assert.rejects(() => queueStoryboardImage(userId, scriptId, { ...input, prompt: "different" }), /nội dung khác/);
    await assert.rejects(() => queueStoryboardImage(userId, scriptId, request()), /đang có một lượt/);
    jobs[0]!.status = "succeeded";
    revision = 3;
    await assert.rejects(() => queueStoryboardImage(userId, scriptId, request()), /đã thay đổi/);
    revision = 2; locked = true;
    await assert.rejects(() => queueStoryboardImage(userId, scriptId, request()), /Mở khóa/);
    locked = false; config.imageGeneration.apiToken = "";
    await assert.rejects(() => queueStoryboardImage(userId, scriptId, request()), /Account ID/);
    config.imageGeneration.apiToken = "test-token"; assetCount = 64;
    await assert.rejects(() => queueStoryboardImage(userId, scriptId, request()), /64 ảnh/);
    assetCount = 1; usage = 2;
    await assert.rejects(() => queueStoryboardImage(userId, scriptId, request()), /hết lượt/);
    usage = 1; total = 3;
    await assert.rejects(() => queueStoryboardImage(userId, scriptId, request()), /hết lượt/);
    const status = await getStoryboardImageWorkspace(userId, scriptId);
    assert.equal(status.jobs[0]!.id, first.id); assert.equal(status.usage.workspaceUsedToday, 3);
    assert.equal(status.usage.resetsAt.endsWith("T00:00:00.000Z"), true);
    assert.equal(JSON.stringify(status).includes("test-token"), false);
    await assert.rejects(() => getStoryboardImageWorkspace(randomUUID(), scriptId), /Không tìm thấy/);
  } finally { Object.assign(config.imageGeneration, original); mock.restoreAll(); await database.end(); }
});
