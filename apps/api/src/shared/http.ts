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
  console.error("[api] unhandled error", error instanceof Error ? error.name : "UnknownError");
  response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Đã có lỗi xảy ra. Vui lòng thử lại.",
    },
  });
};
