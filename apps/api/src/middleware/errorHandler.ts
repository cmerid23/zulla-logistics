import type { ErrorRequestHandler } from "express";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      ok: false,
      error: { message: err.message, code: err.code, details: err.details },
    });
  }
  console.error("[api] unhandled error", err);
  res.status(500).json({
    ok: false,
    error: { message: "Internal server error" },
  });
};
