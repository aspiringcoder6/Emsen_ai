import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { GeminiAiProvider } from "@creator-flow/ai-provider";
import type { DirectionContentDto, DirectionStateDto, DirectionVersionDto } from "@creator-flow/contracts";
import { parseContent } from "../src/modules/direction/direction.schema.js";

const content: DirectionContentDto = {
  positioning: "Chia sẻ công thức nấu ăn tại nhà dễ thực hiện.",
  tone: "Gần gũi, nhẹ nhàng; không phóng đại tác dụng của thực phẩm.",
  audience: "Người muốn tự nấu bữa ăn đơn giản.",
  pillars: [40, 35, 25].map((percentage, index) => ({
    name: `Nhóm nội dung ${index + 1}`, description: "Các công thức và trải nghiệm thực tế.", percentage, examples: ["Một bữa cơm đơn giản sau giờ làm"],
  })),
};
const brief = { goal: "Xây cộng đồng nấu ăn tại nhà", notes: "Không nói quá công dụng" };

test("validate direction ratios, distinct pillars and complete structured fields", () => {
  assert.deepEqual(parseContent(content), content);
  for (const bad of [null, { ...content, tone: "" }, { ...content, pillars: [] },
    { ...content, pillars: content.pillars.map((pillar) => ({ ...pillar, percentage: 20 })) },
    { ...content, pillars: content.pillars.map((pillar) => ({ ...pillar, name: "Trùng tên" })) },
    { ...content, pillars: content.pillars.map((pillar) => ({ ...pillar, examples: [" "] })) },
  ]) assert.throws(() => parseContent(bad));
});

test("direction API persists isolated versions and preserves work on AI/concurrency failures", async (t) => {
  // Use the local database with disposable, uniquely identified fixtures. No live AI calls.
  process.env.GEMINI_API_KEY = "direction-test-placeholder";
  const { createApp } = await import("../src/app.js");
  const { database } = await import("../src/database/pool.js");
  const { migrateDatabase } = await import("../src/database/migrate.js");
  const { createSession } = await import("../src/modules/auth/session.js");
  const { config } = await import("../src/config.js");
  await migrateDatabase();
  const ids = [randomUUID(), randomUUID()];
  const cookies: string[] = [];
  const originalGenerate = GeminiAiProvider.prototype.generateStructured;
  let failAi = false;
  let invalidAi = false;
  let lastPrompt = "";
  GeminiAiProvider.prototype.generateStructured = async function <T>(request: { userPrompt: string }) {
    lastPrompt = request.userPrompt;
    if (failAi) throw new Error("Simulated provider timeout");
    return { output: (invalidAi ? { tone: "invalid" } : { ...content, tone: "Giọng điệu mới từ AI" }) as T, model: "test-model", provider: "google-gemini" as const };
  };
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/api/direction`;
  const request = (path = "", body?: unknown, cookie = cookies[0]) => fetch(url + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  try {
    for (const id of ids) {
      await database.query("INSERT INTO users (id, email, display_name, password_hash, terms_accepted_at) VALUES ($1, $2, 'Direction test', 'unused-test-hash', NOW())", [id, `direction-test-${id}@example.invalid`]);
      await database.query("INSERT INTO creator_dna_profiles (user_id, niche, boundaries) VALUES ($1, $2, $3)", [id, "Nấu ăn", "Không phóng đại công dụng"]);
      const session = await createSession(id, false);
      cookies.push(`${config.session.cookieName}=${session.token}`);
    }
    await t.test("requires authentication", async () => { assert.equal((await request("", undefined, "")).status, 401); });
    await t.test("generates from real DNA and stores snapshot", async () => {
      const response = await request("/generate", { baseVersion: 0, brief, section: "all" });
      assert.equal(response.status, 201);
      const saved = await response.json() as DirectionVersionDto;
      assert.equal(saved.version, 1); assert.equal(saved.source, "ai"); assert.equal(saved.status, "draft");
      assert.equal(saved.dnaSnapshot.profile.niche, "Nấu ăn");
      assert.match(lastPrompt, /Không phóng đại công dụng/);
    });
    await t.test("regeneration keeps untouched sections including unsaved edits", async () => {
      const response = await request("/generate", { baseVersion: 1, brief, section: "tone", content: { ...content, positioning: "Định vị tôi vừa sửa" } });
      assert.equal(response.status, 201);
      const saved = await response.json() as DirectionVersionDto;
      assert.equal(saved.content.positioning, "Định vị tôi vừa sửa");
      assert.equal(saved.content.tone, "Giọng điệu mới từ AI");
    });
    await t.test("AI errors and malformed AI outputs do not write versions", async () => {
      failAi = true;
      assert.equal((await request("/generate", { baseVersion: 2, brief, section: "all" })).status, 502);
      failAi = false; invalidAi = true;
      assert.equal((await request("/generate", { baseVersion: 2, brief, section: "all" })).status, 502);
      invalidAi = false;
      const state = await (await request()).json() as DirectionStateDto;
      assert.equal(state.versions.length, 2);
    });
    await t.test("validates ratios, section and base version before storage", async () => {
      for (const body of [
        { baseVersion: 2, brief, content: { ...content, pillars: [] }, status: "draft" },
        { baseVersion: -1, brief, content, status: "draft" },
      ]) assert.equal((await request("/versions", body)).status, 400);
      assert.equal((await request("/generate", { baseVersion: 2, brief, section: "unknown" })).status, 400);
    });
    await t.test("approval persists and history remains immutable", async () => {
      const response = await request("/versions", { baseVersion: 2, brief, content, status: "approved" });
      assert.equal(response.status, 201);
      const state = await (await request()).json() as DirectionStateDto;
      assert.equal(state.versions.length, 3);
      assert.equal(state.versions[0]!.status, "approved");
      assert.equal(state.versions[1]!.content.positioning, "Định vị tôi vừa sửa");
      assert.equal(state.versions[2]!.version, 1);
    });
    await t.test("other users cannot read or overwrite versions", async () => {
      const state = await (await request("", undefined, cookies[1])).json() as DirectionStateDto;
      assert.equal(state.versions.length, 0);
      assert.equal((await request("/versions", { baseVersion: 3, brief, content, status: "draft" }, cookies[1])).status, 409);
    });
    await t.test("concurrent saves cannot overwrite each other", async () => {
      const body = { baseVersion: 3, brief, content, status: "draft" };
      const results = await Promise.all([request("/versions", body), request("/versions", body)]);
      assert.deepEqual(results.map((response) => response.status).sort(), [201, 409]);
      const state = await (await request()).json() as DirectionStateDto;
      assert.equal(state.versions.length, 4);
      assert.equal(state.versions.find((version) => version.status === "approved")!.version, 3);
    });
  } finally {
    GeminiAiProvider.prototype.generateStructured = originalGenerate;
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    // Only delete the two UUIDs created by this test; cascading removes their fixtures.
    await database.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [ids]);
    await database.end();
  }
});
