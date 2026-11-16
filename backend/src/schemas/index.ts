import { z } from "zod";
import {
  isStrongPassword,
  isValidEmail,
  MAX_ITEM_QUANTITY,
  MIN_ITEM_QUANTITY,
  normalizeEmail,
} from "../utils/validators.js";
import { ORDER_STATUSES } from "../utils/orderStatus.js";

const emailField = z
  .string({ error: "Informe o e-mail." })
  .trim()
  .refine(isValidEmail, "E-mail inválido.")
  .transform(normalizeEmail);

// ---------- Autenticação ----------
export const registerSchema = z.object({
  name: z.string({ error: "Informe o nome." }).trim().min(3, "O nome deve ter ao menos 3 caracteres.").max(100),
  email: emailField,
  password: z
    .string({ error: "Informe a senha." })
    .refine(isStrongPassword, "A senha deve ter de 8 a 72 caracteres, com letras e números."),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string({ error: "Informe a senha." }).min(1, "Informe a senha.").max(72),
});

// ---------- Categorias ----------
export const categorySchema = z.object({
  name: z.string({ error: "Informe o nome." }).trim().min(2, "Nome muito curto.").max(60),
  description: z.string().trim().max(255).optional().nullable(),
});

// ---------- Produtos ----------
const priceField = z.coerce
  .number({ error: "Preço inválido." })
  .positive("O preço deve ser maior que zero.")
  .max(9999.99, "Preço acima do limite.")
  .refine((v) => Number.isInteger(Math.round(v * 100)) && Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Use no máximo 2 casas decimais.");

const imageField = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), "Use uma URL http(s) ou um caminho iniciado em /.")
  .optional()
  .nullable();

export const productSchema = z.object({
  name: z.string({ error: "Informe o nome." }).trim().min(2, "Nome muito curto.").max(100),
  description: z.string().trim().max(500).optional().nullable(),
  price: priceField,
  image: imageField,
  available: z.boolean().optional().default(true),
  categoryId: z.coerce.number({ error: "Categoria inválida." }).int().positive("Selecione uma categoria."),
});

export const productUpdateSchema = productSchema.partial();

export const productQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  available: z.enum(["true", "false"]).optional(),
});

// ---------- Pedidos ----------
export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number({ error: "Produto inválido." }).int().positive(),
        quantity: z
          .number({ error: "Quantidade inválida." })
          .int("A quantidade deve ser um número inteiro.")
          .min(MIN_ITEM_QUANTITY, `A quantidade mínima é ${MIN_ITEM_QUANTITY}.`)
          .max(MAX_ITEM_QUANTITY, `A quantidade máxima por item é ${MAX_ITEM_QUANTITY}.`),
      }),
      { error: "Informe os itens do pedido." },
    )
    .min(1, "O pedido precisa ter ao menos 1 item.")
    .max(30, "Itens demais no pedido."),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, { error: "Status inválido." }),
});

export const orderQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.coerce.number({ error: "ID inválido." }).int().positive("ID inválido."),
});
