import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

type CategoryInput = { name: string; description?: string | null };

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

async function ensureUniqueName(name: string, ignoreId?: number) {
  const existing = await prisma.category.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
    select: { id: true },
  });
  if (existing) throw AppError.conflict("Já existe uma categoria com este nome.");
}

export async function createCategory(data: CategoryInput) {
  await ensureUniqueName(data.name);
  return prisma.category.create({ data: { name: data.name, description: data.description || null } });
}

export async function updateCategory(id: number, data: CategoryInput) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw AppError.notFound("Categoria não encontrada.");
  await ensureUniqueName(data.name, id);
  return prisma.category.update({
    where: { id },
    data: { name: data.name, description: data.description || null },
  });
}

export async function deleteCategory(id: number) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) throw AppError.notFound("Categoria não encontrada.");
  if (category._count.products > 0) {
    throw AppError.conflict("A categoria possui produtos vinculados. Mova ou exclua os produtos antes.");
  }
  await prisma.category.delete({ where: { id } });
}
