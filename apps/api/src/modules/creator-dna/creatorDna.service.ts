import { randomUUID } from "node:crypto";
import type {
  CreateCreatorDnaSignalRequestDto,
  CreatorDnaInsightDto,
  CreatorDnaLearningSignalDto,
  CreatorDnaOnboardingStatus,
  CreatorDnaProfileDto,
  CreatorDnaStateDto,
  SaveCreatorDnaOnboardingRequestDto,
} from "@creator-flow/contracts";
import { database } from "../../database/pool.js";
import { HttpError } from "../../shared/http.js";
import { evaluateAndStoreUser } from "../ai/userEvaluation.service.js";

type CreatorDnaProfileRow = {
  audience: string;
  boundaries: string;
  current_step: number;
  display_name: string;
  last_captured_at: Date | null;
  latest_insight: CreatorDnaInsightDto | null;
  niche: string;
  onboarding_status: CreatorDnaOnboardingStatus;
  platforms: unknown;
  prompt_cursor: number;
  tone_traits: unknown;
  updated_at: Date;
};

type CreatorDnaSignalRow = {
  category: CreatorDnaLearningSignalDto["category"];
  confidence: number;
  created_at: Date;
  evidence: string;
  id: string;
  source: CreatorDnaLearningSignalDto["source"];
  summary: string;
};

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapSignal(row: CreatorDnaSignalRow): CreatorDnaLearningSignalDto {
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

export async function getCreatorDnaState(userId: string): Promise<CreatorDnaStateDto> {
  const [profileResult, signalsResult] = await Promise.all([
    database.query<CreatorDnaProfileRow>(
      `SELECT * FROM creator_dna_profiles WHERE user_id = $1`,
      [userId],
    ),
    database.query<CreatorDnaSignalRow>(
      `SELECT id, source, category, confidence, evidence, summary, created_at
       FROM creator_dna_signals
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    ),
  ]);

  const row = profileResult.rows[0];
  if (!row) {
    throw new HttpError(404, "CREATOR_DNA_NOT_FOUND", "Chưa tìm thấy Creator DNA của bạn.");
  }

  return {
    currentStep: row.current_step,
    insight: row.latest_insight,
    learning: {
      lastCapturedAt: row.last_captured_at?.toISOString() ?? null,
      promptCursor: row.prompt_cursor,
      signals: signalsResult.rows.map(mapSignal),
    },
    profile: {
      audience: row.audience,
      boundaries: row.boundaries,
      displayName: row.display_name,
      niche: row.niche,
      platforms: stringArray(row.platforms),
      toneTraits: stringArray(row.tone_traits),
    },
    status: row.onboarding_status,
    updatedAt: row.updated_at.toISOString(),
  };
}

async function updateProfile(
  userId: string,
  profile: CreatorDnaProfileDto,
  status: CreatorDnaOnboardingStatus,
  currentStep: number,
) {
  await database.query(
    `
      UPDATE creator_dna_profiles
      SET onboarding_status = $2,
          current_step = $3,
          display_name = $4,
          niche = $5,
          platforms = $6::jsonb,
          tone_traits = $7::jsonb,
          audience = $8,
          boundaries = $9,
          updated_at = NOW()
      WHERE user_id = $1
    `,
    [
      userId,
      status,
      currentStep,
      profile.displayName,
      profile.niche,
      JSON.stringify(profile.platforms),
      JSON.stringify(profile.toneTraits),
      profile.audience,
      profile.boundaries,
    ],
  );
}

export async function saveCreatorDnaOnboarding(
  userId: string,
  input: SaveCreatorDnaOnboardingRequestDto,
) {
  await updateProfile(userId, input.profile, input.status, input.currentStep);
  return getCreatorDnaState(userId);
}

export async function completeCreatorDnaOnboarding(
  userId: string,
  profile: CreatorDnaProfileDto,
) {
  if (!profile.displayName.trim() || !profile.niche.trim() || profile.platforms.length === 0) {
    throw new HttpError(
      400,
      "CREATOR_DNA_REQUIRED_FIELDS",
      "Vui lòng hoàn thành 3 câu hỏi bắt buộc trước khi đánh giá.",
    );
  }

  await updateProfile(userId, profile, "completed", 5);
  await evaluateAndStoreUser({
    displayName: profile.displayName,
    profile,
    stage: "onboarding",
    userId,
  });
  return getCreatorDnaState(userId);
}

export async function createCreatorDnaSignal(
  userId: string,
  input: CreateCreatorDnaSignalRequestDto,
) {
  const id = randomUUID();
  const capturedAt = new Date();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
        INSERT INTO creator_dna_signals (
          id, user_id, source, category, confidence, evidence, summary, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        id,
        userId,
        input.source,
        input.category,
        input.confidence,
        input.evidence,
        input.summary,
        capturedAt,
      ],
    );
    await client.query(
      `
        UPDATE creator_dna_profiles
        SET last_captured_at = $2,
            prompt_cursor = prompt_cursor + $3,
            updated_at = NOW()
        WHERE user_id = $1
      `,
      [userId, capturedAt, input.source === "daily-story" ? 1 : 0],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getCreatorDnaState(userId);
}

export async function removeCreatorDnaSignal(userId: string, signalId: string) {
  const result = await database.query(
    `DELETE FROM creator_dna_signals WHERE id = $1 AND user_id = $2`,
    [signalId, userId],
  );
  if (result.rowCount === 0) {
    throw new HttpError(404, "SIGNAL_NOT_FOUND", "Không tìm thấy tín hiệu này.");
  }

  return getCreatorDnaState(userId);
}
