/**
 * Seed idempotente: pode rodar a cada inicialização do container sem duplicar dados.
 * - Cria as categorias padrão (se não existirem).
 * - Cria o cardápio inicial apenas quando não há nenhum produto cadastrado.
 * - Cria o administrador inicial a partir de ADMIN_EMAIL / ADMIN_PASSWORD (variáveis de ambiente).
 */
import "dotenv/config";
import { prisma } from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";
import { isStrongPassword, isValidEmail, normalizeEmail } from "../utils/validators.js";

const categories = [
  { name: "Salgados", description: "Salgados assados e fritos, feitos no dia." },
  { name: "Lanches", description: "Sanduíches e lanches naturais." },
  { name: "Bebidas", description: "Sucos, refrigerantes e bebidas quentes." },
  { name: "Doces", description: "Bolos, brigadeiros e sobremesas." },
  { name: "Combos", description: "Combinações com preço especial." },
];

const products: Array<{ name: string; description: string; price: string; image: string; category: string; available?: boolean }> = [
  { name: "Coxinha de frango", description: "Massa crocante recheada com frango desfiado e temperado.", price: "6.50", image: "/images/products/coxinha.svg", category: "Salgados" },
  { name: "Pão de queijo (3 un.)", description: "Pão de queijo mineiro, quentinho e saindo do forno.", price: "5.00", image: "/images/products/pao-de-queijo.svg", category: "Salgados" },
  { name: "Esfiha de carne", description: "Esfiha aberta de carne moída com tomate e cebola.", price: "6.00", image: "/images/products/esfiha.svg", category: "Salgados" },
  { name: "Pastel de queijo", description: "Pastel frito na hora com recheio de mussarela.", price: "7.00", image: "/images/products/pastel.svg", category: "Salgados" },
  { name: "X-Burguer", description: "Pão brioche, hambúrguer bovino, queijo e molho da casa.", price: "14.90", image: "/images/products/burger.svg", category: "Lanches" },
  { name: "Sanduíche natural", description: "Pão integral, frango, cenoura, alface e requeijão.", price: "11.50", image: "/images/products/sanduiche.svg", category: "Lanches" },
  { name: "Misto quente", description: "Pão de forma na chapa com presunto e queijo.", price: "8.00", image: "/images/products/misto.svg", category: "Lanches" },
  { name: "Suco de laranja 300 ml", description: "Suco natural, espremido na hora.", price: "6.00", image: "/images/products/suco.svg", category: "Bebidas" },
  { name: "Refrigerante lata", description: "Lata 350 ml, sabores variados.", price: "5.50", image: "/images/products/refrigerante.svg", category: "Bebidas" },
  { name: "Água mineral 500 ml", description: "Com ou sem gás.", price: "3.00", image: "/images/products/agua.svg", category: "Bebidas" },
  { name: "Brigadeiro", description: "Brigadeiro gourmet de chocolate belga.", price: "3.50", image: "/images/products/brigadeiro.svg", category: "Doces" },
  { name: "Fatia de bolo de cenoura", description: "Com cobertura de chocolate.", price: "6.50", image: "/images/products/bolo.svg", category: "Doces" },
  { name: "Combo Estudante", description: "Coxinha + refrigerante lata + brigadeiro.", price: "13.90", image: "/images/products/combo.svg", category: "Combos" },
  { name: "Combo Café da Manhã", description: "Pão de queijo (3 un.) + suco de laranja.", price: "9.90", image: "/images/products/combo-cafe.svg", category: "Combos", available: false },
];

async function seedCategories() {
  for (const category of categories) {
    await prisma.category.upsert({ where: { name: category.name }, update: {}, create: category });
  }
}

async function seedProducts() {
  if ((await prisma.product.count()) > 0) {
    console.log("[seed] Produtos já existem, cardápio inicial ignorado.");
    return;
  }
  const byName = new Map((await prisma.category.findMany()).map((c) => [c.name, c.id]));
  await prisma.product.createMany({
    data: products.map(({ category, ...p }) => ({ ...p, categoryId: byName.get(category)! })),
  });
  console.log(`[seed] ${products.length} produtos criados.`);
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("[seed] ADMIN_EMAIL/ADMIN_PASSWORD não definidos: administrador inicial não criado.");
    return;
  }
  if (!isValidEmail(email) || !isStrongPassword(password)) {
    throw new Error("ADMIN_EMAIL inválido ou ADMIN_PASSWORD fraca (mín. 8 caracteres, letras e números).");
  }
  const normalized = normalizeEmail(email);
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) {
    console.log("[seed] Administrador já existe.");
    return;
  }
  await prisma.user.create({
    data: {
      name: process.env.ADMIN_NAME ?? "Administrador",
      email: normalized,
      password: await hashPassword(password),
      role: "ADMIN",
    },
  });
  console.log(`[seed] Administrador ${normalized} criado.`);
}

async function main() {
  await seedCategories();
  await seedProducts();
  await seedAdmin();
  console.log("[seed] Concluído.");
}

main()
  .catch((err) => {
    console.error("[seed] Falhou:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
