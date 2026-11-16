import { execSync } from "node:child_process";

/** Prepara o banco de TESTE aplicando as migrations antes da suíte de integração. */
export default function setup() {
  const url = process.env.DATABASE_URL ?? "";
  // Trava de segurança: jamais rodar os testes (que apagam dados) fora de um banco de teste.
  if (!/test/i.test(new URL(url).pathname)) {
    throw new Error(`Os testes de integração exigem um banco de TESTE. DATABASE_URL atual aponta para: ${new URL(url).pathname}`);
  }
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
}
