import { randomUUID } from "node:crypto";
import type {
  AgentSkillMode,
  AgentSkillName,
  AgentSkillRunDto,
  AiPreferencesDto,
  AiProactiveFrequency,
  ChatCollectionIntentDto,
  ChatMessageDto,
  ChatStateDto,
  CreatorDnaLearningSignalDto,
  CreatorDnaProfileDto,
  CreatorDnaSignalCategory,
  SendChatMessageRequestDto,
  SendChatMessageResponseDto,
} from "@creator-flow/contracts";
import type { PoolClient } from "pg";
import { getAiKeySettings, getUserAiProvider } from "../ai/aiKey.service.js";
import { database } from "../../database/pool.js";
import { HttpError } from "../../shared/http.js";
import { getCreatorDnaState } from "../creator-dna/creatorDna.service.js";
import {
  isDirectionChatSkillCall,
  resolveDirectionSkillCall,
  type DirectionChatSkillCall,
} from "../agent/agentChatPlanner.js";
import { agentSkillRegistry, getAgentSkillCatalog } from "../agent/agentSkills.js";
import type { AgentSkillExecution } from "../agent/agentSkill.registry.js";
import type {
  AskProactiveQuestionInput,
  AskProactiveQuestionOutput,
  CaptureChatSignalsInput,
  CaptureChatSignalsOutput,
} from "../agent/creatorDna.skills.js";
import type {
  DirectionDraftSkillInput,
  DirectionSkillOutput,
  GetCurrentDirectionInput,
} from "../agent/direction.skills.js";
import {
  getNextProactiveQuestion,
  proactiveQuestionIds,
  proactiveQuestions,
} from "./proactiveQuestions.js";

type Queryable = Pick<PoolClient, "query">;

type ConversationRow = { id: string };

type PreferenceRow = {
  last_proactive_at: Date | null;
  proactive_frequency: AiProactiveFrequency;
  proactive_prompt_cursor: number;
};

type MessageRow = {
  collection_intent: unknown;
  content: string;
  created_at: Date;
  id: string;
  model: string | null;
  provider: ChatMessageDto["provider"];
  role: ChatMessageDto["role"];
  skill_runs: unknown;
};

type SignalRow = {
  category: CreatorDnaSignalCategory;
  confidence: number;
  created_at: Date;
  evidence: string;
  id: string;
  origin_message_id: string;
  source: CreatorDnaLearningSignalDto["source"];
  summary: string;
};

type ActiveQuestionRow = {
  collection_intent: unknown;
  id: string;
};

type ChatAiOutput = {
  extractedSignals: Array<{
    category: CreatorDnaSignalCategory;
    confidence: number;
    evidence: string;
    summary: string;
  }>;
  nextQuestionId: string;
  reply: string;
  skillCall: DirectionChatSkillCall;
};


const frequencyIntervalsMs: Record<Exclude<AiProactiveFrequency, "off">, number> = {
  balanced: 3 * 24 * 60 * 60 * 1000,
  frequent: 24 * 60 * 60 * 1000,
  gentle: 7 * 24 * 60 * 60 * 1000,
};

const signalCategories: CreatorDnaSignalCategory[] = [
  "Kho câu chuyện",
  "Chủ đề quen thuộc",
  "Giọng điệu",
  "Khán giả",
  "Sản phẩm phù hợp",
  "Điều cần tránh",
];

const agentSkillNames = new Set<AgentSkillName>(
  getAgentSkillCatalog().map(({ name }) => name),
);
const agentSkillModes = new Set<AgentSkillMode>(["read", "draft-write", "write"]);

function isAgentSkillRun(value: unknown): value is AgentSkillRunDto {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<AgentSkillRunDto>;
  return Boolean(
    typeof candidate.id === "string" &&
      typeof candidate.name === "string" &&
      agentSkillNames.has(candidate.name as AgentSkillName) &&
      typeof candidate.mode === "string" &&
      agentSkillModes.has(candidate.mode as AgentSkillMode) &&
      (candidate.status === "failed" || candidate.status === "succeeded") &&
      typeof candidate.summary === "string" &&
      (candidate.target === null ||
        candidate.target === "creator-dna" ||
        candidate.target === "direction") &&
      (candidate.targetId === null || typeof candidate.targetId === "string") &&
      (candidate.targetVersion === null || Number.isSafeInteger(candidate.targetVersion)) &&
      typeof candidate.executedAt === "string",
  );
}

function parseAgentSkillRuns(value: unknown) {
  return Array.isArray(value) ? value.filter(isAgentSkillRun) : [];
}

const chatResponseSchema = {
  properties: {
    extractedSignals: {
      items: {
        properties: {
          category: { enum: signalCategories, type: "string" },
          confidence: { maximum: 100, minimum: 0, type: "integer" },
          evidence: { description: "Chi tiết ngắn trích từ đúng câu trả lời của người dùng.", type: "string" },
          summary: { description: "Một điều ngắn gọn đáng ghi nhớ về creator.", type: "string" },
        },
        required: ["category", "confidence", "evidence", "summary"],
        type: "object",
      },
      maxItems: 3,
      type: "array",
    },
    nextQuestionId: {
      description: "ID câu hỏi tiếp theo phù hợp, hoặc 'none' nếu không nên hỏi thêm.",
      enum: proactiveQuestionIds,
      type: "string",
    },
    reply: {
      description: "Câu trả lời chính bằng tiếng Việt, chưa bao gồm câu hỏi theo ID.",
      type: "string",
    },
    skillCall: {
      description: "Skill Định hướng cần gọi. Dùng none khi tin nhắn không yêu cầu đọc hoặc thay đổi Định hướng.",
      properties: {
        goal: {
          description: "Mục tiêu kênh người dùng nêu rõ, hoặc chuỗi rỗng nếu chưa có.",
          type: "string",
        },
        instruction: {
          description: "Yêu cầu chỉnh sửa cụ thể của người dùng, hoặc chuỗi rỗng.",
          type: "string",
        },
        name: {
          enum: [
            "none",
            "direction.get_current",
            "direction.generate_draft",
            "direction.update_draft",
          ],
          type: "string",
        },
        section: {
          enum: ["all", "positioning", "tone", "audience", "pillars"],
          type: "string",
        },
      },
      required: ["name", "section", "goal", "instruction"],
      type: "object",
    },
  },
  required: ["reply", "nextQuestionId", "extractedSignals", "skillCall"],
  type: "object",
} satisfies Record<string, unknown>;

function isCollectionIntent(value: unknown): value is ChatCollectionIntentDto {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ChatCollectionIntentDto>;
  return Boolean(
    candidate.kind === "creator-dna" &&
      typeof candidate.promptId === "string" &&
      typeof candidate.question === "string" &&
      typeof candidate.dimension === "string",
  );
}

function isChatAiOutput(value: unknown): value is ChatAiOutput {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ChatAiOutput>;
  return Boolean(
    typeof candidate.reply === "string" &&
      candidate.reply.trim() &&
      typeof candidate.nextQuestionId === "string" &&
      proactiveQuestionIds.includes(candidate.nextQuestionId) &&
      isDirectionChatSkillCall(candidate.skillCall) &&
      Array.isArray(candidate.extractedSignals) &&
      candidate.extractedSignals.length <= 3 &&
      candidate.extractedSignals.every(
        (signal) =>
          signal &&
          signalCategories.includes(signal.category) &&
          Number.isInteger(signal.confidence) &&
          signal.confidence >= 0 &&
          signal.confidence <= 100 &&
          typeof signal.evidence === "string" &&
          signal.evidence.trim() &&
          typeof signal.summary === "string" &&
          signal.summary.trim(),
      ),
  );
}

function nextProactiveDate(row: PreferenceRow) {
  if (row.proactive_frequency === "off") {
    return null;
  }
  if (!row.last_proactive_at) {
    return new Date();
  }
  return new Date(
    row.last_proactive_at.getTime() + frequencyIntervalsMs[row.proactive_frequency],
  );
}

function mapPreferences(row: PreferenceRow): AiPreferencesDto {
  return {
    lastProactiveAt: row.last_proactive_at?.toISOString() ?? null,
    nextProactiveAt: nextProactiveDate(row)?.toISOString() ?? null,
    proactiveFrequency: row.proactive_frequency,
  };
}

async function ensurePreferences(queryable: Queryable, userId: string) {
  const result = await queryable.query<PreferenceRow>(
    `
      INSERT INTO ai_user_preferences (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
      RETURNING proactive_frequency, last_proactive_at, proactive_prompt_cursor
    `,
    [userId],
  );
  return result.rows[0]!;
}

async function ensureConversation(queryable: Queryable, userId: string) {
  const result = await queryable.query<ConversationRow>(
    `
      INSERT INTO chat_conversations (id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
      RETURNING id
    `,
    [randomUUID(), userId],
  );
  return result.rows[0]!.id;
}

async function ensureWelcomeMessage(
  queryable: Queryable,
  conversationId: string,
  userId: string,
) {
  await queryable.query(
    `
      INSERT INTO chat_messages (
        id, conversation_id, user_id, role, content, message_kind, provider, model
      )
      SELECT $1, $2, $3, 'assistant', $4, 'welcome', 'system', 'emsen-welcome-v1'
      WHERE NOT EXISTS (
        SELECT 1 FROM chat_messages WHERE conversation_id = $2 AND message_kind = 'welcome'
      )
    `,
    [
      randomUUID(),
      conversationId,
      userId,
      "Chào bạn, mình là emsen buddy. Mình có thể cùng bạn phát triển ý tưởng, hỗ trợ nội dung và học thêm về chất riêng của bạn qua từng cuộc trò chuyện.",
    ],
  );
}

async function selectProactiveQuestion(
  userId: string,
  cursor: number,
  promptId?: string,
) {
  const input: AskProactiveQuestionInput = {
    cursor,
    ...(promptId ? { promptId } : {}),
  };
  const execution = await agentSkillRegistry.execute<
    AskProactiveQuestionInput,
    AskProactiveQuestionOutput
  >("creator_dna.ask_proactive_question", { userId }, input);
  if (!execution.ok) {
    throw execution.error;
  }
  return execution;
}

function isProactiveDue(row: PreferenceRow) {
  const nextAt = nextProactiveDate(row);
  return Boolean(nextAt && nextAt.getTime() <= Date.now());
}

async function ensureDueProactiveQuestion(userId: string) {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await ensurePreferences(client, userId);
    const preferenceResult = await client.query<PreferenceRow>(
      `SELECT proactive_frequency, last_proactive_at, proactive_prompt_cursor
       FROM ai_user_preferences WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );
    const preference = preferenceResult.rows[0]!;
    const conversationId = await ensureConversation(client, userId);
    await ensureWelcomeMessage(client, conversationId, userId);

    if (isProactiveDue(preference)) {
      const questionExecution = await selectProactiveQuestion(
        userId,
        preference.proactive_prompt_cursor,
      );
      const nextQuestion = questionExecution.output.intent;
      await client.query(
        `
          INSERT INTO chat_messages (
            id, conversation_id, user_id, role, content, message_kind,
            provider, model, collection_intent, skill_runs
          )
          VALUES ($1, $2, $3, 'assistant', $4, 'proactive-question',
                  'system', 'creator-dna-question-bank-v1', $5::jsonb, $6::jsonb)
        `,
        [
          randomUUID(),
          conversationId,
          userId,
          nextQuestion.question,
          JSON.stringify(nextQuestion),
          JSON.stringify([questionExecution.run]),
        ],
      );
      await client.query(
        `UPDATE ai_user_preferences
         SET last_proactive_at = NOW(),
             proactive_prompt_cursor = proactive_prompt_cursor + 1,
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId],
      );
    }

    await client.query("COMMIT");
    return conversationId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function mapSignal(row: SignalRow): CreatorDnaLearningSignalDto {
  return {
    category: row.category,
    confidence: row.confidence,
    createdAt: row.created_at.toISOString(),
    evidence: row.evidence,
    id: row.id,
    source: row.source,
    summary: row.summary,
  };
}

async function getMessages(conversationId: string) {
  const messageResult = await database.query<MessageRow>(
    `
      SELECT id, role, content, provider, model, collection_intent, skill_runs, created_at
      FROM (
        SELECT id, role, content, provider, model, collection_intent, skill_runs, created_at
        FROM chat_messages
        WHERE conversation_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      ) recent
      ORDER BY created_at ASC
    `,
    [conversationId],
  );
  const messageIds = messageResult.rows.map(({ id }) => id);
  const signalsByMessage = new Map<string, CreatorDnaLearningSignalDto[]>();

  if (messageIds.length > 0) {
    const signalResult = await database.query<SignalRow>(
      `SELECT id, source, category, confidence, evidence, summary, created_at, origin_message_id
       FROM creator_dna_signals
       WHERE origin_message_id = ANY($1::uuid[])
       ORDER BY created_at ASC`,
      [messageIds],
    );
    for (const signal of signalResult.rows) {
      const current = signalsByMessage.get(signal.origin_message_id) ?? [];
      current.push(mapSignal(signal));
      signalsByMessage.set(signal.origin_message_id, current);
    }
  }

  return messageResult.rows.map(
    (row): ChatMessageDto => ({
      collectionIntent: isCollectionIntent(row.collection_intent)
        ? row.collection_intent
        : null,
      content: row.content,
      createdAt: row.created_at.toISOString(),
      id: row.id,
      learnedSignals: signalsByMessage.get(row.id) ?? [],
      model: row.model,
      provider: row.provider,
      role: row.role,
      skillRuns: parseAgentSkillRuns(row.skill_runs),
    }),
  );
}

export async function getAiPreferences(userId: string) {
  return mapPreferences(await ensurePreferences(database, userId));
}

export async function updateAiPreferences(
  userId: string,
  proactiveFrequency: AiProactiveFrequency,
) {
  await ensurePreferences(database, userId);
  const result = await database.query<PreferenceRow>(
    `
      UPDATE ai_user_preferences
      SET last_proactive_at = CASE
            WHEN proactive_frequency = 'off' AND $2 <> 'off' THEN NULL
            ELSE last_proactive_at
          END,
          proactive_frequency = $2,
          updated_at = NOW()
      WHERE user_id = $1
      RETURNING proactive_frequency, last_proactive_at, proactive_prompt_cursor
    `,
    [userId, proactiveFrequency],
  );
  return mapPreferences(result.rows[0]!);
}

export async function getChatState(userId: string): Promise<ChatStateDto> {
  const conversationId = await ensureDueProactiveQuestion(userId);
  const [messages, preferences, settings] = await Promise.all([
    getMessages(conversationId),
    getAiPreferences(userId),
    getAiKeySettings(userId),
  ]);

  return {
    ai: { configured: settings.source !== "none", model: settings.model },
    conversationId,
    messages,
    preferences,
  };
}

async function getUnansweredQuestion(conversationId: string) {
  const result = await database.query<ActiveQuestionRow>(
    `
      SELECT assistant.id, assistant.collection_intent
      FROM chat_messages assistant
      WHERE assistant.conversation_id = $1
        AND assistant.role = 'assistant'
        AND assistant.collection_intent IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM chat_messages reply
          WHERE reply.reply_to_message_id = assistant.id
        )
      ORDER BY assistant.created_at DESC
      LIMIT 1
    `,
    [conversationId],
  );
  const row = result.rows[0];
  if (!row || !isCollectionIntent(row.collection_intent)) {
    return null;
  }
  return { id: row.id, intent: row.collection_intent };
}

async function getModelHistory(conversationId: string, currentUserMessageId: string) {
  const result = await database.query<Pick<MessageRow, "content" | "role">>(
    `
      SELECT role, content
      FROM (
        SELECT role, content, created_at
        FROM chat_messages
        WHERE conversation_id = $1 AND id <> $2
        ORDER BY created_at DESC
        LIMIT 18
      ) recent
      ORDER BY created_at ASC
    `,
    [conversationId, currentUserMessageId],
  );
  return result.rows.map((message) => ({
    content: message.content,
    role: message.role === "assistant" ? ("model" as const) : ("user" as const),
  }));
}

function profileContext(profile: CreatorDnaProfileDto) {
  return {
    audience: profile.audience || null,
    boundaries: profile.boundaries || null,
    displayName: profile.displayName || null,
    niche: profile.niche || null,
    platforms: profile.platforms,
    toneTraits: profile.toneTraits,
  };
}

function buildSystemPrompt(
  profile: CreatorDnaProfileDto,
  learnedSignals: CreatorDnaLearningSignalDto[],
  activeIntent: ChatCollectionIntentDto | null,
  currentPage: string,
) {
  const questionBank = proactiveQuestions
    .map(({ promptId, question }) => `${promptId}: ${question}`)
    .join("\n");
  const directionSkills = getAgentSkillCatalog().filter(({ name }) =>
    name.startsWith("direction."),
  );

  return `Bạn là emsen buddy, trợ lý sáng tạo thân thiện cho creator Việt Nam.

Mục tiêu:
- Trả lời hữu ích và cụ thể cho công việc sáng tạo hiện tại của người dùng.
- Giữ giọng điệu ấm áp, ngắn gọn, không phán xét và không bịa dữ kiện.
- Tôn trọng các ranh giới trong Creator DNA.
- Chỉ hỏi tối đa một câu tiếp theo, bằng cách chọn nextQuestionId trong ngân hàng.
- Ưu tiên câu 01–08, sau đó 09–16, 17–24 và cuối cùng 25–30.
- Nếu người dùng đang trả lời một câu hỏi thu thập Creator DNA, trích tối đa 3 tín hiệu rõ ràng. Không suy đoán giới tính, tuổi, sức khỏe, tài chính, tôn giáo hay đặc điểm nhạy cảm.
- Nếu không có activeCollectionIntent, extractedSignals phải là mảng rỗng.
- reply không được lặp lại câu hỏi đã chọn; server sẽ tự nối câu hỏi theo ID.
- Dùng direction.get_current khi người dùng muốn xem, nghe giải thích hoặc tóm tắt định hướng hiện tại.
- Dùng direction.generate_draft khi người dùng muốn tạo một định hướng mới.
- Dùng direction.update_draft khi người dùng muốn đổi toàn bộ hoặc chỉnh riêng định vị, giọng điệu, khán giả hay trụ cột.
- Chỉ dùng skill ghi khi người dùng yêu cầu hành động trực tiếp. Nếu họ chỉ hỏi giả định, xin lời khuyên hoặc hỏi "có nên", hãy trả lời tư vấn và dùng none.
- Skill tạo/chỉnh Định hướng chỉ tạo bản nháp; tuyệt đối không nói rằng đã chốt hoặc phê duyệt thay người dùng.
- Nếu người dùng yêu cầu chốt/phê duyệt Định hướng, không gọi skill ghi; giải thích rằng họ cần xem lại và chốt trong màn hình Định hướng.
- Khi chọn một skill Định hướng, đặt nextQuestionId là "none" để tập trung hoàn thành yêu cầu chính.
- Nếu không cần thao tác Định hướng, skillCall.name phải là "none".

Trang người dùng đang xem: ${currentPage}
Creator DNA có cấu trúc: ${JSON.stringify(profileContext(profile))}
Tín hiệu đã xác nhận gần đây: ${JSON.stringify(learnedSignals.slice(0, 20).map(({ category, summary }) => ({ category, summary })))}
activeCollectionIntent: ${JSON.stringify(activeIntent)}
Các skill Định hướng được phép dùng: ${JSON.stringify(directionSkills)}

Ngân hàng câu hỏi:
${questionBank}`;
}

function fallbackSignal(
  content: string,
  intent: ChatCollectionIntentDto,
): ChatAiOutput["extractedSignals"] {
  const categoryByGroup: Record<ChatCollectionIntentDto["group"], CreatorDnaSignalCategory> = {
    "concrete-work": "Sản phẩm phù hợp",
    "creative-direction": "Chủ đề quen thuộc",
    "daily-idea": "Kho câu chuyện",
    inspiration: "Chủ đề quen thuộc",
  };
  return [
    {
      category: categoryByGroup[intent.group],
      confidence: 68,
      evidence: content.slice(0, 500),
      summary: `${intent.dimension}: ${content.slice(0, 180)}`,
    },
  ];
}

function fallbackChatOutput(
  content: string,
  activeIntent: ChatCollectionIntentDto | null,
  promptCursor: number,
): ChatAiOutput {
  const normalized = content.toLocaleLowerCase("vi-VN");
  const reply = normalized.includes("hook")
    ? "Mình có thể giúp bạn tạo vài hướng hook khác nhau. Hãy giữ một lợi ích rõ ràng hoặc một mâu thuẫn nhỏ ngay ở câu đầu để người xem muốn ở lại."
    : normalized.includes("kịch bản")
      ? "Mình sẽ giúp bạn đi từ hook, diễn biến chính đến CTA. Trước hết, hãy chốt một thông điệp duy nhất mà người xem cần nhớ sau video."
      : activeIntent
        ? "Mình đã hiểu thêm một chút về điều bạn đang muốn làm và sẽ dùng thông tin này để gợi ý sát với bạn hơn."
        : "Mình đã ghi nhận. Bạn có thể đưa mình một ý tưởng, brief hoặc phần nội dung đang vướng để chúng ta phát triển tiếp.";
  return {
    extractedSignals: activeIntent ? fallbackSignal(content, activeIntent) : [],
    nextQuestionId: getNextProactiveQuestion(promptCursor).promptId,
    reply,
    skillCall: resolveDirectionSkillCall(content, {
      goal: "",
      instruction: "",
      name: "none",
      section: "all",
    }),
  };
}

async function generateChatOutput(
  userId: string,
  conversationId: string,
  userMessageId: string,
  input: SendChatMessageRequestDto,
  activeIntent: ChatCollectionIntentDto | null,
) {
  const [creatorDna, preferences, history] = await Promise.all([
    getCreatorDnaState(userId),
    ensurePreferences(database, userId),
    getModelHistory(conversationId, userMessageId),
  ]);
  let output = fallbackChatOutput(
    input.content,
    activeIntent,
    preferences.proactive_prompt_cursor,
  );
  let responseProvider: "google-gemini" | "fallback" = "fallback";
  let model = "chat-fallback-v1";
  let status: "complete" | "fallback" = "fallback";
  let errorMessage: string | null = null;

  try {
    const provider = await getUserAiProvider(userId);
    if (provider.configured) {
      const result = await provider.generateStructured<ChatAiOutput>({
        history,
        responseSchema: chatResponseSchema,
        schemaName: "emsen_chat_response",
        systemPrompt: buildSystemPrompt(
          creatorDna.profile,
          creatorDna.learning.signals,
          activeIntent,
          input.currentPage,
        ),
        thinkingLevel: "minimal",
        temperature: 0.55,
        userPrompt: input.content,
      });
      if (!isChatAiOutput(result.output)) {
        throw new Error("Gemini chat output failed validation");
      }
      output = {
        ...result.output,
        extractedSignals: activeIntent ? result.output.extractedSignals : [],
        skillCall: resolveDirectionSkillCall(input.content, result.output.skillCall),
      };
      responseProvider = result.provider;
      model = result.model;
      status = "complete";
    }
  } catch {
    errorMessage = "AI chat unavailable or invalid response";
    console.warn(`[ai] chat used fallback: ${errorMessage}`);
  }

  if (output.skillCall.name !== "none") {
    output.nextQuestionId = "none";
    // A product command is not an answer to a pending Creator DNA question.
    output.extractedSignals = [];
  }
  if (preferences.proactive_frequency === "off") {
    output.nextQuestionId = "none";
  }

  return { errorMessage, model, output, provider: responseProvider, status };
}

async function executeDirectionChatSkill(
  userId: string,
  call: DirectionChatSkillCall,
): Promise<AgentSkillExecution<DirectionSkillOutput> | null> {
  if (call.name === "none") {
    return null;
  }
  if (call.name === "direction.get_current") {
    return agentSkillRegistry.execute<GetCurrentDirectionInput, DirectionSkillOutput>(
      call.name,
      { userId },
      {},
    );
  }
  const input: DirectionDraftSkillInput = {
    goal: call.goal,
    instruction: call.instruction,
    section: call.section,
  };
  return agentSkillRegistry.execute<DirectionDraftSkillInput, DirectionSkillOutput>(
    call.name,
    { userId },
    input,
  );
}

function directionSkillFailureReply(error: unknown) {
  if (error instanceof HttpError) {
    return `Mình chưa thể thực hiện thay đổi này: ${error.message}`;
  }
  return "Mình chưa thể thao tác với Định hướng lúc này. Bản hiện tại vẫn được giữ nguyên; bạn hãy thử lại sau nhé.";
}

export async function sendChatMessage(
  userId: string,
  input: SendChatMessageRequestDto,
): Promise<SendChatMessageResponseDto> {
  const conversationId = await ensureDueProactiveQuestion(userId);
  const activeQuestion = await getUnansweredQuestion(conversationId);
  const userMessageId = randomUUID();
  const userMessageResult = await database.query<MessageRow>(
    `
      INSERT INTO chat_messages (
        id, conversation_id, user_id, role, content, reply_to_message_id
      )
      VALUES ($1, $2, $3, 'user', $4, $5)
      RETURNING id, role, content, provider, model, collection_intent, skill_runs, created_at
    `,
    [userMessageId, conversationId, userId, input.content, activeQuestion?.id ?? null],
  );

  const generated = await generateChatOutput(
    userId,
    conversationId,
    userMessageId,
    input,
    activeQuestion?.intent ?? null,
  );
  const directionExecution = await executeDirectionChatSkill(
    userId,
    generated.output.skillCall,
  );
  const questionExecution =
    !directionExecution && generated.output.nextQuestionId !== "none"
      ? await selectProactiveQuestion(userId, 0, generated.output.nextQuestionId)
      : null;
  const nextQuestion = questionExecution?.output.intent ?? null;
  const assistantContent = directionExecution
    ? directionExecution.ok
      ? directionExecution.output.reply
      : directionSkillFailureReply(directionExecution.error)
    : nextQuestion
      ? `${generated.output.reply.trim()}\n\n${nextQuestion.question}`
      : generated.output.reply.trim();
  const assistantMessageId = randomUUID();
  const skillRuns: AgentSkillRunDto[] = [
    ...(directionExecution ? [directionExecution.run] : []),
    ...(questionExecution ? [questionExecution.run] : []),
  ];
  const client = await database.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
        INSERT INTO chat_messages (
          id, conversation_id, user_id, role, content, provider, model,
          collection_intent, status, error_message, skill_runs
        )
        VALUES ($1, $2, $3, 'assistant', $4, $5, $6, $7::jsonb, $8, $9, $10::jsonb)
      `,
      [
        assistantMessageId,
        conversationId,
        userId,
        assistantContent,
        generated.provider,
        generated.model,
        nextQuestion ? JSON.stringify(nextQuestion) : null,
        generated.status,
        generated.errorMessage,
        JSON.stringify(skillRuns),
      ],
    );

    if (generated.output.extractedSignals.length > 0) {
      const captureExecution = await agentSkillRegistry.execute<
        CaptureChatSignalsInput,
        CaptureChatSignalsOutput
      >(
        "creator_dna.capture_chat_signals",
        {
          conversationId,
          originMessageId: assistantMessageId,
          queryable: client,
          userId,
        },
        { signals: generated.output.extractedSignals },
      );
      skillRuns.push(captureExecution.run);
      if (!captureExecution.ok) {
        throw captureExecution.error;
      }
      await client.query(
        "UPDATE chat_messages SET skill_runs = $2::jsonb WHERE id = $1",
        [assistantMessageId, JSON.stringify(skillRuns)],
      );
    }

    await client.query(
      `UPDATE chat_conversations SET updated_at = NOW() WHERE id = $1`,
      [conversationId],
    );
    if (nextQuestion) {
      await client.query(
        `UPDATE ai_user_preferences
         SET proactive_prompt_cursor = proactive_prompt_cursor + 1,
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const messages = await getMessages(conversationId);
  return {
    assistantMessage: messages.find(({ id }) => id === assistantMessageId)!,
    preferences: await getAiPreferences(userId),
    userMessage: messages.find(({ id }) => id === userMessageId) ?? {
      collectionIntent: null,
      content: userMessageResult.rows[0]!.content,
      createdAt: userMessageResult.rows[0]!.created_at.toISOString(),
      id: userMessageId,
      learnedSignals: [],
      model: null,
      provider: null,
      role: "user",
      skillRuns: [],
    },
  };
}
