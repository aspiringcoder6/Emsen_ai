import { randomUUID } from "node:crypto";
import type {
  CreatorDnaInsightDto,
  CreatorDnaProfileDto,
} from "@creator-flow/contracts";
import { getUserAiProvider } from "./aiKey.service.js";
import { database } from "../../database/pool.js";

type EvaluationOutput = {
  headline: string;
  note: string;
  readiness: number;
  signals: string[];
};

type EvaluationRequest = {
  creatorDnaChoice?: "start" | "skip";
  displayName: string;
  profile?: CreatorDnaProfileDto;
  stage: "signup" | "onboarding";
  userId: string;
};


const evaluationSchema = {
  properties: {
    headline: {
      description: "Một câu nhận định tích cực, cụ thể, không suy diễn quá dữ liệu.",
      type: "string",
    },
    note: {
      description: "Giải thích ngắn về mức sẵn sàng và bước tiếp theo.",
      type: "string",
    },
    readiness: {
      description: "Mức độ dữ liệu đủ để cá nhân hóa nội dung, từ 0 đến 100.",
      maximum: 100,
      minimum: 0,
      type: "integer",
    },
    signals: {
      description: "Từ 2 đến 4 tín hiệu đã biết hoặc còn cần tìm hiểu.",
      items: { type: "string" },
      maxItems: 4,
      minItems: 2,
      type: "array",
    },
  },
  required: ["headline", "note", "readiness", "signals"],
  type: "object",
} satisfies Record<string, unknown>;

function isEvaluationOutput(value: unknown): value is EvaluationOutput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<EvaluationOutput>;
  return Boolean(
    typeof candidate.headline === "string" &&
      candidate.headline.trim() &&
      typeof candidate.note === "string" &&
      candidate.note.trim() &&
      Number.isInteger(candidate.readiness) &&
      (candidate.readiness ?? -1) >= 0 &&
      (candidate.readiness ?? 101) <= 100 &&
      Array.isArray(candidate.signals) &&
      candidate.signals.length >= 2 &&
      candidate.signals.every((signal) => typeof signal === "string" && signal.trim()),
  );
}

function fallbackEvaluation(request: EvaluationRequest): EvaluationOutput {
  if (request.stage === "signup") {
    const willOnboard = request.creatorDnaChoice === "start";
    return {
      headline: `${request.displayName}, Creator DNA của bạn đã có điểm bắt đầu.`,
      note: willOnboard
        ? "Hoàn thành 6 câu hỏi mở đầu sẽ giúp emsen đánh giá dựa trên dữ liệu thật thay vì suy đoán."
        : "Bạn có thể bỏ qua lúc này; emsen sẽ tích lũy tín hiệu dần từ các tương tác sau.",
      readiness: willOnboard ? 18 : 10,
      signals: [
        "Đã biết cách bạn muốn được gọi",
        willOnboard ? "Sẵn sàng bổ sung Creator DNA" : "Chưa có dữ liệu về nội dung và chất giọng",
      ],
    };
  }

  const profile = request.profile!;
  const optionalSignals = [
    profile.toneTraits.length > 0,
    Boolean(profile.audience.trim()),
    Boolean(profile.boundaries.trim()),
  ].filter(Boolean).length;

  return {
    headline: `${profile.displayName} đang xây nội dung ${profile.niche.toLocaleLowerCase("vi-VN")} với một điểm xuất phát rõ ràng.`,
    note:
      "Đánh giá fallback được tạo từ 6 câu trả lời đã lưu. emsen sẽ tiếp tục làm giàu Creator DNA qua câu chuyện và phản hồi thực tế.",
    readiness: Math.min(64 + optionalSignals * 12, 100),
    signals: [
      `Nền tảng ưu tiên: ${profile.platforms.join(" · ")}`,
      profile.toneTraits.length
        ? `Chất giọng mong muốn: ${profile.toneTraits.join(" · ")}`
        : "Chất giọng sẽ được học thêm qua phản hồi",
      profile.audience.trim()
        ? `Khán giả: ${profile.audience.trim()}`
        : "Chân dung khán giả cần được làm rõ thêm",
      profile.boundaries.trim()
        ? `Cần tránh: ${profile.boundaries.trim()}`
        : "Chưa có ranh giới nội dung đặc biệt",
    ],
  };
}

function buildPrompt(request: EvaluationRequest) {
  if (request.stage === "signup") {
    return JSON.stringify({
      creatorDnaChoice: request.creatorDnaChoice,
      displayName: request.displayName,
      instruction:
        "Chỉ đánh giá mức độ sẵn sàng dữ liệu. Tuyệt đối không suy đoán giới tính, tuổi, tính cách, ngành nghề hoặc hoàn cảnh từ tên.",
    });
  }

  return JSON.stringify({
    instruction:
      "Đánh giá mức độ đủ dữ liệu để cá nhân hóa nội dung. Chỉ dùng dữ liệu đã cung cấp, không chẩn đoán tâm lý và không bịa thêm đặc điểm.",
    profile: request.profile,
  });
}

export async function evaluateAndStoreUser(
  request: EvaluationRequest,
): Promise<CreatorDnaInsightDto> {
  let output = fallbackEvaluation(request);
  let evaluationProvider: "google-gemini" | "fallback" = "fallback";
  let model = "rule-based-v1";
  let status: "generated" | "fallback" = "fallback";
  let errorMessage: string | null = null;

  try {
    const provider = await getUserAiProvider(request.userId);
    if (provider.configured) {
      const result = await provider.generateStructured<EvaluationOutput>({
        responseSchema: evaluationSchema,
        schemaName: `creator_dna_${request.stage}_evaluation`,
        systemPrompt:
          "Bạn là bộ đánh giá Creator DNA của emsen. Trả lời bằng tiếng Việt, thân thiện, ngắn gọn và dựa hoàn toàn trên dữ liệu đầu vào. Không suy diễn thuộc tính nhạy cảm hoặc thông tin chưa được cung cấp.",
        thinkingLevel: "minimal",
        temperature: 0.2,
        userPrompt: buildPrompt(request),
      });

      if (!isEvaluationOutput(result.output)) {
        throw new Error("Gemini output failed validation");
      }

      output = result.output;
      evaluationProvider = result.provider;
      model = result.model;
      status = "generated";
    }
  } catch {
    errorMessage = "AI evaluation unavailable or invalid response";
    console.warn(`[ai] ${request.stage} evaluation used fallback: ${errorMessage}`);
  }

  const generatedAt = new Date().toISOString();
  const insight: CreatorDnaInsightDto = {
    ...output,
    generatedAt,
    model,
    provider: evaluationProvider,
    stage: request.stage,
  };

  await database.query(
    `
      INSERT INTO ai_evaluations (
        id, user_id, stage, provider, model, status,
        input_snapshot, output, error_message, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
    `,
    [
      randomUUID(),
      request.userId,
      request.stage,
      evaluationProvider,
      model,
      status,
      JSON.stringify({
        creatorDnaChoice: request.creatorDnaChoice ?? null,
        displayName: request.displayName,
        profile: request.profile ?? null,
      }),
      JSON.stringify(insight),
      errorMessage,
      generatedAt,
    ],
  );

  await database.query(
    `UPDATE creator_dna_profiles
     SET latest_insight = $2::jsonb, updated_at = NOW()
     WHERE user_id = $1`,
    [request.userId, JSON.stringify(insight)],
  );

  return insight;
}
