import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { GeminiAiProvider } from "@creator-flow/ai-provider";
import type { AiKeySettingsDto, ContentPlanItemDto, ContentPlanStateDto, ContentPlanVersionDto, DirectionVersionDto, ScriptDocumentDto, ScriptWorkspaceDto } from "@creator-flow/contracts";
import { parsePlanBrief, parsePlanItems, parseWeekStart, validatePlanSchedule } from "../src/modules/content-plan/contentPlan.schema.js";

const items: ContentPlanItemDto[] = Array.from({ length: 7 }, (_, dayIndex) => ({
  id: `item-${dayIndex}`, dayIndex, pillarIndex: dayIndex % 3, objective: "Giá trị", platform: "TikTok", format: "Video ngắn",
  title: `Ý tưởng ${dayIndex + 1}`, angle: "Chia sẻ trải nghiệm nấu ăn tại nhà", hook: "Một bữa tối trong 15 phút?", cta: "Lưu lại để thử nhé", productionNotes: "Quay bằng điện thoại",
}));
const scriptConcepts = ["pain", "curiosity", "contrarian", "story", "confession", "experience"].map((angleType, index) => ({
  angleType,
  label: `Góc ${index + 1}`,
  angle: `Cách kể khác biệt ${index + 1}`,
  hook: `Hook cụ thể ${index + 1}`,
  tension: `Mâu thuẫn rõ ràng ${index + 1}`,
  development: `Phát triển từ trải nghiệm đến bài học ${index + 1}`,
  creatorPrompt: `Chi tiết thật nào phù hợp với góc ${index + 1}?`,
  whyItFits: "Phù hợp với Creator DNA đã lưu.",
  fitScore: 80 + index,
}));
const generatedScript = {
  hook: "[0:00–0:04] Tôi đã quay 12 lần nhưng chưa đăng lần nào.",
  body: "[0:04–0:14] Tôi cứ chờ một phiên bản hoàn hảo. Mâu thuẫn là càng chờ, tôi càng không học được gì.\n[0:14–0:25] Khi đăng bản chưa hoàn hảo đầu tiên, tôi nhận ra phản hồi thật hữu ích hơn mọi phỏng đoán. Góc nhìn của tôi bây giờ là: video đầu tiên không cần chứng minh năng lực, nó chỉ cần bắt đầu một cuộc đối thoại.",
  cta: "[0:25–0:30] Bạn đang giữ video nào trong bản nháp? Kể mình nghe một lý do nhé.",
  storyboard: [
    {
      title: "Bản nháp thứ 12",
      visual: "Mở thư mục có nhiều video nháp trên điện thoại.",
      visualPurpose: "Cho thấy sự trì hoãn bằng một chi tiết cụ thể.",
      broll: "Ngón tay lướt qua danh sách bản nháp.",
      dialogue: "Tôi đã quay 12 lần nhưng chưa đăng lần nào.",
      emotionalBeat: "Ngượng ngùng rồi tò mò",
      transition: "Cắt theo động tác khóa màn hình.",
      retentionRole: "Mở mâu thuẫn và hứa hẹn lời giải.",
      direction: "Cận cảnh, chữ số 12 xuất hiện để giữ chân.",
      durationSeconds: 5,
    },
    {
      title: "Bấm đăng",
      visual: "Ngón tay dừng ở nút đăng rồi nhấn xuống.",
      visualPurpose: "Biến bài học thành một hành động nhìn thấy được.",
      broll: "Phản ứng nhẹ sau khi video được đăng.",
      dialogue: "Phản hồi thật hữu ích hơn mọi phỏng đoán.",
      emotionalBeat: "Nhẹ nhõm",
      transition: "Dừng hình ở câu hỏi CTA.",
      retentionRole: "Khép bài học và mở hội thoại.",
      direction: "Đổi từ cận cảnh sang trung cảnh, giữ CTA trên màn hình.",
      durationSeconds: 8,
    },
  ],
};
test("validates real dates, flexible weekly volume and shooting constraints", () => {
  assert.equal(parseWeekStart("2028-02-29"), "2028-02-29");
  for (const value of ["2026-02-29", "2026-13-01", "today", "2026-09-05T00:00:00Z"]) assert.throws(() => parseWeekStart(value));
  assert.deepEqual(parsePlanItems(items, 3), items);
  assert.equal(parsePlanItems(items.slice(0, 3), 3).length, 3);
  assert.equal(parsePlanItems([{ ...items[0]!, title: "" }], 3, undefined, true)[0]!.title, "");
  for (const value of [[], items.map((item) => ({ ...item, id: "duplicate" })), items.map((item) => ({ ...item, pillarIndex: 3 })), items.map((item) => ({ ...item, title: "" }))]) assert.throws(() => parsePlanItems(value, 3));
  const brief = parsePlanBrief({
    name: "Kế hoạch nội dung 01",
    weekStart: "2026-09-07",
    focus: "Quay gọn trong tuần",
    availableDays: [0, 1, 2],
    weeklyVideoTarget: 3,
  });
  assert.deepEqual(validatePlanSchedule(items.slice(0, 3), brief), items.slice(0, 3));
  assert.throws(() => validatePlanSchedule(items.slice(0, 2), brief));
  assert.equal(parsePlanBrief({ ...brief, weeklyVideoTarget: 4 }).weeklyVideoTarget, 4);
  const batchBrief = parsePlanBrief({ ...brief, availableDays: [5], weeklyVideoTarget: 3 });
  const batchItems = items.slice(0, 3).map((item) => ({ ...item, dayIndex: 5 }));
  assert.deepEqual(validatePlanSchedule(parsePlanItems(batchItems, 3), batchBrief), batchItems);
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
    const output = request.schemaName === "connection_test"
      ? { ok: true }
      : request.schemaName === "script_brainstorm_v1"
        ? { concepts: scriptConcepts }
        : request.schemaName === "content_script_v2"
          ? generatedScript
          : malformed ? { items: [] } : { items };
    return { provider: "google-gemini" as const, model: "test-model", output: output as T };
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
      assert.equal((await request("/scripts/brainstorm", "POST", {}, "")).status, 401);
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
    await t.test("exposes the latest draft, preserves the latest approval and enforces ownership", async () => {
      const state = await (await request("/content-plan?weekStart=2026-09-07")).json() as ContentPlanStateDto;
      assert.equal(state.latestDirection!.id, draftDirection.id);
      assert.equal(state.latestApprovedDirection!.id, direction.id);
      assert.equal((await request("/content-plan/generate", "POST", generation, cookies[1])).status, 404);
      const draftResponse = await request("/content-plan/versions", "POST", {
        planId: null,
        baseVersion: 0,
        brief: { name: "Kiểm tra định hướng nháp", weekStart: "2026-09-21", focus: "" },
        directionId: draftDirection.id,
        items,
        status: "draft",
      });
      assert.equal(draftResponse.status, 201);
      const draftPlan = await draftResponse.json() as ContentPlanVersionDto;
      assert.equal(draftPlan.direction.id, draftDirection.id);
      assert.equal(draftPlan.status, "draft");
      assert.equal((await request("/content-plan/versions", "POST", {
        planId: null,
        baseVersion: 0,
        brief: { name: "Không được chốt", weekStart: "2026-09-28", focus: "" },
        directionId: draftDirection.id,
        items,
        status: "approved",
      })).status, 409);
      await database.query("DELETE FROM content_plans WHERE id = $1 AND user_id = $2", [draftPlan.planId, ids[0]]);
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
      const response = await request("/content-plan/generate", "POST", { ...generation, baseVersion: 1, itemId: items[2]!.id, items: current });
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
    await t.test("linked scripts follow a newly approved plan without losing custom edits", async () => {
      const state = await (await request("/content-plan?weekStart=2026-09-07")).json() as ContentPlanStateDto;
      const planId = state.activePlanId!;
      const createdResponse = await request("/scripts", "POST", {
        mode: "manual", title: items[0]!.title, brief: "", scheduledFor: "2026-09-07",
        platform: items[0]!.platform, format: items[0]!.format, contentPlanId: planId,
        contentPlanItemId: state.versions[0]!.items[0]!.id,
        dayIndex: 0,
      });
      assert.equal(createdResponse.status, 201);
      const created = await createdResponse.json() as ScriptDocumentDto;
      const editedResponse = await request(`/scripts/${created.id}`, "PUT", {
        revision: created.revision,
        title: created.title,
        status: created.status,
        creativeStrategy: created.creativeStrategy,
        content: { ...created.content, body: "Phần nội dung tôi đã tự viết" },
        settings: created.settings,
        advancedSettings: created.advancedSettings,
      });
      assert.equal(editedResponse.status, 200);
      const changedItems = items.map((item, index) => index === 0 ? {
        ...item,
        title: "Ý tưởng đã đổi",
        angle: "Góc triển khai mới",
        hook: "Hook mới từ kế hoạch",
      } : item);
      const approved = await request("/content-plan/versions", "POST", {
        planId,
        baseVersion: 3,
        brief: { weekStart: "2026-09-07", focus: "Công thức nhanh" },
        directionId: direction.id,
        items: changedItems,
        status: "approved",
      });
      assert.equal(approved.status, 201);
      const scripts = await (await request("/scripts")).json() as ScriptWorkspaceDto;
      const synced = scripts.scripts.find((script) => script.id === created.id)!;
      assert.equal(synced.title, "Ý tưởng đã đổi");
      assert.equal(synced.content.hook, "Hook mới từ kế hoạch");
      assert.equal(synced.content.body, "Phần nội dung tôi đã tự viết");
      assert.equal(synced.planReference?.contentPlanVersion, 4);
      assert.ok(synced.planReference?.sync.preservedFields.includes("body"));
    });
    await t.test("keeps multiple named plans and timelines separate", async () => {
      const response = await request("/content-plan/versions", "POST", {
        planId: null,
        baseVersion: 0,
        brief: { name: "Kế hoạch nội dung 02", weekStart: "2026-09-07", focus: "Một series khác", availableDays: [1, 3, 5], weeklyVideoTarget: 3 },
        directionId: direction.id,
        items: [items[1], items[3], items[5]],
        status: "approved",
      });
      assert.equal(response.status, 201);
      const second = await response.json() as ContentPlanVersionDto;
      const state = await (await request(`/content-plan?planId=${second.planId}`)).json() as ContentPlanStateDto;
      assert.equal(state.plans.length, 2);
      assert.equal(state.activePlanId, second.planId);
      assert.equal(state.versions[0]!.brief.name, "Kế hoạch nội dung 02");
      assert.deepEqual(state.versions[0]!.items.map((item) => item.dayIndex), [1, 3, 5]);
    });
    await t.test("brainstorms distinct angles before developing the creator's selected concept", async () => {
      const experience = "Tôi đã quay 12 lần nhưng chưa dám đăng video đầu tiên.";
      const brainstormResponse = await request("/scripts/brainstorm", "POST", {
        title: "Video đầu tiên không cần hoàn hảo",
        brief: "Gần gũi nhưng có quan điểm",
        scheduledFor: null,
        platform: "TikTok",
        format: "Video ngắn",
        targetDurationSeconds: 30,
        creatorExperience: experience,
        ctaStyle: "Mở hội thoại",
        optionCount: 6,
      });
      assert.equal(brainstormResponse.status, 200);
      const brainstorm = await brainstormResponse.json() as { concepts: Array<typeof scriptConcepts[number] & { id: string }>; recommendedId: string };
      assert.equal(brainstorm.concepts.length, 6);
      assert.equal(new Set(brainstorm.concepts.map((concept) => concept.angleType)).size, 6);
      assert.equal(brainstorm.recommendedId, brainstorm.concepts[5]!.id);
      assert.match(lastPrompt, /quay 12 lần/);

      const selectedConcept = brainstorm.concepts.find((concept) => concept.id === brainstorm.recommendedId)!;
      const createResponse = await request("/scripts", "POST", {
        mode: "ai",
        title: "Video đầu tiên không cần hoàn hảo",
        brief: "Gần gũi nhưng có quan điểm",
        scheduledFor: null,
        platform: "TikTok",
        format: "Video ngắn",
        targetDurationSeconds: 30,
        creatorExperience: experience,
        ctaStyle: "Mở hội thoại",
        selectedConcept,
      });
      assert.equal(createResponse.status, 201);
      const script = await createResponse.json() as ScriptDocumentDto;
      assert.equal(script.settings.targetDurationSeconds, 30);
      assert.equal(script.creativeStrategy.selectedConcept?.id, selectedConcept.id);
      assert.equal(script.creativeStrategy.creatorExperience, experience);
      assert.equal(script.content.storyboard[0]!.visualPurpose, generatedScript.storyboard[0]!.visualPurpose);
      assert.match(lastPrompt, /recommendedWords/);
      assert.match(lastPrompt, /Mở hội thoại/);
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
