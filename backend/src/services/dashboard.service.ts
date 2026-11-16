import { prisma } from "../config/prisma.js";
import { money } from "./serializers.js";

/** Indicadores do painel administrativo. */
export async function getDashboardStats() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [byStatus, revenue, revenueToday, ordersToday, totalProducts, unavailableProducts, totalStudents] =
    await prisma.$transaction([
      prisma.order.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } }),
      // Faturamento registrado: soma dos pedidos não cancelados
      prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: "CANCELLED" } } }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: "CANCELLED" }, createdAt: { gte: startOfDay } },
      }),
      prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.product.count(),
      prisma.product.count({ where: { available: false } }),
      prisma.user.count({ where: { role: "STUDENT" } }),
    ]);

  const counts = { PENDING: 0, PREPARING: 0, READY: 0, COMPLETED: 0, CANCELLED: 0 };
  for (const row of byStatus) {
    const c = row._count;
    counts[row.status] = typeof c === "object" && c ? (c._all ?? 0) : 0;
  }
  const totalOrders = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    orders: {
      total: totalOrders,
      today: ordersToday,
      pending: counts.PENDING,
      preparing: counts.PREPARING,
      ready: counts.READY,
      completed: counts.COMPLETED,
      cancelled: counts.CANCELLED,
    },
    revenue: {
      total: money(revenue._sum.total ?? 0),
      today: money(revenueToday._sum.total ?? 0),
    },
    products: {
      total: totalProducts,
      unavailable: unavailableProducts,
    },
    students: totalStudents,
  };
}
