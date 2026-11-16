import type { Request, Response } from "express";
import { getDashboardStats } from "../services/dashboard.service.js";

export async function stats(_req: Request, res: Response) {
  res.json(await getDashboardStats());
}
