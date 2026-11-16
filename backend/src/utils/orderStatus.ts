export const ORDER_STATUSES = ["PENDING", "PREPARING", "READY", "COMPLETED", "CANCELLED"] as const;
export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatusValue, string> = {
  PENDING: "Aguardando confirmação",
  PREPARING: "Em preparação",
  READY: "Pronto para retirada",
  COMPLETED: "Finalizado",
  CANCELLED: "Cancelado",
};

/**
 * Máquina de estados do pedido.
 * PENDING → PREPARING → READY → COMPLETED
 * PENDING/PREPARING → CANCELLED
 * COMPLETED e CANCELLED são estados finais.
 */
const TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  PENDING: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function isOrderStatus(value: unknown): value is OrderStatusValue {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function getAllowedTransitions(from: OrderStatusValue): OrderStatusValue[] {
  return [...TRANSITIONS[from]];
}

export function canTransition(from: OrderStatusValue, to: OrderStatusValue): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isFinalStatus(status: OrderStatusValue): boolean {
  return TRANSITIONS[status].length === 0;
}

/** Estudantes só podem cancelar o próprio pedido enquanto ele aguarda confirmação. */
export function canStudentCancel(status: OrderStatusValue): boolean {
  return status === "PENDING";
}
