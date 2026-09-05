import { Router } from "express";
import type {
  CreateCreatorDnaSignalRequestDto,
  CreatorDnaLearningSource,
  CreatorDnaProfileDto,
  CreatorDnaSignalCategory,
  SaveCreatorDnaOnboardingRequestDto,
} from "@creator-flow/contracts";
import { HttpError } from "../../shared/http.js";
import { requireAuth } from "../auth/session.js";
import {
  completeCreatorDnaOnboarding,
  createCreatorDnaSignal,
  getCreatorDnaState,
  removeCreatorDnaSignal,
  saveCreatorDnaOnboarding,
} from "./creatorDna.service.js";

export const creatorDnaRouter = Router();

const sources = new Set<CreatorDnaLearningSource>([
  "daily-story",
  "script-feedback",
  "direct-update",
  "ai-chat",
]);
const categories = new Set<CreatorDnaSignalCategory>([
  "Kho câu chuyện",
  "Chủ đề quen thuộc",
  "Giọng điệu",
  "Khán giả",
  "Sản phẩm phù hợp",
  "Điều cần tránh",
]);

function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "INVALID_BODY", "Dữ liệu Creator DNA không hợp lệ.");
  }
  return value as Record<string, unknown>;
}

function textField(
  body: Record<string, unknown>,
  key: string,
  maximumLength: number,
) {
  const value = body[key];
  if (typeof value !== "string" || value.length > maximumLength) {
    throw new HttpError(400, "INVALID_CREATOR_DNA", `Trường ${key} không hợp lệ.`);
  }
  return value.trim();
}

function stringList(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (
    !Array.isArray(value) ||
    value.length > 10 ||
    !value.every((item) => typeof item === "string" && item.trim() && item.length <= 80)
  ) {
    throw new HttpError(400, "INVALID_CREATOR_DNA", `Trường ${key} không hợp lệ.`);
  }
  return value.map((item) => (item as string).trim());
}

function parseProfile(value: unknown): CreatorDnaProfileDto {
  const body = objectBody(value);
  return {
    audience: textField(body, "audience", 2_000),
    boundaries: textField(body, "boundaries", 2_000),
    displayName: textField(body, "displayName", 80),
    niche: textField(body, "niche", 120),
    platforms: stringList(body, "platforms"),
    toneTraits: stringList(body, "toneTraits"),
  };
}

function parseSaveOnboarding(value: unknown): SaveCreatorDnaOnboardingRequestDto {
  const body = objectBody(value);
  const status = body.status;
  const currentStep = body.currentStep;
  if (!Number.isInteger(currentStep) || (currentStep as number) < 0 || (currentStep as number) > 5) {
    throw new HttpError(400, "INVALID_STEP", "Bước onboarding không hợp lệ.");
  }
  if (status !== "not-started" && status !== "in-progress" && status !== "skipped") {
    throw new HttpError(
      400,
      "INVALID_ONBOARDING_STATUS",
      "Hãy dùng bước hoàn tất để tạo đánh giá Creator DNA.",
    );
  }

  return {
    currentStep: currentStep as number,
    profile: parseProfile(body.profile),
    status,
  };
}

function parseSignal(value: unknown): CreateCreatorDnaSignalRequestDto {
  const body = objectBody(value);
  const source = body.source;
  const category = body.category;
  const confidence = body.confidence;
  if (typeof source !== "string" || !sources.has(source as CreatorDnaLearningSource)) {
    throw new HttpError(400, "INVALID_SIGNAL_SOURCE", "Nguồn tín hiệu không hợp lệ.");
  }
  if (typeof category !== "string" || !categories.has(category as CreatorDnaSignalCategory)) {
    throw new HttpError(400, "INVALID_SIGNAL_CATEGORY", "Nhóm tín hiệu không hợp lệ.");
  }
  if (!Number.isInteger(confidence) || (confidence as number) < 0 || (confidence as number) > 100) {
    throw new HttpError(400, "INVALID_SIGNAL_CONFIDENCE", "Độ chắc chắn không hợp lệ.");
  }

  return {
    category: category as CreatorDnaSignalCategory,
    confidence: confidence as number,
    evidence: textField(body, "evidence", 4_000),
    source: source as CreatorDnaLearningSource,
    summary: textField(body, "summary", 1_000),
  };
}

creatorDnaRouter.use(requireAuth);

creatorDnaRouter.get("/", async (request, response) => {
  response.json(await getCreatorDnaState(request.auth!.userId));
});

creatorDnaRouter.put("/onboarding", async (request, response) => {
  response.json(
    await saveCreatorDnaOnboarding(request.auth!.userId, parseSaveOnboarding(request.body)),
  );
});

creatorDnaRouter.post("/onboarding/complete", async (request, response) => {
  const body = objectBody(request.body);
  response.json(
    await completeCreatorDnaOnboarding(request.auth!.userId, parseProfile(body.profile)),
  );
});

creatorDnaRouter.post("/signals", async (request, response) => {
  response.status(201).json(
    await createCreatorDnaSignal(request.auth!.userId, parseSignal(request.body)),
  );
});

creatorDnaRouter.delete("/signals/:signalId", async (request, response) => {
  const signalId = request.params.signalId;
  if (!signalId) {
    throw new HttpError(400, "INVALID_SIGNAL_ID", "Tín hiệu không hợp lệ.");
  }
  response.json(await removeCreatorDnaSignal(request.auth!.userId, signalId));
});
