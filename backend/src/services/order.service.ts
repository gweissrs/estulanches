import { prisma } from "../config/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../utils/AppError.js";
import { calculateSubtotalCents, fromCents, mergeCartItems } from "../utils/cart.js";
import { generateOrderNumber } from "../utils/orderNumber.js";
import {
  canStudentCancel,
  canTransition,
  getAllowedTransitions,
  ORDER_STATUS_LABELS,
  type OrderStatusValue,
} from "../utils/orderStatus.js";
import { MAX_ITEM_QUANTITY } from "../utils/validators.js";
import { serializeOrder } from "./serializers.js";

const orderInclude = {
  user: { select: { id: true, name: true, email: true } },
  items: {
    include: { product: { select: { id: true, name: true, image: true } } },
    orderBy: { id: "asc" },
  },
} as const satisfies Prisma.OrderInclude;

/**
 * Cria um pedido dentro de uma transação:
 * 1. Busca os produtos no banco (preço e disponibilidade NUNCA vêm do cliente).
 * 2. Valida existência e disponibilidade.
 * 3. Calcula subtotais e total em centavos.
 * 4. Grava pedido + itens com o preço praticado no momento da compra.
 */
export async function createOrder(userId: number, rawItems: Array<{ productId: number; quantity: number }>) {
  const items = mergeCartItems(rawItems);
  const overLimit = items.find((i) => i.quantity > MAX_ITEM_QUANTITY);
  if (overLimit) {
    throw AppError.badRequest(`A quantidade máxima por produto é ${MAX_ITEM_QUANTITY}.`);
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const order = await prisma.$transaction(
        async (tx) => {
          const products = await tx.product.findMany({
            where: { id: { in: items.map((i) => i.productId) } },
            select: { id: true, name: true, price: true, available: true },
          });
          const byId = new Map(products.map((p) => [p.id, p]));

          const missing = items.filter((i) => !byId.has(i.productId));
          if (missing.length) {
            throw AppError.badRequest("Um ou mais produtos não existem.", { productIds: missing.map((i) => i.productId) });
          }
          const unavailable = products.filter((p) => !p.available);
          if (unavailable.length) {
            throw AppError.conflict(`Produto indisponível no momento: ${unavailable.map((p) => p.name).join(", ")}.`);
          }

          const lines = items.map((item) => {
            const product = byId.get(item.productId)!;
            const unitPrice = product.price.toString();
            const subtotalCents = calculateSubtotalCents({ unitPrice, quantity: item.quantity });
            return { productId: item.productId, quantity: item.quantity, unitPrice, subtotalCents };
          });
          const totalCents = lines.reduce((sum, l) => sum + l.subtotalCents, 0);

          return tx.order.create({
            data: {
              orderNumber: generateOrderNumber(),
              userId,
              total: fromCents(totalCents).toFixed(2),
              status: "PENDING",
              items: {
                create: lines.map((l) => ({
                  productId: l.productId,
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                  subtotal: fromCents(l.subtotalCents).toFixed(2),
                })),
              },
            },
            include: orderInclude,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return serializeOrder(order);
    } catch (err) {
      // Colisão do número do pedido ou conflito de serialização: tenta novamente.
      const retryable =
        err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2002" || err.code === "P2034");
      if (!retryable || attempt === 3) throw err;
    }
  }
  throw new Error("Falha inesperada ao criar o pedido.");
}

export async function listUserOrders(userId: number) {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
  return orders.map(serializeOrder);
}

export async function getOrderForUser(orderId: number, user: { id: number; role: string }) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  // Retorna 404 (e não 403) para não revelar a existência de pedidos de outros usuários.
  if (!order || (user.role !== "ADMIN" && order.userId !== user.id)) {
    throw AppError.notFound("Pedido não encontrado.");
  }
  return serializeOrder(order);
}

export async function listAllOrders(filters: {
  status?: OrderStatusValue;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.OrderWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { orderNumber: { contains: filters.search, mode: "insensitive" } },
      { user: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);

  return {
    data: orders.map(serializeOrder),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    },
  };
}

/**
 * Atualiza o status respeitando a máquina de estados.
 * O update é condicional ao status atual (controle otimista), evitando que duas
 * atualizações simultâneas sobrescrevam uma à outra.
 */
async function transitionOrder(orderId: number, from: OrderStatusValue, to: OrderStatusValue) {
  const result = await prisma.order.updateMany({ where: { id: orderId, status: from }, data: { status: to } });
  if (result.count === 0) {
    throw AppError.conflict("O pedido foi alterado por outra pessoa. Atualize a página e tente novamente.");
  }
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
  return serializeOrder(order);
}

export async function updateOrderStatus(orderId: number, status: OrderStatusValue) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) throw AppError.notFound("Pedido não encontrado.");

  if (!canTransition(order.status, status)) {
    const allowed = getAllowedTransitions(order.status).map((s) => ORDER_STATUS_LABELS[s]);
    throw AppError.badRequest(
      `Não é possível mudar de "${ORDER_STATUS_LABELS[order.status]}" para "${ORDER_STATUS_LABELS[status]}".`,
      { allowed },
    );
  }
  return transitionOrder(orderId, order.status, status);
}

export async function cancelOwnOrder(orderId: number, userId: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, userId: true } });
  if (!order || order.userId !== userId) throw AppError.notFound("Pedido não encontrado.");
  if (!canStudentCancel(order.status)) {
    throw AppError.badRequest("Só é possível cancelar pedidos que ainda aguardam confirmação.");
  }
  return transitionOrder(orderId, order.status, "CANCELLED");
}
