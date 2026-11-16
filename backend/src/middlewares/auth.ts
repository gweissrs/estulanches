import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { verifyToken, type UserRole } from "../utils/jwt.js";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

/** Exige um JWT válido no cabeçalho Authorization: Bearer <token>. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw AppError.unauthorized("Token de acesso não informado.");
  }

  let payload;
  try {
    payload = verifyToken(header.slice(7).trim(), env.jwtSecret);
  } catch {
    throw AppError.unauthorized("Token inválido ou expirado.");
  }

  // Confirma que o usuário ainda existe e usa o perfil atual do banco
  // (um token antigo não mantém privilégios removidos).
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) throw AppError.unauthorized("Usuário não encontrado.");

  req.user = user;
  next();
}

/** Autorização por perfil. Deve ser usado após authenticate. */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw AppError.unauthorized();
    if (!roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };
}
