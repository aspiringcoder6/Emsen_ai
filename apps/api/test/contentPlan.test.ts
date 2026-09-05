import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { GeminiAiProvider } from "@creator-flow/ai-provider";
import type { AiKeySettingsDto, ContentPlanItemDto, ContentPlanStateDto, ContentPlanVersionDto, DirectionVersionDto } from "@creator-flow/contracts";
import { parsePlanItems, parseWeekStart } from "../src/modules/content-plan/contentPlan.schema.js";

const items: ContentPlanItemDto[] = Array.from({ length: 7 }, (_, dayIndex) => ({
  dayIndex, pillarIndex: dayIndex % 3, objective: "Giá trị", platform: "TikTok", format: "Video ngắn",
  title: `Ý tưởng ${dayIndex + 1}`, angle: "Chia sẻ trải nghiệm nấu ăn tại nhà", hook: "Một bữa tối trong 15 phút?", cta: "Lưu lại để thử nhé", productionNotes: "Quay bằng điện thoại",
}));
test("validates real dates, seven distinct days and direction-bound pillars", () => {
  assert.equal(parseWeekStart("2028-02-29"), "2028-02-29");
  for (const value of ["2026-02-29", "2026-13-01", "today", "2026-09-05T00:00:00Z"]) assert.throws(() => parseWeekStart(value));
  assert.deepEqual(parsePlanItems(items, 3), items);
  for (const value of [items.slice(0, 6), items.map((item) => ({ ...item, dayIndex: 0 })), items.map((item) => ({ ...item, pillarIndex: 3 })), items.map((item) => ({ ...item, title: "" }))]) assert.throws(() => parsePlanItems(value, 3));
});

test("content planning and per-user API keys integration", async (t) => {
  process.env.GEMINI_API_KEY = "workspace-test-key";
  process.env.AI_KEY_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  const { database } = await import("../src/database/pool.js");
  const { migrateDatabase } = await import("../src/database/migrate.js");
  const { createApp } = await import("../src/app.js");
  const { createSession } = await import("../src/modules/auth/session.js");
  const { saveDirection } = await import("../src/modules/direction/direction.service.js");
  const { getUserAiProvider } = await import("../src/modules/ai/aiKey.service.js");
  const { decryptApiKey } = await import("../src/modules/ai/keyEncryption.js");
  const { config } = await import("../src/config.js");
  await migrateDatabase();
  const ids = [randomUUID(), randomUUID()];
  const cookies: string[] = [];
  const original = GeminiAiProvider.prototype.generateStructured;
  const personalKey = "test-personal-key-for-user-one-1234";
  let fail = false;
  let malformed = false;
  let lastKey = "";
  let lastPrompt = "";
  GeminiAiProvider.prototype.generateStructured = async function <T>(request: { schemaName: string; userPrompt: string }) {
    lastKey = (this as unknown as { apiKey: string }).apiKey;
    lastPrompt = request.userPrompt;
    if (fail) throw new Error(`Provider error with sensitive key ${personalKey}`);
    return { provider: "google-gemini" as const, model: "test-model", output: (request.schemaName === "connection_test" ? { ok: true } : malformed ? { items: [] } : { items }) as T };
  };
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/api`;
  const request = (path: string, method = "GET", body?: unknown, cookie = cookies[0]) => fetch(url + path, {
    method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  try {
    for (const id of ids) {
      await database.query("INSERT INTO users (id,email,display_name,password_hash,terms_accepted_at) VALUES ($1,$2,'Plan test','unused-test-hash',NOW())", [id, `plan-test-${id}@example.invalid`]);
      await database.query("INSERT INTO creator_dna_profiles (user_id,niche,boundaries) VALUES ($1,'Nấu ăn','Không phóng đại công dụng')", [id]);
      cookies.push(`${config.session.cookieName}=${(await createSession(id, false)).token}`);
    }
    const directionInput = {
      baseVersion: 0, brief: { goal: "Xây cộng đồng nấu ăn", notes: "" }, status: "approved" as const,
      content: { positioning: "Nấu ăn đơn giản", tone: "Gần gũi", audience: "Người bận rộn", pillars: [40, 35, 25].map((percentage, index) => ({ name: `Trụ cột ${index}`, description: "Trải nghiệm thực tế", percentage, examples: ["Một bữa cơm nhà"] })) },
    };
    const direction = await saveDirection(ids[0]!, directionInput);
    const draftDirection = await saveDirection(ids[0]!, { ...directionInput, baseVersion: 1, status: "draft" });
    const brief = { weekStart: "2026-09-07", focus: "Công thức nhanh" };
    const generation = { baseVersion: 0, brief, directionId: direction.id };
    await t.test("all routes require authentication", async () => {
      for (const path of ["/settings/ai-key", "/content-plan?weekStart=2026-09-07"]) assert.equal((await request(path, "GET", undefined, "")).status, 401);
    });
    await t.test("personal key is verified, encrypted, masked and isolated", async () => {
      const saved = await request("/settings/ai-key", "PUT", { apiKey: personalKey }); assert.equal(saved.status, 200);
      const body = await saved.text(); assert.ok(!body.includes(personalKey)); assert.match(body, /1234/);
      const stored = (await database.query<{ encrypted_key: string }>("SELECT encrypted_key FROM user_ai_keys WHERE user_id = $1", [ids[0]])).rows[0]!.encrypted_key;
      assert.ok(!stored.includes(personalKey)); assert.equal(decryptApiKey(stored, ids[0]!), personalKey);
      assert.throws(() => decryptApiKey(stored, ids[1]!));
      assert.equal((await (await request("/settings/ai-key", "GET", undefined, cookies[1])).json() as AiKeySettingsDto).hasPersonalKey, false);
      const provider = await getUserAiProvider(ids[1]!);
      assert.equal((provider as unknown as { apiKey: string }).apiKey, "workspace-test-key");
    });
    await t.test("failed replacement preserves the saved key and does not expose provider errors", async () => {
      fail = true;
      const response = await request("/settings/ai-key", "PUT", { apiKey: "replacement-key-for-testing-5678" });
      assert.equal(response.status, 502); assert.ok(!(await response.text()).includes(personalKey)); fail = false;
      const provider = await getUserAiProvider(ids[0]!);
      assert.equal((provider as unknown as { apiKey: string }).apiKey, personalKey);
      assert.equal((await request("/settings/ai-key", "PUT", { apiKey: "bad" })).status, 400);
    });
    await t.test("requires an owned approved direction, ignores a later draft", async () => {
      const state = await (await request("/content-plan?weekStart=2026-09-07")).json() as ContentPlanStateDto;
      assert.equal(state.latestApprovedDirection!.id, direction.id);
      assert.equal((await request("/content-plan/generate", "POST", { ...generation, directionId: draftDirection.id })).status, 404);
      assert.equal((await request("/content-plan/generate", "POST", generation, cookies[1])).status, 404);
    });
    await t.test("generates seven days using personal key, DNA and approved direction", async () => {
      const response = await request("/content-plan/generate", "POST", generation); assert.equal(response.status, 201);
      const version = await response.json() as ContentPlanVersionDto;
      assert.equal(version.items.length, 7); assert.equal(version.direction.id, direction.id);
      assert.equal(lastKey, personalKey); assert.match(lastPrompt, /Không phóng đại công dụng/);
      assert.equal(version.dnaSnapshot.profile.niche, "Nấu ăn");
    });
    await t.test("regenerates one day and preserves unsaved edits on other days", async () => {
      const current = items.map((item) => ({ ...item, title: "Bản tôi vừa chỉnh" }));
      const response = await request("/content-plan/generate", "POST", { ...generation, baseVersion: 1, dayIndex: 2, items: current });
      assert.equal(response.status, 201); const version = await response.json() as ContentPlanVersionDto;
      assert.equal(version.items[2]!.title, items[2]!.title); assert.equal(version.items[1]!.title, "Bản tôi vừa chỉnh");
    });
    await t.test("provider errors and invalid output do not change history", async () => {
      fail = true; assert.equal((await request("/content-plan/generate", "POST", { ...generation, baseVersion: 2 })).status, 502); fail = false;
      malformed = true; assert.equal((await request("/content-plan/generate", "POST", { ...generation, baseVersion: 2 })).status, 502); malformed = false;
      const state = await (await request("/content-plan?weekStart=2026-09-07")).json() as ContentPlanStateDto;
      assert.equal(state.versions.length, 2);
    });
    await t.test("approval, history, week isolation and concurrent saves", async () => {
      const body = { ...generation, baseVersion: 2, items, status: "approved" };
      const responses = await Promise.all([request("/content-plan/versions", "POST", body), request("/content-plan/versions", "POST", body)]);
      assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
      const state = await (await request("/content-plan?weekStart=2026-09-07")).json() as ContentPlanStateDto;
      assert.equal(state.versions[0]!.status, "approved"); assert.equal(state.versions.length, 3);
      assert.equal((await (await request("/content-plan?weekStart=2026-09-14")).json() as ContentPlanStateDto).versions.length, 0);
      assert.equal((await (await request("/content-plan?weekStart=2026-09-07", "GET", undefined, cookies[1])).json() as ContentPlanStateDto).versions.length, 0);
    });
    await t.test("removal affects only personal key and restores shared connection", async () => {
      const response = await request("/settings/ai-key", "DELETE"); assert.equal(response.status, 200);
      assert.equal((await response.json() as AiKeySettingsDto).source, "workspace");
      assert.equal((await database.query("SELECT 1 FROM user_ai_keys WHERE user_id = $1", [ids[0]])).rowCount, 0);
    });
  } finally {
    GeminiAiProvider.prototype.generateStructured = original;
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await database.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [ids]);
    await database.end();
  }
});
