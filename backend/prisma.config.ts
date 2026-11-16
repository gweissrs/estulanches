// Configuração do Prisma ORM 7.x
// No Prisma 7 a URL de conexão não fica mais no schema.prisma:
// ela é definida aqui (usada pelo CLI: migrate, studio, db seed).
// Em tempo de execução a aplicação conecta usando o driver adapter (@prisma/adapter-pg).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx src/scripts/seed.ts",
  },
  datasource: {
    // process.env (e não env()) para permitir `prisma generate` no build da imagem
    // Docker, momento em que ainda não existe banco disponível.
    url: process.env.DATABASE_URL ?? "",
  },
});
