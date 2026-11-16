import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

// Prisma 7: o client conecta ao PostgreSQL por meio de um driver adapter (node-postgres).
// O pool de conexões é gerenciado pelo driver `pg`.
const adapter = new PrismaPg({
  connectionString: env.databaseUrl,
  max: Number(process.env.DB_POOL_MAX ?? 10),
});

export const prisma = new PrismaClient({
  adapter,
  log: env.isProduction ? ["error"] : ["warn", "error"],
});
