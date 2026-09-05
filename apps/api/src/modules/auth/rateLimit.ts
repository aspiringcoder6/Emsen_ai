import type { RequestHandler } from "express";

type Bucket = {
  count: number;
  resetAt: number;
};

const windowMs = 10 * 60 * 1000;
const maximumAttempts = 20;
const buckets = new Map<string, Bucket>();

export const authRateLimit: RequestHandler = (request, response, next) => {
  const now = Date.now();
  const key = `${request.ip ?? request.socket.remoteAddress ?? "unknown"}:${request.path}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > maximumAttempts) {
    response.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
    response.status(429).json({
      error: {
        code: "AUTH_RATE_LIMITED",
        message: "Có quá nhiều lần thử. Vui lòng đợi một chút rồi thử lại.",
      },
    });
    return;
  }

  next();
};
