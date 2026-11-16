import request from "supertest";
import { createApp } from "../../app.js";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { signToken } from "../../utils/jwt.js";
import { hashPassword } from "../../utils/password.js";

export const app = createApp();
export const api = () => request(app);
export { prisma };

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "order_items", "orders", "products", "categories", "users" RESTART IDENTITY CASCADE',
  );
}

export async function createUser(role: "STUDENT" | "ADMIN" = "STUDENT", overrides: { email?: string; name?: string } = {}) {
  const user = await prisma.user.create({
    data: {
      name: overrides.name ?? (role === "ADMIN" ? "Admin Teste" : "Aluno Teste"),
      email: overrides.email ?? `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@teste.com`,
      password: await hashPassword("Senha1234", 4),
      role,
    },
  });
  const token = signToken({ sub: user.id, role: user.role }, env.jwtSecret, "1h");
  return { user, token, auth: `Bearer ${token}` };
}

export async function createCatalog() {
  const salgados = await prisma.category.create({ data: { name: "Salgados" } });
  const bebidas = await prisma.category.create({ data: { name: "Bebidas" } });
  const coxinha = await prisma.product.create({
    data: { name: "Coxinha", price: "6.50", categoryId: salgados.id, available: true },
  });
  const suco = await prisma.product.create({
    data: { name: "Suco de laranja", price: "6.00", categoryId: bebidas.id, available: true },
  });
  const esgotado = await prisma.product.create({
    data: { name: "Pastel esgotado", price: "7.00", categoryId: salgados.id, available: false },
  });
  return { salgados, bebidas, coxinha, suco, esgotado };
}
