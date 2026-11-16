/**
 * Cálculos monetários do carrinho/pedido.
 * Todos os cálculos são feitos em centavos (inteiros) para evitar erros de ponto flutuante
 * (ex.: 0.1 + 0.2 !== 0.3).
 */

export interface PricedItem {
  unitPrice: number | string; // em reais, ex.: 7.5 ou "7.50"
  quantity: number;
}

export function toCents(value: number | string): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n) || n < 0) throw new Error(`Valor monetário inválido: ${value}`);
  return Math.round(n * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function calculateSubtotalCents(item: PricedItem): number {
  return toCents(item.unitPrice) * item.quantity;
}

export function calculateTotalCents(items: PricedItem[]): number {
  return items.reduce((total, item) => total + calculateSubtotalCents(item), 0);
}

export function calculateTotal(items: PricedItem[]): number {
  return fromCents(calculateTotalCents(items));
}

/** Agrupa itens repetidos do mesmo produto somando as quantidades. */
export function mergeCartItems<T extends { productId: number; quantity: number }>(items: T[]) {
  const merged = new Map<number, number>();
  for (const item of items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }
  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}
