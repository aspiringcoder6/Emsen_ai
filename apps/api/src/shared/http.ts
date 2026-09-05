import type { ErrorRequestHandler, RequestHandler } from "express";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Không tìm thấy API được yêu cầu.",
    },
  });
};

function safeErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return { name: "UnknownError" };
  }

  const candidate = error as {
    code?: unknown;
    column?: unknown;
    constraint?: unknown;
    name?: unknown;
    stack?: unknown;
    table?: unknown;
  };
  const stackFrames =
    typeof candidate.stack === "string"
      ? candidate.stack.split("\n").slice(1, 6).map((line) => line.trim())
      : undefined;

  return {
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    column: typeof candidate.column === "string" ? candidate.column : undefined,
    constraint:
      typeof candidate.constraint === "string" ? candidate.constraint : undefined,
    name: typeof candidate.name === "string" ? candidate.name : "UnknownError",
    stackFrames,
    table: typeof candidate.table === "string" ? candidate.table : undefined,
  };
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  if (error?.type === "entity.parse.failed" || error?.type === "entity.too.large") {
    response.status(error.type === "entity.too.large" ? 413 : 400).json({
      error: { code: "INVALID_BODY", message: "Dữ liệu gửi lên không hợp lệ hoặc quá lớn." },
    });
    return;
  }
  // Request bodies and provider errors may contain credentials; never log them wholesale.
  console.error("[api] unhandled error", safeErrorDetails(error));
  response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Đã có lỗi xảy ra. Vui lòng thử lại.",
    },
  });
};
