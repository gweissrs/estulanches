import "dotenv/config";

/**
 * Centraliza a leitura das variáveis de ambiente.
 * Nenhuma credencial é escrita no código: tudo vem do ambiente (.env / Docker Compose).
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? "development";

const jwtSecret = required("JWT_SECRET");
if (nodeEnv === "production" && jwtSecret.length < 32) {
  throw new Error("JWT_SECRET deve ter pelo menos 32 caracteres em produção.");
}

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  isTest: nodeEnv === "test",
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Diretório com o build do frontend (servido pelo Express em produção)
  publicDir: process.env.PUBLIC_DIR ?? "",
} as const;
