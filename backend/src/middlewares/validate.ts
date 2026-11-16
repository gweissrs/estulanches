import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type Source = "body" | "query" | "params";

/**
 * Valida (e normaliza) a entrada com um schema Zod antes de chegar ao controller.
 * O resultado validado fica em res.locals.validated[source].
 */
export function validate(schema: ZodType, source: Source = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[source] ?? {}); // ZodError → errorHandler (400)
    res.locals.validated = { ...(res.locals.validated ?? {}), [source]: parsed };
    next();
  };
}

export function validated<T>(res: Response, source: Source = "body"): T {
  return res.locals.validated?.[source] as T;
}
