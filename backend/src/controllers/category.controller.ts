import type { Request, Response } from "express";
import { validated } from "../middlewares/validate.js";
import * as categoryService from "../services/category.service.js";

type IdParams = { id: number };
type CategoryBody = { name: string; description?: string | null };

export async function list(_req: Request, res: Response) {
  res.json(await categoryService.listCategories());
}

export async function create(_req: Request, res: Response) {
  res.status(201).json(await categoryService.createCategory(validated<CategoryBody>(res)));
}

export async function update(_req: Request, res: Response) {
  const { id } = validated<IdParams>(res, "params");
  res.json(await categoryService.updateCategory(id, validated<CategoryBody>(res)));
}

export async function remove(_req: Request, res: Response) {
  const { id } = validated<IdParams>(res, "params");
  await categoryService.deleteCategory(id);
  res.status(204).send();
}
