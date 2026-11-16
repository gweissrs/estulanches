import { randomInt } from "node:crypto";

// Sem caracteres ambíguos (0/O, 1/I) para facilitar a leitura no balcão.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Gera um identificador legível, ex.: EL-261116-7KQ2 (data + sufixo aleatório). */
export function generateOrderNumber(date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `EL-${yy}${mm}${dd}-${suffix}`;
}
