import type { Request, Response } from "express";
import { validated } from "../middlewares/validate.js";
import * as productService from "../services/product.service.js";

type IdParams = { id: number };

/** Cardápio público: somente produtos disponíveis. */
export async function listPublic(_req: Request, res: Response) {
  res.json(await productService.listProducts(validated(res, "query"), { onlyAvailable: true }));
}

export async function listPopular(_req: Request, res: Response) {
  res.json(await productService.listPopularProducts(4));
}

/** Listagem administrativa: inclui produtos indisponíveis. */
export async function listAdmin(_req: Request, res: Response) {
  res.json(await productService.listProducts(validated(res, "query")));
}

export async function getById(_req: Request, res: Response) {
  const { id } = validated<IdParams>(res, "params");
  res.json(await productService.getProduct(id));
}

export async function create(_req: Request, res: Response) {
  res.status(201).json(await productService.createProduct(validated(res)));
}

export async function update(_req: Request, res: Response) {
  const { id } = validated<IdParams>(res, "params");
  res.json(await productService.updateProduct(id, validated(res)));
}

export async function remove(_req: Request, res: Response) {
  const { id } = validated<IdParams>(res, "params");
  await productService.deleteProduct(id);
  res.status(204).send();
}
