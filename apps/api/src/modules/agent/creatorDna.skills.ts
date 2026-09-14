import type {
  ChatCollectionIntentDto,
  CreatorDnaSignalCategory,
} from "@creator-flow/contracts";
import { HttpError } from "../../shared/http.js";
import { captureCreatorDnaChatSignals } from "../creator-dna/creatorDna.service.js";
import {
  getNextProactiveQuestion,
  getProactiveQuestion,
} from "../chat/proactiveQuestions.js";
import type { AgentSkillDefinition } from "./agentSkill.registry.js";

export type AskProactiveQuestionInput = {
  cursor: number;
  promptId?: string;
};

export type AskProactiveQuestionOutput = {
  intent: ChatCollectionIntentDto;
};

export type ChatSignalInput = {
  category: CreatorDnaSignalCategory;
  confidence: number;
  evidence: string;
  summary: string;
};

export type CaptureChatSignalsInput = {
  signals: ChatSignalInput[];
};

export type CaptureChatSignalsOutput = {
  count: number;
  signalIds: string[];
};

const signalCategories = new Set<CreatorDnaSignalCategory>([
  "Kho câu chuyện",
  "Chủ đề quen thuộc",
  "Giọng điệu",
  "Khán giả",
  "Sản phẩm phù hợp",
  "Điều cần tránh",
]);

export const askProactiveQuestionSkill: AgentSkillDefinition<
  AskProactiveQuestionInput,
  AskProactiveQuestionOutput
> = {
  confirmationPolicy: "none",
  description: "Chọn một câu hỏi chủ động an toàn từ ngân hàng Creator DNA.",
  inputSchema: {
    properties: {
      cursor: { minimum: 0, type: "integer" },
      promptId: { type: "string" },
    },
    required: ["cursor"],
    type: "object",
  },
  mode: "read",
  name: "creator_dna.ask_proactive_question",
  outputSchema: {
    properties: { intent: { type: "object" } },
    required: ["intent"],
    type: "object",
  },
  target: "creator-dna",
  async execute(_context, input) {
    if (!input || !Number.isSafeInteger(input.cursor) || input.cursor < 0) {
      throw new HttpError(400, "INVALID_SKILL_INPUT", "Vị trí câu hỏi Creator DNA không hợp lệ.");
    }
    const selected = input.promptId
      ? getProactiveQuestion(input.promptId)
      : getNextProactiveQuestion(input.cursor);
    if (!selected) {
      throw new HttpError(400, "UNKNOWN_PROACTIVE_QUESTION", "Câu hỏi Creator DNA không tồn tại.");
    }
    return {
      output: { intent: selected },
      summary: `Đã chọn câu hỏi Creator DNA ${selected.promptId}.`,
    };
  },
};

export const captureChatSignalsSkill: AgentSkillDefinition<
  CaptureChatSignalsInput,
  CaptureChatSignalsOutput
> = {
  confirmationPolicy: "none",
  description: "Lưu các tín hiệu Creator DNA rõ ràng được rút ra từ câu trả lời trong chat.",
  inputSchema: {
    properties: {
      signals: {
        items: {
          properties: {
            category: { type: "string" },
            confidence: { maximum: 100, minimum: 0, type: "integer" },
            evidence: { type: "string" },
            summary: { type: "string" },
          },
          required: ["category", "confidence", "evidence", "summary"],
          type: "object",
        },
        maxItems: 3,
        minItems: 1,
        type: "array",
      },
    },
    required: ["signals"],
    type: "object",
  },
  mode: "write",
  name: "creator_dna.capture_chat_signals",
  outputSchema: {
    properties: {
      count: { type: "integer" },
      signalIds: { items: { type: "string" }, type: "array" },
    },
    required: ["count", "signalIds"],
    type: "object",
  },
  target: "creator-dna",
  async execute(context, input) {
    if (!context.originMessageId) {
      throw new HttpError(400, "SKILL_ORIGIN_REQUIRED", "Thiếu tin nhắn nguồn để lưu Creator DNA.");
    }
    if (!input || !Array.isArray(input.signals) || input.signals.length < 1 || input.signals.length > 3) {
      throw new HttpError(400, "INVALID_SKILL_INPUT", "Mỗi lượt chat chỉ được lưu từ 1 đến 3 tín hiệu Creator DNA.");
    }

    const signals = input.signals.map((signal) => {
      if (
        !signal ||
        !signalCategories.has(signal.category) ||
        !Number.isInteger(signal.confidence) ||
        signal.confidence < 0 ||
        signal.confidence > 100 ||
        typeof signal.evidence !== "string" ||
        !signal.evidence.trim() ||
        typeof signal.summary !== "string" ||
        !signal.summary.trim()
      ) {
        throw new HttpError(400, "INVALID_SKILL_INPUT", "Tín hiệu Creator DNA không hợp lệ.");
      }
      return {
        ...signal,
        evidence: signal.evidence.trim().slice(0, 4_000),
        summary: signal.summary.trim().slice(0, 1_000),
      };
    });
    const signalIds = context.queryable
      ? await captureCreatorDnaChatSignals(
          context.userId,
          context.originMessageId,
          signals,
          context.queryable,
        )
      : await captureCreatorDnaChatSignals(
          context.userId,
          context.originMessageId,
          signals,
        );
    return {
      output: { count: signals.length, signalIds },
      summary: `Đã ghi nhớ ${signals.length} tín hiệu vào Creator DNA.`,
    };
  },
};
