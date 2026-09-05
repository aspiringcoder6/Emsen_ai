import { resolve } from "node:path";
import dotenv from "dotenv";

for (const path of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  dotenv.config({ path, quiet: true });
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const sessionSecret = process.env.SESSION_SECRET ?? "emsen-local-session-secret";

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
  session: {
    cookieName: process.env.SESSION_COOKIE_NAME ?? "emsen_session",
    rememberDays: Number(process.env.SESSION_REMEMBER_DAYS ?? 30),
    secret: sessionSecret,
    ttlHours: Number(process.env.SESSION_TTL_HOURS ?? 24),
  },
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
};
