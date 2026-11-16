import type { Request, Response } from "express";
import { validated } from "../middlewares/validate.js";
import * as orderService from "../services/order.service.js";
import type { OrderStatusValue } from "../utils/orderStatus.js";

type IdParams = { id: number };

export async function create(req: Request, res: Response) {
  const { items } = validated<{ items: Array<{ productId: number; quantity: number }> }>(res);
  res.status(201).json(await orderService.createOrder(req.user!.id, items));
}

export async function listMine(req: Request, res: Response) {
  res.json(await orderService.listUserOrders(req.user!.id));
}

export async function getById(req: Request, res: Response) {
  const { id } = validated<IdParams>(res, "params");
  res.json(await orderService.getOrderForUser(id, req.user!));
}

export async function cancelMine(req: Request, res: Response) {
  const { id } = validated<IdParams>(res, "params");
  res.json(await orderService.cancelOwnOrder(id, req.user!.id));
}

export async function listAll(_req: Request, res: Response) {
  res.json(await orderService.listAllOrders(validated(res, "query")));
}

export async function updateStatus(_req: Request, res: Response) {
  const { id } = validated<IdParams>(res, "params");
  const { status } = validated<{ status: OrderStatusValue }>(res);
  res.json(await orderService.updateOrderStatus(id, status));
}
