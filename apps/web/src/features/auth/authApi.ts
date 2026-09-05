import type {
  AuthResponseDto,
  LoginRequestDto,
  SignupRequestDto,
} from "@creator-flow/contracts";
import { ApiError, apiRequest } from "../../lib/apiClient";

export async function getCurrentSession() {
  try {
    return await apiRequest<AuthResponseDto>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export function login(input: LoginRequestDto) {
  return apiRequest<AuthResponseDto>("/auth/login", { body: input, method: "POST" });
}

export function signup(input: SignupRequestDto) {
  return apiRequest<AuthResponseDto>("/auth/signup", { body: input, method: "POST" });
}

export function logout() {
  return apiRequest<void>("/auth/logout", { method: "POST" });
}
