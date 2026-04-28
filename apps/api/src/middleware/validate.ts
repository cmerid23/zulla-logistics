import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

type Source = "body" | "query" | "params";

export function validate<T>(schema: ZodSchema<T>, source: Source = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          details: result.error.flatten(),
        },
      });
    }
    // Attach the parsed value back so downstream handlers see coerced/defaulted data.
    (req as Request & Record<Source, unknown>)[source] = result.data;
    next();
  };
}
