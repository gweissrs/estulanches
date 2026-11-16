import jwt, { type SignOptions } from "jsonwebtoken";

export type UserRole = "STUDENT" | "ADMIN";

export interface TokenPayload {
  sub: number;
  role: UserRole;
}

const ISSUER = "estulanches-api";

export function signToken(payload: TokenPayload, secret: string, expiresIn: string = "8h"): string {
  return jwt.sign({ role: payload.role }, secret, {
    subject: String(payload.sub),
    issuer: ISSUER,
    algorithm: "HS256",
    expiresIn: expiresIn as SignOptions["expiresIn"],
  });
}

/** Valida assinatura, emissor e expiração. Lança erro se o token for inválido. */
export function verifyToken(token: string, secret: string): TokenPayload {
  const decoded = jwt.verify(token, secret, { issuer: ISSUER, algorithms: ["HS256"] });
  if (typeof decoded === "string" || !decoded.sub) {
    throw new Error("Token malformado");
  }
  const sub = Number(decoded.sub);
  const role = decoded.role as UserRole;
  if (!Number.isInteger(sub) || (role !== "STUDENT" && role !== "ADMIN")) {
    throw new Error("Token malformado");
  }
  return { sub, role };
}
