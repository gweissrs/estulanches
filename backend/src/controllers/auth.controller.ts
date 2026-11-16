import type { Request, Response } from "express";
import { validated } from "../middlewares/validate.js";
import * as authService from "../services/auth.service.js";

export async function register(_req: Request, res: Response) {
  const result = await authService.register(validated(res));
  res.status(201).json(result);
}

export async function login(_req: Request, res: Response) {
  const result = await authService.login(validated(res));
  res.json(result);
}

/** Recuperação de sessão: o frontend envia o token salvo e recebe os dados do usuário. */
export async function me(req: Request, res: Response) {
  res.json({ user: await authService.getProfile(req.user!.id) });
}

/**
 * Logout: o JWT é stateless, então o encerramento da sessão acontece no cliente
 * (descartando o token). O endpoint existe para padronizar o fluxo e permitir
 * evoluir para blacklist de tokens/refresh tokens no futuro.
 */
export async function logout(_req: Request, res: Response) {
  res.status(204).send();
}
