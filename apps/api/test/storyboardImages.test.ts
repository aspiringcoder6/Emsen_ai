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
  assert.equal(input.creatorAction, "auto");
  assert.equal(parseGenerateStoryboardImage({ ...input, style: "creator", creatorAction: "unbox" }).creatorAction, "unbox");
  assert.throws(() => parseGenerateStoryboardImage({ ...input, scene: { ...input.scene, locked: true } }), /Mở khóa/);
  assert.throws(() => parseGenerateStoryboardImage({ ...input, scene: { ...input.scene, visual: "" } }), /mô tả/);
  assert.throws(() => parseGenerateStoryboardImage({ ...input, scriptRevision: 0 }), /phiên bản/);
  assert.throws(() => parseGenerateStoryboardImage({ ...input, prompt: "x".repeat(1_201) }), /không hợp lệ/);
  assert.throws(() => parseGenerateStoryboardImage({ ...input, style: "unknown" }), /Phong cách/);
  assert.throws(() => parseGenerateStoryboardImage({ ...input, creatorAction: "unknown" }), /Động tác/);
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
    if (sql.includes("UPDATE storyboard_image_jobs")) {
      assert.match(sql, /WHERE user_id = \$1/);
      assert.match(sql, /INTERVAL '30 minutes'/);
      assert.match(sql, /INTERVAL '5 minutes'/);
      return { rows: [], rowCount: 0 };
    }
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
    const legacyReplay = await queueStoryboardImage(userId, scriptId, { ...input, creatorAction: undefined });
    assert.equal(legacyReplay.id, first.id); assert.equal(usage, 1);
    await assert.rejects(() => queueStoryboardImage(randomUUID(), scriptId, input), /Không tìm thấy/);
    await assert.rejects(() => queueStoryboardImage(userId, scriptId, { ...input, prompt: "different" }), /nội dung khác/);
    await assert.rejects(() => queueStoryboardImage(userId, scriptId, { ...input, creatorAction: "unbox" }), /nội dung khác/);
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
  } finally { Object.assign(config.imageGeneration, original); mock.restoreAll(); }
});

test("polling expires abandoned jobs without a worker, preserves quota/idempotency and isolates users", async () => {
  const original = { ...config.imageGeneration };
  Object.assign(config.imageGeneration, { provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-1-schnell", accountId: "b".repeat(32), apiToken: "test-token", dailyUserLimit: 20, dailyWorkspaceLimit: 50 });
  const userId = randomUUID(), otherUser = randomUUID(), scriptId = randomUUID(), otherScript = randomUUID();
  const now = Date.now();
  const makeRow = (status: string, ageMinutes: number, owner = userId, script = scriptId) => ({
    id: randomUUID(), user_id: owner, script_id: script, scene_id: `scene-${randomUUID()}`, provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-1-schnell",
    input: request(), status, progress: status === "running" ? 10 : 0, asset_id: null, error_message: null,
    created_at: new Date(now - ageMinutes * 60_000), updated_at: new Date(now - ageMinutes * 60_000),
  });
  const oldQueued = makeRow("queued", 31), oldRunning = makeRow("running", 6), recentQueued = makeRow("queued", 1), recentRunning = makeRow("running", 1);
  const foreign = makeRow("queued", 31, otherUser), ownOtherScript = makeRow("queued", 31, userId, otherScript), completed = makeRow("succeeded", 31);
  const rows = [oldQueued, oldRunning, recentQueued, recentRunning, foreign, ownOtherScript, completed];
  let usage = 7;
  const query = async (sql: string, values: any[] = []) => {
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql) || sql.includes("pg_advisory_xact_lock")) return { rows: [], rowCount: 0 };
    if (sql.includes("FROM script_documents")) return { rows: [{ revision: 2, payload: { content: { storyboard: [] } } }], rowCount: values[1] === userId ? 1 : 0 };
    if (sql.includes("UPDATE storyboard_image_jobs")) {
      assert.equal(values[0], userId);
      assert.match(sql, /WHERE user_id = \$1/);
      if (values.length === 2) { assert.equal(values[1], scriptId); assert.match(sql, /AND script_id = \$2/); }
      assert.equal(sql.includes("status = 'queued',"), false);
      for (const row of rows) {
        if (row.user_id !== values[0] || (values.length === 2 && row.script_id !== values[1])) continue;
        if ((row.status === "queued" && row.created_at.getTime() < now - 30 * 60_000) || (row.status === "running" && row.updated_at.getTime() < now - 5 * 60_000)) {
          row.status = "failed"; row.error_message = "Lượt tạo ảnh chờ quá lâu" as any;
        }
      }
      return { rows: [], rowCount: 0 };
    }
    if (sql.includes("FROM storyboard_image_usage")) return { rows: [{ own: String(usage), total: String(usage) }], rowCount: 1 };
    if (sql.includes("ORDER BY created_at DESC")) return { rows: rows.filter(row => row.user_id === values[1] && row.script_id === values[0]), rowCount: 1 };
    if (sql.includes("request_id = $2")) return { rows: rows.filter(row => row.user_id === values[0] && row.input.requestId === values[1]), rowCount: 1 };
    if (sql.includes("SELECT scene_id, script_id")) return { rows: rows.filter(row => row.user_id === values[0] && ["queued", "running"].includes(row.status)), rowCount: 1 };
    if (sql.startsWith("SELECT (SELECT COUNT")) return { rows: [{ count: "1" }], rowCount: 1 };
    if (sql.startsWith("INSERT INTO storyboard_image_jobs")) {
      const row = { ...makeRow("queued", 0), id: values[0], input: values[7], scene_id: values[4] };
      rows.push(row); return { rows: [row], rowCount: 1 };
    }
    if (sql.startsWith("INSERT INTO storyboard_image_usage")) { usage++; return { rows: [], rowCount: 1 }; }
    throw new Error(`Unexpected query ${sql}`);
  };
  mock.method(database, "query", query);
  mock.method(database, "connect", async () => ({ query, release() {} }));
  mock.method(globalThis, "fetch", async (url: string | URL) => { assert.equal(String(url).includes("api.cloudflare.com"), false); return new Response(null, { status: 200 }); });
  try {
    const workspace = await getStoryboardImageWorkspace(userId, scriptId);
    assert.equal(workspace.jobs.find(row => row.id === oldQueued.id)!.status, "failed");
    assert.equal(workspace.jobs.find(row => row.id === oldRunning.id)!.status, "failed");
    assert.equal(recentQueued.status, "queued"); assert.equal(recentRunning.status, "running"); assert.equal(completed.status, "succeeded");
    assert.equal(foreign.status, "queued"); assert.equal(ownOtherScript.status, "queued"); assert.equal(workspace.usage.usedToday, 7);
    const replay = await queueStoryboardImage(userId, scriptId, oldQueued.input);
    assert.equal(replay.id, oldQueued.id); assert.equal(replay.status, "failed"); assert.equal(usage, 7);
    assert.equal(ownOtherScript.status, "failed"); assert.equal(foreign.status, "queued");
    const newJob = await queueStoryboardImage(userId, scriptId, request());
    assert.equal(newJob.status, "queued"); assert.equal(usage, 8);
    await assert.rejects(() => getStoryboardImageWorkspace(otherUser, scriptId), /Không tìm thấy/);
  } finally { Object.assign(config.imageGeneration, original); mock.restoreAll(); await database.end(); }
});
