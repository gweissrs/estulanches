import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";

async function main() {
  // Verifica a conexão com o banco antes de aceitar requisições.
  await prisma.$queryRaw`SELECT 1`;
  console.log("[db] Conexão com o PostgreSQL estabelecida.");

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[app] EstuLanches API ouvindo na porta ${env.port} (${env.nodeEnv})`);
  });

  // Encerramento gracioso (docker compose down / stop envia SIGTERM)
  const shutdown = (signal: string) => {
    console.log(`[app] ${signal} recebido, encerrando...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch(async (err) => {
  console.error("[app] Falha na inicialização:", err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
