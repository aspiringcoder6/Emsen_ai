import { resolve } from "node:path";
import dotenv from "dotenv";

for (const path of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  dotenv.config({ path, quiet: true });
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const sessionSecret = process.env.SESSION_SECRET ?? "emsen-local-session-secret";
const mediaStorageEndpoint = process.env.MEDIA_STORAGE_ENDPOINT || (
  process.env.MINIO_ENDPOINT
    ? `${process.env.MINIO_USE_SSL === "true" ? "https" : "http"}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT || "9000"}`
    : nodeEnv === "production" ? "" : "http://localhost:9000"
);
const mediaStorageAccessKey = process.env.MEDIA_STORAGE_ACCESS_KEY
  || process.env.MINIO_ROOT_USER
  || (nodeEnv === "production" ? "" : "creatorflow");
const mediaStorageSecretKey = process.env.MEDIA_STORAGE_SECRET_KEY
  || process.env.MINIO_ROOT_PASSWORD
  || (nodeEnv === "production" ? "" : "creatorflow_local_secret");
const mediaStorageBucket = process.env.MEDIA_STORAGE_BUCKET
  || process.env.MINIO_BUCKET
  || (nodeEnv === "production" ? "" : "creatorflow-media");

if (nodeEnv === "production" && sessionSecret === "emsen-local-session-secret") {
  throw new Error("SESSION_SECRET must be configured in production");
}

export const config = {
  apiPort: Number(process.env.API_PORT ?? 3000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://creatorflow:creatorflow_local@localhost:5433/creatorflow",
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS ?? 45_000),
  },
  isProduction: nodeEnv === "production",
  mediaStorage: {
    accessKey: mediaStorageAccessKey,
    autoCreateBucket: (process.env.MEDIA_STORAGE_AUTO_CREATE_BUCKET ?? (nodeEnv === "production" ? "false" : "true")) === "true",
    bucket: mediaStorageBucket,
    enabled: Boolean(mediaStorageEndpoint && mediaStorageAccessKey && mediaStorageSecretKey && mediaStorageBucket),
    endpoint: mediaStorageEndpoint,
    region: process.env.MEDIA_STORAGE_REGION ?? "us-east-1",
    secretKey: mediaStorageSecretKey,
    uploadExpiresSeconds: Math.min(3_600, Math.max(60, Number(process.env.MEDIA_UPLOAD_EXPIRES_SECONDS ?? 900))),
  },
  session: {
    cookieName: process.env.SESSION_COOKIE_NAME ?? "emsen_session",
    rememberDays: Number(process.env.SESSION_REMEMBER_DAYS ?? 30),
    secret: sessionSecret,
    ttlHours: Number(process.env.SESSION_TTL_HOURS ?? 24),
  },
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
};
