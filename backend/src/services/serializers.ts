/** Converte campos Decimal do Prisma em number para respostas JSON previsíveis. */
type DecimalLike = { toString(): string } | number | string;

export const money = (value: DecimalLike) => Number(value.toString());

export function serializeProduct<T extends { price: DecimalLike }>(product: T) {
  return { ...product, price: money(product.price) };
}

export function serializeOrder<
  T extends { total: DecimalLike; items?: Array<{ unitPrice: DecimalLike; subtotal: DecimalLike }> },
>(order: T) {
  return {
    ...order,
    total: money(order.total),
    ...(order.items
      ? {
          items: order.items.map((item) => ({
            ...item,
            unitPrice: money(item.unitPrice),
            subtotal: money(item.subtotal),
          })),
        }
      : {}),
  };
}
