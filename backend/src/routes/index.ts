import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import * as auth from "../controllers/auth.controller.js";
import * as categories from "../controllers/category.controller.js";
import * as dashboard from "../controllers/dashboard.controller.js";
import * as orders from "../controllers/order.controller.js";
import * as products from "../controllers/product.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  categorySchema,
  createOrderSchema,
  idParamSchema,
  loginSchema,
  orderQuerySchema,
  productQuerySchema,
  productSchema,
  productUpdateSchema,
  registerSchema,
  updateOrderStatusSchema,
} from "../schemas/index.js";

export const router = Router();

const adminOnly = [authenticate, authorize("ADMIN")];
const studentOnly = [authenticate, authorize("STUDENT")];
const withId = validate(idParamSchema, "params");

// Limita tentativas de login/cadastro (força bruta). Desativado nos testes automatizados.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
});

// ---------- Saúde (usado pelo healthcheck do Docker) ----------
router.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "up", uptime: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ status: "error", database: "down" });
  }
});

// ---------- Autenticação ----------
router.post("/auth/register", authLimiter, validate(registerSchema), auth.register);
router.post("/auth/login", authLimiter, validate(loginSchema), auth.login);
router.get("/auth/me", authenticate, auth.me);
router.post("/auth/logout", authenticate, auth.logout);

// ---------- Cardápio (público) ----------
router.get("/categories", categories.list);
router.get("/products", validate(productQuerySchema, "query"), products.listPublic);
router.get("/products/popular", products.listPopular);
router.get("/products/:id", withId, products.getById);

// ---------- Pedidos do estudante ----------
router.post("/orders", ...studentOnly, validate(createOrderSchema), orders.create);
router.get("/orders/my", authenticate, orders.listMine);
router.get("/orders/:id", authenticate, withId, orders.getById);
router.patch("/orders/:id/cancel", ...studentOnly, withId, orders.cancelMine);

// ---------- Administração ----------
router.get("/admin/dashboard", ...adminOnly, dashboard.stats);

router.get("/admin/products", ...adminOnly, validate(productQuerySchema, "query"), products.listAdmin);
router.post("/admin/products", ...adminOnly, validate(productSchema), products.create);
router.put("/admin/products/:id", ...adminOnly, withId, validate(productUpdateSchema), products.update);
router.delete("/admin/products/:id", ...adminOnly, withId, products.remove);

router.post("/admin/categories", ...adminOnly, validate(categorySchema), categories.create);
router.put("/admin/categories/:id", ...adminOnly, withId, validate(categorySchema), categories.update);
router.delete("/admin/categories/:id", ...adminOnly, withId, categories.remove);

router.get("/admin/orders", ...adminOnly, validate(orderQuerySchema, "query"), orders.listAll);
router.patch("/admin/orders/:id/status", ...adminOnly, withId, validate(updateOrderStatusSchema), orders.updateStatus);
