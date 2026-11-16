const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

export const formatCurrency = (value) => currency.format(Number(value) || 0);
export const formatDateTime = (value) => dateTime.format(new Date(value));
export const formatTime = (value) => time.format(new Date(value));
export const formatDate = (value) => new Date(value).toLocaleDateString("pt-BR");

/** Soma em centavos para evitar erros de ponto flutuante. */
export const cartTotal = (items) =>
  items.reduce((sum, item) => sum + Math.round(Number(item.price) * 100) * item.quantity, 0) / 100;

export const PLACEHOLDER_IMAGE = "/images/products/placeholder.svg";

export const ORDER_STATUS = {
  PENDING: { label: "Aguardando confirmação", short: "Aguardando", tone: "amber" },
  PREPARING: { label: "Em preparação", short: "Preparando", tone: "blue" },
  READY: { label: "Pronto para retirada", short: "Pronto", tone: "green" },
  COMPLETED: { label: "Finalizado", short: "Finalizado", tone: "gray" },
  CANCELLED: { label: "Cancelado", short: "Cancelado", tone: "red" },
};

export const ORDER_FLOW = ["PENDING", "PREPARING", "READY", "COMPLETED"];

/** Próximas ações permitidas para o administrador (espelha a regra do backend). */
export const NEXT_ACTIONS = {
  PENDING: [
    { status: "PREPARING", label: "Preparar" },
    { status: "CANCELLED", label: "Cancelar", danger: true },
  ],
  PREPARING: [
    { status: "READY", label: "Pronto" },
    { status: "CANCELLED", label: "Cancelar", danger: true },
  ],
  READY: [{ status: "COMPLETED", label: "Entregue" }],
  COMPLETED: [],
  CANCELLED: [],
};
