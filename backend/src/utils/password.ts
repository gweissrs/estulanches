import bcrypt from "bcrypt";

/** Gera o hash bcrypt da senha. O salt é gerado automaticamente e embutido no hash. */
export async function hashPassword(plain: string, saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10)) {
  return bcrypt.hash(plain, saltRounds);
}

/** Compara a senha informada com o hash armazenado (comparação em tempo constante). */
export async function comparePassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
