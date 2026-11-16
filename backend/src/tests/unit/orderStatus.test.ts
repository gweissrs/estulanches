import { describe, expect, it } from "vitest";
import {
  canStudentCancel,
  canTransition,
  getAllowedTransitions,
  isFinalStatus,
  isOrderStatus,
} from "../../utils/orderStatus.js";
import { generateOrderNumber } from "../../utils/orderNumber.js";

describe("Regras de atualização de status do pedido", () => {
  it("segue o fluxo normal: aguardando → preparação → pronto → finalizado", () => {
    expect(canTransition("PENDING", "PREPARING")).toBe(true);
    expect(canTransition("PREPARING", "READY")).toBe(true);
    expect(canTransition("READY", "COMPLETED")).toBe(true);
  });

  it("permite cancelar pedidos aguardando ou em preparação", () => {
    expect(canTransition("PENDING", "CANCELLED")).toBe(true);
    expect(canTransition("PREPARING", "CANCELLED")).toBe(true);
  });

  it("não permite pular etapas nem voltar etapas", () => {
    expect(canTransition("PENDING", "READY")).toBe(false);
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
    expect(canTransition("READY", "PREPARING")).toBe(false);
    expect(canTransition("READY", "CANCELLED")).toBe(false);
  });

  it("não altera pedidos finalizados ou cancelados", () => {
    expect(isFinalStatus("COMPLETED")).toBe(true);
    expect(isFinalStatus("CANCELLED")).toBe(true);
    expect(getAllowedTransitions("COMPLETED")).toEqual([]);
    expect(canTransition("CANCELLED", "PENDING")).toBe(false);
  });

  it("estudante só cancela pedido aguardando confirmação", () => {
    expect(canStudentCancel("PENDING")).toBe(true);
    expect(canStudentCancel("PREPARING")).toBe(false);
    expect(canStudentCancel("READY")).toBe(false);
  });

  it("reconhece apenas status válidos", () => {
    expect(isOrderStatus("READY")).toBe(true);
    expect(isOrderStatus("ENTREGUE")).toBe(false);
    expect(isOrderStatus(undefined)).toBe(false);
  });
});

describe("Número identificador do pedido", () => {
  it("segue o formato EL-AAMMDD-XXXX", () => {
    const number = generateOrderNumber(new Date(2026, 10, 16));
    expect(number).toMatch(/^EL-261116-[A-HJ-NP-Z2-9]{4}$/);
  });

  it("gera números distintos", () => {
    const numbers = new Set(Array.from({ length: 200 }, () => generateOrderNumber()));
    expect(numbers.size).toBeGreaterThan(195);
  });
});
