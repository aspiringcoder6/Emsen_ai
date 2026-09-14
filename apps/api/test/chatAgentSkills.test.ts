import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
  GeminiAiProvider,
  type StructuredGenerationRequest,
} from "@creator-flow/ai-provider";
import type {
  ChatStateDto,
  ContentPlanStateDto,
  DirectionContentDto,
  DirectionStateDto,
  SendChatMessageResponseDto,
} from "@creator-flow/contracts";
import { emptyAgentChatSkillCall } from "../src/modules/agent/agentChatPlanner.js";

const directionContent: DirectionContentDto = {
  audience: "Người mới muốn làm nội dung đều đặn.",
  pillars: [40, 35, 25].map((percentage, index) => ({
    description: "Hướng nội dung thực tế và dễ bắt đầu.",
    examples: ["Một ý tưởng có thể quay ngay"],
    name: `Trụ cột ${index + 1}`,
    percentage,
  })),
  positioning: "Người bạn đồng hành giúp người mới làm content dễ hơn.",
  tone: "Gần gũi và rõ ràng.",
};

test("chat executes Creator DNA, Direction and Content Plan work through registered skills", async () => {
  process.env.GEMINI_API_KEY = "chat-agent-skill-test-placeholder";
  const { createApp } = await import("../src/app.js");
  const { database } = await import("../src/database/pool.js");
  const { migrateDatabase } = await import("../src/database/migrate.js");
  const { createSession } = await import("../src/modules/auth/session.js");
  const { saveDirection } = await import("../src/modules/direction/direction.service.js");
  const { config } = await import("../src/config.js");
  await migrateDatabase();

  const userId = randomUUID();
  const originalGenerate = GeminiAiProvider.prototype.generateStructured;
  let lastPlanInstruction: string | null = null;
  GeminiAiProvider.prototype.generateStructured = async function <TOutput>(
    request: StructuredGenerationRequest,
  ) {
    if (request.schemaName === "master_direction_v1") {
      return {
        model: "agent-skill-test-model",
        output: { ...directionContent, tone: "Ấm áp, đơn giản và khích lệ." } as TOutput,
        provider: "google-gemini" as const,
      };
    }
    if (request.schemaName === "content_plan_v2") {
      const payload = JSON.parse(request.userPrompt) as {
        brief: {
          availableDays: number[] | null;
          weeklyVideoTarget: number | null;
        };
        instruction: string | null;
      };
      lastPlanInstruction = payload.instruction;
      const days = payload.brief.availableDays ?? [0, 2, 4];
      const count = payload.brief.weeklyVideoTarget ?? Math.min(3, days.length);
      return {
        model: "agent-skill-test-model",
        output: {
          items: Array.from({ length: count }, (_, index) => ({
            angle: `Góc khai thác ${index + 1}`,
            cta: "Lưu lại để thực hành.",
            dayIndex: days[index % days.length],
            format: "Video ngắn",
            hook: `Mở đầu ${index + 1}`,
            objective: "Giá trị",
            pillarIndex: index % directionContent.pillars.length,
            platform: "TikTok",
            productionNotes: "Quay trong một buổi.",
            title: `Nội dung ${index + 1}`,
          })),
        } as TOutput,
        provider: "google-gemini" as const,
      };
    }
    const isDnaAnswer = request.userPrompt.includes("bài học từ lần đầu");
    return {
      model: "agent-skill-test-model",
      output: {
        extractedSignals: isDnaAnswer
          ? [
              {
                category: "Kho câu chuyện",
                confidence: 90,
                evidence: "bài học từ lần đầu quay video",
                summary: "Có câu chuyện về lần đầu quay video.",
              },
            ]
          : [],
        nextQuestionId: "none",
        reply: "Mình đã hiểu yêu cầu.",
        // Return none deliberately: the deterministic Vietnamese guard must still
        // recognize read/update commands before product data can be touched.
        skillCall: emptyAgentChatSkillCall(),
      } as TOutput,
      provider: "google-gemini" as const,
    };
  };

  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    await database.query(
      "INSERT INTO users (id, email, display_name, password_hash, terms_accepted_at) VALUES ($1, $2, 'Chat skill test', 'unused-test-hash', NOW())",
      [userId, `chat-skill-${userId}@example.invalid`],
    );
    await database.query(
      "INSERT INTO creator_dna_profiles (user_id, niche, boundaries) VALUES ($1, 'Làm content cho người mới', 'Không hứa hẹn kết quả')",
      [userId],
    );
    const session = await createSession(userId, false);
    const cookie = `${config.session.cookieName}=${session.token}`;
    const url = `http://127.0.0.1:${address.port}/api/chat`;
    const request = (body?: { content: string; currentPage: string }) =>
      fetch(body ? `${url}/messages` : url, {
        ...(body ? { body: JSON.stringify(body), method: "POST" } : {}),
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
        },
      });

    const initial = (await (await request()).json()) as ChatStateDto;
    const proactive = initial.messages.find((message) => message.collectionIntent);
    assert.ok(proactive);
    assert.equal(
      proactive.skillRuns[0]?.name,
      "creator_dna.ask_proactive_question",
    );

    const dnaResponse = await request({
      content: "Mình muốn kể bài học từ lần đầu quay video.",
      currentPage: "Creator DNA",
    });
    assert.equal(dnaResponse.status, 201);
    const dnaChat = (await dnaResponse.json()) as SendChatMessageResponseDto;
    assert.equal(dnaChat.assistantMessage.learnedSignals.length, 1);
    assert.equal(
      dnaChat.assistantMessage.skillRuns.at(-1)?.name,
      "creator_dna.capture_chat_signals",
    );

    const approved = await saveDirection(userId, {
      baseVersion: 0,
      brief: { goal: "Giúp người mới bắt đầu làm content", notes: "" },
      content: directionContent,
      status: "approved",
    });

    const readResponse = await request({
      content: "Emsen, nói cho mình định hướng hiện tại nhé.",
      currentPage: "Tổng quan",
    });
    assert.equal(readResponse.status, 201);
    const readChat = (await readResponse.json()) as SendChatMessageResponseDto;
    assert.match(readChat.assistantMessage.content, /Giúp người mới bắt đầu làm content/);
    assert.equal(readChat.assistantMessage.skillRuns[0]?.name, "direction.get_current");
    assert.equal(readChat.assistantMessage.skillRuns[0]?.targetId, approved.id);

    const updateResponse = await request({
      content: "Hãy đổi giọng điệu trong định hướng thành ấm áp hơn.",
      currentPage: "Định hướng",
    });
    assert.equal(updateResponse.status, 201);
    const updateChat = (await updateResponse.json()) as SendChatMessageResponseDto;
    assert.equal(updateChat.assistantMessage.skillRuns[0]?.name, "direction.update_draft");
    assert.equal(updateChat.assistantMessage.skillRuns[0]?.targetVersion, 2);
    const direction = (await (
      await fetch(`http://127.0.0.1:${address.port}/api/direction`, {
        headers: { Cookie: cookie },
      })
    ).json()) as DirectionStateDto;
    assert.equal(direction.versions[0]?.status, "draft");
    assert.equal(direction.versions[0]?.content.tone, "Ấm áp, đơn giản và khích lệ.");
    assert.equal(direction.versions[1]?.status, "approved");

    const createPlanResponse = await request({
      content: "Tạo kế hoạch nội dung tuần này, mình rảnh thứ 3 và thứ 7, mục tiêu 3 video.",
      currentPage: "Kế hoạch nội dung",
    });
    assert.equal(createPlanResponse.status, 201);
    const createPlanChat = (await createPlanResponse.json()) as SendChatMessageResponseDto;
    assert.equal(
      createPlanChat.assistantMessage.skillRuns[0]?.name,
      "content_plan.generate_draft",
    );
    const planId = createPlanChat.assistantMessage.skillRuns[0]?.targetId;
    assert.ok(planId);

    const updatePlanResponse = await request({
      content: "Cập nhật Kế hoạch nội dung 01, chuyển lịch sang thứ 6, mục tiêu 2 video và ưu tiên nội dung dễ quay.",
      currentPage: "Kế hoạch nội dung",
    });
    assert.equal(updatePlanResponse.status, 201);
    const updatePlanChat = (await updatePlanResponse.json()) as SendChatMessageResponseDto;
    assert.equal(
      updatePlanChat.assistantMessage.skillRuns[0]?.name,
      "content_plan.update_draft",
    );
    assert.equal(updatePlanChat.assistantMessage.skillRuns[0]?.targetVersion, 2);
    const planState = (await (
      await fetch(
        `http://127.0.0.1:${address.port}/api/content-plan?planId=${planId}`,
        { headers: { Cookie: cookie } },
      )
    ).json()) as ContentPlanStateDto;
    assert.equal(planState.versions[0]?.items.length, 2);
    assert.ok(planState.versions[0]?.items.every(({ dayIndex }) => dayIndex === 4));
    assert.equal(planState.versions[0]?.direction.id, direction.versions[0]?.id);
    assert.equal(planState.versions[0]?.direction.status, "draft");
    assert.match(lastPlanInstruction ?? "", /ưu tiên nội dung dễ quay/);
  } finally {
    GeminiAiProvider.prototype.generateStructured = originalGenerate;
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await database.query("DELETE FROM users WHERE id = $1", [userId]);
    await database.end();
  }
});
