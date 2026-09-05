import { createHmac, randomBytes, randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { config } from "../../config.js";
import { database } from "../../database/pool.js";
import { HttpError } from "../../shared/http.js";

type SessionRow = {
  id: string;
  user_id: string;
};

function hashSessionToken(token: string) {
  return createHmac("sha256", config.session.secret).update(token).digest("hex");
}

function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = pair.slice(0, separator).trim();
    if (key === name) {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    }
  }
  return null;
}

export async function createSession(userId: string, remember: boolean) {
  const token = randomBytes(32).toString("base64url");
  const ttlMs = remember
    ? config.session.rememberDays * 24 * 60 * 60 * 1000
    : config.session.ttlHours * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);

  await database.query("DELETE FROM auth_sessions WHERE expires_at <= NOW()");
  await database.query(
    `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), userId, hashSessionToken(token), expiresAt],
  );

  return { expiresAt, remember, token };
}

export function setSessionCookie(
  response: Response,
  session: { remember: boolean; token: string },
) {
  const baseOptions = {
    httpOnly: true,
    path: "/",
    sameSite: config.isProduction ? ("none" as const) : ("lax" as const),
    secure: config.isProduction,
  };

  response.cookie(
    config.session.cookieName,
    session.token,
    session.remember
      ? {
          ...baseOptions,
          maxAge: config.session.rememberDays * 24 * 60 * 60 * 1000,
        }
      : baseOptions,
  );
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(config.session.cookieName, {
    httpOnly: true,
    path: "/",
    sameSite: config.isProduction ? "none" : "lax",
    secure: config.isProduction,
  });
}

export async function resolveSession(request: Request) {
  const token = getCookie(request, config.session.cookieName);
  if (!token) {
    return null;
  }

  const result = await database.query<SessionRow>(
    `
      SELECT id, user_id
      FROM auth_sessions
      WHERE token_hash = $1 AND expires_at > NOW()
    `,
    [hashSessionToken(token)],
  );
  const session = result.rows[0] ?? null;
  if (session) {
    await database.query("UPDATE auth_sessions SET last_seen_at = NOW() WHERE id = $1", [
      session.id,
    ]);
  }
  return session;
}

export async function requireAuth(request: Request, _response: Response, next: () => void) {
  const session = await resolveSession(request);
  if (!session) {
    throw new HttpError(401, "AUTH_REQUIRED", "Vui lòng đăng nhập để tiếp tục.");
  }

  request.auth = {
    sessionId: session.id,
    userId: session.user_id,
  };
  next();
}

export async function revokeSession(sessionId: string) {
  await database.query("DELETE FROM auth_sessions WHERE id = $1", [sessionId]);
}
