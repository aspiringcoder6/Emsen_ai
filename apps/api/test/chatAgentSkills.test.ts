import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
  GeminiAiProvider,
  type StructuredGenerationRequest,
} from "@creator-flow/ai-provider";
import type {
  ChatStateDto,
  DirectionContentDto,
  DirectionStateDto,
  SendChatMessageResponseDto,
} from "@creator-flow/contracts";

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

test("chat executes Creator DNA and Direction work through registered skills", async () => {
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
        skillCall: { goal: "", instruction: "", name: "none", section: "all" },
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
  } finally {
    GeminiAiProvider.prototype.generateStructured = originalGenerate;
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await database.query("DELETE FROM users WHERE id = $1", [userId]);
    await database.end();
  }
});
