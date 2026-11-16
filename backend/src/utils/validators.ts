/** Regras de validação puras, reutilizadas pelos schemas e cobertas por testes unitários. */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== "string") return false;
  const value = email.trim();
  if (value.length < 6 || value.length > 160) return false;
  if (value.includes("..")) return false;
  return EMAIL_REGEX.test(value);
}

export const MIN_ITEM_QUANTITY = 1;
export const MAX_ITEM_QUANTITY = 20;

/** Quantidade válida: inteiro entre 1 e 20 unidades por item. */
export function isValidQuantity(quantity: unknown): boolean {
  return (
    typeof quantity === "number" &&
    Number.isInteger(quantity) &&
    quantity >= MIN_ITEM_QUANTITY &&
    quantity <= MAX_ITEM_QUANTITY
  );
}

/** Senha forte o suficiente para o contexto acadêmico: 8+ caracteres, com letra e número. */
export function isStrongPassword(password: unknown): boolean {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    password.length <= 72 && // limite do bcrypt
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  );
}
