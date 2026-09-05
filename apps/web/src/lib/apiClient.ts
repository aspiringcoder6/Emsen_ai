import type { ApiErrorDto } from "@creator-flow/contracts";

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
  /\/$/,
  "",
);
const apiBaseUrl = configuredBaseUrl || "/api";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function apiRequest<TResponse>(
  path: string,
  options: { body?: unknown; method?: string } = {},
): Promise<TResponse> {
  const requestInit: RequestInit = {
    credentials: "include",
    method: options.method ?? "GET",
  };
  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
    requestInit.headers = { "Content-Type": "application/json" };
  }

  const response = await fetch(`${apiBaseUrl}${path}`, requestInit);

  if (!response.ok) {
    let payload: ApiErrorDto | null = null;
    try {
      payload = (await response.json()) as ApiErrorDto;
    } catch {
      payload = null;
    }
    throw new ApiError(
      response.status,
      payload?.error.code ?? "REQUEST_FAILED",
      payload?.error.message ?? "Không thể kết nối tới máy chủ.",
    );
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }
  return (await response.json()) as TResponse;
}
