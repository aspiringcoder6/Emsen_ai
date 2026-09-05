import { Router } from "express";
import type { LoginRequestDto, SignupRequestDto } from "@creator-flow/contracts";
import { HttpError } from "../../shared/http.js";
import { getAuthResponse, login, signup } from "./auth.service.js";
import { authRateLimit } from "./rateLimit.js";
import {
  clearSessionCookie,
  requireAuth,
  revokeSession,
  setSessionCookie,
} from "./session.js";

export const authRouter = Router();

function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "INVALID_BODY", "Dữ liệu gửi lên không hợp lệ.");
  }
  return value as Record<string, unknown>;
}

function requiredString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (typeof value !== "string") {
    throw new HttpError(400, "INVALID_BODY", `Trường ${key} không hợp lệ.`);
  }
  return value.trim();
}

function requiredRawString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (typeof value !== "string") {
    throw new HttpError(400, "INVALID_BODY", `Trường ${key} không hợp lệ.`);
  }
  return value;
}

function parseEmail(value: string) {
  const email = value.toLocaleLowerCase("vi-VN");
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new HttpError(400, "INVALID_EMAIL", "Vui lòng nhập một địa chỉ email hợp lệ.");
  }
  return email;
}

function parsePassword(value: string) {
  if (value.length < 8 || value.length > 128) {
    throw new HttpError(400, "INVALID_PASSWORD", "Mật khẩu cần có từ 8 đến 128 ký tự.");
  }
  return value;
}

function parseSignup(bodyValue: unknown): SignupRequestDto {
  const body = objectBody(bodyValue);
  const name = requiredString(body, "name");
  const choice = body.creatorDnaChoice;
  if (name.length < 2 || name.length > 80) {
    throw new HttpError(400, "INVALID_NAME", "Tên hiển thị cần có từ 2 đến 80 ký tự.");
  }
  if (choice !== "start" && choice !== "skip") {
    throw new HttpError(400, "INVALID_CREATOR_DNA_CHOICE", "Lựa chọn Creator DNA không hợp lệ.");
  }
  if (body.acceptedTerms !== true) {
    throw new HttpError(400, "TERMS_REQUIRED", "Bạn cần đồng ý với điều khoản sử dụng.");
  }

  return {
    acceptedTerms: true,
    creatorDnaChoice: choice,
    email: parseEmail(requiredString(body, "email")),
    name,
    password: parsePassword(requiredRawString(body, "password")),
  };
}

function parseLogin(bodyValue: unknown): LoginRequestDto {
  const body = objectBody(bodyValue);
  return {
    email: parseEmail(requiredString(body, "email")),
    password: parsePassword(requiredRawString(body, "password")),
    remember: body.remember === true,
  };
}

authRouter.post("/signup", authRateLimit, async (request, response) => {
  const result = await signup(parseSignup(request.body));
  setSessionCookie(response, result.session);
  response.status(201).json(result.response);
});

authRouter.post("/login", authRateLimit, async (request, response) => {
  const result = await login(parseLogin(request.body));
  setSessionCookie(response, result.session);
  response.json(result.response);
});

authRouter.get("/me", requireAuth, async (request, response) => {
  response.json(await getAuthResponse(request.auth!.userId));
});

authRouter.post("/logout", requireAuth, async (request, response) => {
  await revokeSession(request.auth!.sessionId);
  clearSessionCookie(response);
  response.status(204).end();
});
