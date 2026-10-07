import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mock, test } from "node:test";
import { workerConfig } from "../src/config.js";
import { workerDatabase } from "../src/database.js";
import { buildStoryboardImagePrompt, storyboardCreatorAction, claimNextStoryboardImageJob, processStoryboardImage, recoverInterruptedStoryboardImages, type StoryboardImageJob } from "../src/storyboardImage.js";

const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZc0AAAAASUVORK5CYII=";
function makeJob(): StoryboardImageJob {
  return { id: randomUUID(), user_id: randomUUID(), script_id: randomUUID(), provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-1-schnell", input: { requestId: randomUUID(), scriptRevision: 1, scene: { id: "scene-1", title: "Sổ tay", visual: "Một quyển sổ trên bàn", direction: "Cận cảnh", locked: false }, prompt: "Morning sunlight", style: "sketch", aspectRatio: "9:16" } };
}

test("image prompt is bounded, visual only and keeps rendered text in a separate layer", () => {
  const input = makeJob().input;
  const prompt = buildStoryboardImagePrompt(input);
  assert.match(prompt, /pencil sketch/);
  assert.match(prompt, /Morning sunlight/);
  assert.match(prompt, /No text/);
  assert.match(prompt, /9:16/);
  input.prompt = "long ".repeat(240);
  input.scene.visual = "scene ".repeat(330);
  input.scene.direction = "camera ".repeat(280);
  assert.ok(buildStoryboardImagePrompt(input).length <= 2_048);
});

test("creator prompts focus on colored presenter actions, preserve B-roll and never turn a Hook label into an object", () => {
  const input = { ...makeJob().input, style: "creator" as const };
  input.scene = { ...input.scene, title: "Hook", visual: "Creator giơ bịch bỉm organic trước camera với biểu cảm bất ngờ" };
  assert.equal(storyboardCreatorAction(input), "show-product");
  const prompt = buildStoryboardImagePrompt(input);
  assert.match(prompt, /Full-color/); assert.match(prompt, /foreground subject/);
  assert.match(prompt, /baby diapers/); assert.match(prompt, /hands and product clearly visible/);
  assert.doesNotMatch(prompt, /Hook|pencil|sketch|grayscale/);
  assert.equal(buildStoryboardImagePrompt({ ...input, scene: { ...input.scene, title: "CTA" } }), prompt);
  input.scene.visual = "Creator nhìn camera và nói trực tiếp";
  assert.equal(storyboardCreatorAction(input), "talk-to-camera"); // 'camera' is not 'cầm'
  input.scene.visual = "Hào hứng khui gói bỉm trên bàn";
  assert.equal(storyboardCreatorAction(input), "unbox");
  input.creatorAction = "b-roll";
  const broll = buildStoryboardImagePrompt(input);
  assert.match(broll, /intentional B-roll insert/); assert.doesNotMatch(broll, /foreground subject fills/);
  input.creatorAction = "demonstrate";
  assert.match(buildStoryboardImagePrompt(input), /hands actively performing/);
  input.prompt = "long ".repeat(240);
  input.scene.visual = "scene ".repeat(330);
  input.scene.direction = "camera ".repeat(280);
  assert.ok(buildStoryboardImagePrompt(input).length <= 2_048);
});

test("worker persists private candidates without editing scripts, and fails safely after config/quota/storage changes", async () => {
  const original = { ...workerConfig.imageGeneration };
  Object.assign(workerConfig.imageGeneration, { accountId: "c".repeat(32), apiToken: "private-worker-test-token", provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-1-schnell" });
  let job = makeJob();
  let scriptExists = true, locked = false, failStorage = false, deleteAfterUpload = false, providerStatus = 200;
  let calls = 0, uploaded = 0, deleted = 0, committed = 0;
  let state = "running", failure = "";
  let inserted: unknown[] | null = null;
  const query = async (sql: string, values: unknown[] = []) => {
    assert.equal(sql.includes("UPDATE script_documents"), false);
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) { if (sql === "COMMIT") committed++; return { rows: [], rowCount: 0 }; }
    if (sql.startsWith("SELECT payload FROM script_documents")) { assert.deepEqual(values, [job.script_id, job.user_id]); return { rows: scriptExists ? [{ payload: { content: { storyboard: [{ id: job.input.scene.id, locked }] } } }] : [], rowCount: scriptExists ? 1 : 0 }; }
    if (sql.startsWith("SELECT id FROM script_documents")) return { rows: [], rowCount: deleteAfterUpload ? 0 : 1 };
    if (sql.startsWith("SELECT COUNT")) return { rows: [{ count: "1" }], rowCount: 1 };
    if (sql.startsWith("SELECT id FROM storyboard_image_jobs")) return { rows: [], rowCount: 1 };
    if (sql.startsWith("INSERT INTO storyboard_assets")) { inserted = values; return { rows: [], rowCount: 1 }; }
    if (sql.includes("SET status = 'succeeded'")) { state = "succeeded"; return { rows: [], rowCount: 1 }; }
    if (sql.includes("SET status = 'failed'")) { state = "failed"; failure = String(values[0]); return { rows: [], rowCount: 1 }; }
    if (sql.includes("SET progress = 75")) return { rows: [], rowCount: 1 };
    throw new Error(`Unexpected query ${sql}`);
  };
  mock.method(workerDatabase, "query", query);
  mock.method(workerDatabase, "connect", async () => ({ query, release() {} }));
  mock.method(globalThis, "fetch", async (url: string | URL, init: RequestInit) => {
    if (String(url).startsWith("https://api.cloudflare.com/")) {
      calls++;
      assert.equal(init.method, "POST");
      assert.equal(String(init.body).includes("private-worker-test-token"), false);
      return Response.json({ success: true, result: { image: png } }, { status: providerStatus });
    }
    if (init.method === "PUT") {
      uploaded++;
      assert.equal((init.body as Uint8Array).byteLength, Buffer.from(png, "base64").length);
      assert.ok(init.signal);
      return new Response(null, { status: failStorage ? 503 : 200 });
    }
    if (init.method === "DELETE") { deleted++; return new Response(null, { status: 204 }); }
    throw new Error("Unexpected external call");
  });
  try {
    await processStoryboardImage(job);
    assert.equal(state, "succeeded"); assert.equal(calls, 1); assert.equal(uploaded, 1); assert.equal(committed, 1);
    assert.ok(inserted); assert.equal(inserted![1], job.script_id); assert.equal(inserted![2], job.user_id);
    assert.equal((inserted![7] as { provider: string }).provider, job.provider);
    assert.equal(JSON.stringify(inserted).includes("private-worker-test-token"), false);
    state = "running"; job = { ...job, model: "other-model" };
    await processStoryboardImage(job); assert.equal(state, "failed"); assert.equal(calls, 1);
    job = makeJob(); locked = true; state = "running";
    await processStoryboardImage(job); assert.match(failure, /khóa/); assert.equal(calls, 1);
    locked = false; scriptExists = false; state = "running";
    await processStoryboardImage(job); assert.match(failure, /không còn/); assert.equal(calls, 1);
    scriptExists = true; providerStatus = 429; state = "running";
    await processStoryboardImage(job); assert.match(failure, /hạn mức/); assert.equal(calls, 2); assert.equal(uploaded, 1);
    providerStatus = 200; failStorage = true; state = "running";
    await processStoryboardImage(job); assert.equal(state, "failed"); assert.equal(deleted, 1);
    failStorage = false; deleteAfterUpload = true; state = "running";
    await processStoryboardImage(job); assert.match(failure, /đã bị xóa/); assert.equal(deleted, 2); assert.equal(committed, 1);
  } finally { Object.assign(workerConfig.imageGeneration, original); mock.restoreAll(); await workerDatabase.end(); }
});

test("queue claim locks rows atomically and recovery fails interrupted requests instead of retrying them", async () => {
  let calls = 0;
  mock.method(workerDatabase, "query", async (sql: string) => {
    calls++;
    if (sql.includes("RETURNING")) { assert.match(sql, /FOR UPDATE SKIP LOCKED/); return { rows: [makeJob()], rowCount: 1 }; }
    assert.match(sql, /status = 'failed'/); assert.equal(sql.includes("status = 'queued',"), false);
    return { rows: [], rowCount: 1 };
  });
  try { assert.ok(await claimNextStoryboardImageJob()); await recoverInterruptedStoryboardImages(); assert.equal(calls, 2); }
  finally { mock.restoreAll(); }
});
