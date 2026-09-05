import type {
  AiProactiveFrequency,
  SendChatMessageRequestDto,
} from "@creator-flow/contracts";
import { Router } from "express";
import { HttpError } from "../../shared/http.js";
import { requireAuth } from "../auth/session.js";
import {
  getAiPreferences,
  getChatState,
  sendChatMessage,
  updateAiPreferences,
} from "./chat.service.js";

export const chatRouter = Router();

const frequencies = new Set<AiProactiveFrequency>([
  "off",
  "gentle",
  "balanced",
  "frequent",
]);

type RateBucket = { count: number; resetAt: number };
const chatBuckets = new Map<string, RateBucket>();

function chatRateLimit(userId: string) {
  const now = Date.now();
  const current = chatBuckets.get(userId);
  const bucket =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + 60_000 }
      : current;
  bucket.count += 1;
  chatBuckets.set(userId, bucket);
  if (bucket.count > 30) {
    throw new HttpError(
      429,
      "CHAT_RATE_LIMITED",
      "Bạn đang gửi hơi nhanh. Hãy đợi một chút rồi tiếp tục nhé.",
    );
  }
}

function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "INVALID_BODY", "Dữ liệu gửi lên không hợp lệ.");
  }
  return value as Record<string, unknown>;
}

function textField(
  body: Record<string, unknown>,
  key: string,
  maximumLength: number,
) {
  const value = body[key];
  if (typeof value !== "string") {
    throw new HttpError(400, "INVALID_CHAT_MESSAGE", `Trường ${key} không hợp lệ.`);
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maximumLength) {
    throw new HttpError(400, "INVALID_CHAT_MESSAGE", `Trường ${key} không hợp lệ.`);
  }
  return trimmed;
}

function parseMessage(value: unknown): SendChatMessageRequestDto {
  const body = objectBody(value);
  return {
    content: textField(body, "content", 4_000),
    currentPage: textField(body, "currentPage", 80),
  };
}

chatRouter.use(requireAuth);

chatRouter.get("/", async (request, response) => {
  response.json(await getChatState(request.auth!.userId));
});

chatRouter.post("/messages", async (request, response) => {
  chatRateLimit(request.auth!.userId);
  response.status(201).json(
    await sendChatMessage(request.auth!.userId, parseMessage(request.body)),
  );
});

chatRouter.get("/preferences", async (request, response) => {
  response.json(await getAiPreferences(request.auth!.userId));
});

chatRouter.put("/preferences", async (request, response) => {
  const body = objectBody(request.body);
  const frequency = body.proactiveFrequency;
  if (typeof frequency !== "string" || !frequencies.has(frequency as AiProactiveFrequency)) {
    throw new HttpError(
      400,
      "INVALID_AI_FREQUENCY",
      "Tần suất AI chủ động chưa hợp lệ.",
    );
  }
  response.json(
    await updateAiPreferences(
      request.auth!.userId,
      frequency as AiProactiveFrequency,
    ),
  );
});
