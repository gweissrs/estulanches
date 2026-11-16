import { describe, expect, it } from "vitest";
import { calculateSubtotalCents, calculateTotal, calculateTotalCents, mergeCartItems, toCents } from "../../utils/cart.js";

describe("Cálculo do total do carrinho", () => {
  it("calcula o subtotal de um item (preço × quantidade)", () => {
    expect(calculateSubtotalCents({ unitPrice: 6.5, quantity: 3 })).toBe(1950);
  });

  it("soma os subtotais de vários itens", () => {
    const items = [
      { unitPrice: "6.50", quantity: 2 }, // 13,00
      { unitPrice: "5.50", quantity: 1 }, //  5,50
      { unitPrice: "3.50", quantity: 4 }, // 14,00
    ];
    expect(calculateTotalCents(items)).toBe(3250);
    expect(calculateTotal(items)).toBe(32.5);
  });

  it("não sofre erros de ponto flutuante (0,10 + 0,20 = 0,30)", () => {
    expect(calculateTotal([{ unitPrice: 0.1, quantity: 1 }, { unitPrice: 0.2, quantity: 1 }])).toBe(0.3);
  });

  it("retorna zero para carrinho vazio", () => {
    expect(calculateTotal([])).toBe(0);
  });

  it("rejeita preços inválidos", () => {
    expect(() => toCents(-1)).toThrow();
    expect(() => toCents("abc")).toThrow();
  });

  it("agrupa itens repetidos somando as quantidades", () => {
    expect(
      mergeCartItems([
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 },
        { productId: 1, quantity: 3 },
      ]),
    ).toEqual([
      { productId: 1, quantity: 5 },
      { productId: 2, quantity: 1 },
    ]);
  });
});
