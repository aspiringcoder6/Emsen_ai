import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { database } from "./database/pool.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { creatorDnaRouter } from "./modules/creator-dna/creatorDna.routes.js";
import { directionRouter } from "./modules/direction/direction.routes.js";
import { contentPlanRouter } from "./modules/content-plan/contentPlan.routes.js";
import { aiKeyRouter } from "./modules/ai/aiKey.routes.js";
import { scriptRouter } from "./modules/scripts/script.routes.js";
import { errorHandler, HttpError, notFoundHandler } from "./shared/http.js";

function isAllowedOrigin(origin: string) {
  if (origin === config.webOrigin) {
    return true;
  }

  if (!config.isProduction) {
    try {
      const url = new URL(origin);
      return url.hostname === "localhost" || url.hostname.startsWith("127.");
    } catch {
      return false;
    }
  }

  return false;
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        callback(null, !origin || isAllowedOrigin(origin));
      },
    }),
  );
  app.use(express.json({ limit: "256kb" }));

  app.use((request, _response, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      next();
      return;
    }

    const origin = request.headers.origin;
    if (origin && !isAllowedOrigin(origin)) {
      next(new HttpError(403, "ORIGIN_NOT_ALLOWED", "Nguồn gửi yêu cầu không được phép."));
      return;
    }
    next();
  });

  app.get("/health", async (_request, response) => {
    await database.query("SELECT 1");
    response.json({
      ai: {
        configured: Boolean(config.gemini.apiKey),
        model: config.gemini.model,
        provider: "google-gemini",
      },
      database: "ok",
      service: "emsen-api",
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/creator-dna", creatorDnaRouter);
  app.use("/api/direction", directionRouter);
  app.use("/api/content-plan", contentPlanRouter);
  app.use("/api/scripts", scriptRouter);
  app.use("/api/settings/ai-key", aiKeyRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
