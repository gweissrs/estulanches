import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../utils/AppError.js";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound(`Rota não encontrada: ${req.method} ${req.originalUrl}`));
}

/** Tratamento centralizado de erros: respostas padronizadas e sem vazar detalhes internos. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Dados inválidos.",
      details: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return res.status(409).json({ error: "Registro duplicado." });
    if (err.code === "P2025") return res.status(404).json({ error: "Recurso não encontrado." });
    if (err.code === "P2003") return res.status(409).json({ error: "Registro vinculado a outros dados." });
  }

  // JSON malformado enviado pelo cliente
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "JSON inválido no corpo da requisição." });
  }

  // Payload grande demais
  if (typeof err === "object" && err !== null && (err as { type?: string }).type === "entity.too.large") {
    return res.status(413).json({ error: "Corpo da requisição muito grande." });
  }

  console.error(`[erro] ${req.method} ${req.originalUrl}`, err);
  return res.status(500).json({ error: "Erro interno do servidor." });
}
