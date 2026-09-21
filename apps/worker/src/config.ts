import { resolve } from "node:path";

for (const path of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  try {
    process.loadEnvFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

const nodeEnv = process.env.NODE_ENV ?? "development";
function positiveNumber(value: string | undefined, fallback: number, minimum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(minimum, parsed) : fallback;
}

const storageEndpoint = process.env.MEDIA_STORAGE_ENDPOINT || (
  process.env.MINIO_ENDPOINT
    ? `${process.env.MINIO_USE_SSL === "true" ? "https" : "http"}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT || "9000"}`
    : nodeEnv === "production" ? "" : "http://localhost:9000"
);

export const workerConfig = {
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://creatorflow:creatorflow_local@localhost:5433/creatorflow",
  gemini: {
    apiKey: process.env.GEMINI_API_KEY?.trim() ?? "",
    model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
    timeoutMs: positiveNumber(process.env.GEMINI_VIDEO_TIMEOUT_MS, 10 * 60_000, 60_000),
  },
  isProduction: nodeEnv === "production",
  pollIntervalMs: positiveNumber(process.env.MEDIA_WORKER_POLL_MS, 2_000, 500),
  storage: {
    accessKey: process.env.MEDIA_STORAGE_ACCESS_KEY || process.env.MINIO_ROOT_USER || (nodeEnv === "production" ? "" : "creatorflow"),
    bucket: process.env.MEDIA_STORAGE_BUCKET || process.env.MINIO_BUCKET || (nodeEnv === "production" ? "" : "creatorflow-media"),
    endpoint: storageEndpoint,
    region: process.env.MEDIA_STORAGE_REGION || "us-east-1",
    secretKey: process.env.MEDIA_STORAGE_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || (nodeEnv === "production" ? "" : "creatorflow_local_secret"),
  },
};
