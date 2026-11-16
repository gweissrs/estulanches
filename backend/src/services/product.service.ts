import { prisma } from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../utils/AppError.js";
import { serializeProduct } from "./serializers.js";

const productInclude = { category: { select: { id: true, name: true } } } as const;

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  available?: "true" | "false";
}

export interface ProductInput {
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  available?: boolean;
  categoryId: number;
}

export async function listProducts(filters: ProductFilters, { onlyAvailable = false } = {}) {
  const where: Prisma.ProductWhereInput = {};
  if (filters.search) where.name = { contains: filters.search, mode: "insensitive" };
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (onlyAvailable) where.available = true;
  else if (filters.available) where.available = filters.available === "true";

  const products = await prisma.product.findMany({
    where,
    include: productInclude,
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });
  return products.map(serializeProduct);
}

/** Produtos mais pedidos (exclui pedidos cancelados). Usado na página inicial. */
export async function listPopularProducts(limit = 4) {
  const ranking = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { status: { not: "CANCELLED" } }, product: { available: true } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  const ids = ranking.map((r) => r.productId);
  let products = ids.length
    ? await prisma.product.findMany({ where: { id: { in: ids } }, include: productInclude })
    : [];
  products.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));

  // Sem histórico suficiente: completa com produtos disponíveis mais recentes.
  if (products.length < limit) {
    const extra = await prisma.product.findMany({
      where: { available: true, id: { notIn: ids } },
      include: productInclude,
      orderBy: { createdAt: "desc" },
      take: limit - products.length,
    });
    products = [...products, ...extra];
  }
  return products.map(serializeProduct);
}

export async function getProduct(id: number) {
  const product = await prisma.product.findUnique({ where: { id }, include: productInclude });
  if (!product) throw AppError.notFound("Produto não encontrado.");
  return serializeProduct(product);
}

async function ensureCategoryExists(categoryId: number) {
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) throw AppError.badRequest("Categoria informada não existe.");
}

export async function createProduct(data: ProductInput) {
  await ensureCategoryExists(data.categoryId);
  const product = await prisma.product.create({
    data: {
      name: data.name,
      description: data.description || null,
      price: data.price,
      image: data.image || null,
      available: data.available ?? true,
      categoryId: data.categoryId,
    },
    include: productInclude,
  });
  return serializeProduct(product);
}

export async function updateProduct(id: number, data: Partial<ProductInput>) {
  const exists = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw AppError.notFound("Produto não encontrado.");
  if (data.categoryId) await ensureCategoryExists(data.categoryId);

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.image !== undefined && { image: data.image || null }),
      ...(data.available !== undefined && { available: data.available }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
    },
    include: productInclude,
  });
  return serializeProduct(product);
}

/**
 * Exclui o produto. Se ele já aparece em pedidos, a exclusão é bloqueada para preservar
 * o histórico — nesse caso o administrador deve desativá-lo (available = false).
 */
export async function deleteProduct(id: number) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!product) throw AppError.notFound("Produto não encontrado.");
  if (product._count.orderItems > 0) {
    throw AppError.conflict("Este produto já foi pedido e não pode ser excluído. Desative-o para retirá-lo do cardápio.");
  }
  await prisma.product.delete({ where: { id } });
}
