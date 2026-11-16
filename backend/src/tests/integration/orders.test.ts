import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { api, createCatalog, createUser, prisma, resetDatabase } from "./helpers.js";

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe("POST /api/orders — criação de pedido", () => {
  it("cria o pedido calculando o total no backend a partir dos preços do banco", async () => {
    const { auth, user } = await createUser("STUDENT");
    const { coxinha, suco } = await createCatalog();

    const res = await api()
      .post("/api/orders")
      .set("Authorization", auth)
      // unitPrice/total enviados pelo cliente são ignorados
      .send({ items: [{ productId: coxinha.id, quantity: 2, unitPrice: 0.01 }, { productId: suco.id, quantity: 1 }], total: 1 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId: user.id, status: "PENDING", total: 19 }); // 2×6,50 + 6,00
    expect(res.body.orderNumber).toMatch(/^EL-\d{6}-[A-Z0-9]{4}$/);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0]).toMatchObject({ productId: coxinha.id, quantity: 2, unitPrice: 6.5, subtotal: 13 });
  });

  it("mantém o preço da compra mesmo após reajuste do produto", async () => {
    const { auth } = await createUser("STUDENT");
    const { coxinha } = await createCatalog();
    const order = await api().post("/api/orders").set("Authorization", auth).send({ items: [{ productId: coxinha.id, quantity: 1 }] });

    await prisma.product.update({ where: { id: coxinha.id }, data: { price: "9.90" } });

    const res = await api().get(`/api/orders/${order.body.id}`).set("Authorization", auth);
    expect(res.body.items[0].unitPrice).toBe(6.5);
    expect(res.body.total).toBe(6.5);
  });

  it("recusa produto indisponível (409) sem gravar nada", async () => {
    const { auth } = await createUser("STUDENT");
    const { coxinha, esgotado } = await createCatalog();
    const res = await api()
      .post("/api/orders")
      .set("Authorization", auth)
      .send({ items: [{ productId: coxinha.id, quantity: 1 }, { productId: esgotado.id, quantity: 1 }] });

    expect(res.status).toBe(409);
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.orderItem.count()).toBe(0);
  });

  it("recusa produto inexistente e itens inválidos (400)", async () => {
    const { auth } = await createUser("STUDENT");
    await createCatalog();

    const missing = await api().post("/api/orders").set("Authorization", auth).send({ items: [{ productId: 9999, quantity: 1 }] });
    expect(missing.status).toBe(400);

    const empty = await api().post("/api/orders").set("Authorization", auth).send({ items: [] });
    expect(empty.status).toBe(400);

    const badQty = await api().post("/api/orders").set("Authorization", auth).send({ items: [{ productId: 1, quantity: 0 }] });
    expect(badQty.status).toBe(400);
  });

  it("exige autenticação para criar pedido (401)", async () => {
    const res = await api().post("/api/orders").send({ items: [{ productId: 1, quantity: 1 }] });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/orders/my — pedidos do usuário", () => {
  it("retorna apenas os pedidos do próprio estudante", async () => {
    const aluno1 = await createUser("STUDENT");
    const aluno2 = await createUser("STUDENT");
    const { coxinha, suco } = await createCatalog();

    await api().post("/api/orders").set("Authorization", aluno1.auth).send({ items: [{ productId: coxinha.id, quantity: 1 }] });
    await api().post("/api/orders").set("Authorization", aluno1.auth).send({ items: [{ productId: suco.id, quantity: 2 }] });
    const other = await api().post("/api/orders").set("Authorization", aluno2.auth).send({ items: [{ productId: suco.id, quantity: 1 }] });

    const res = await api().get("/api/orders/my").set("Authorization", aluno1.auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((o: { userId: number }) => o.userId === aluno1.user.id)).toBe(true);

    // Não consegue ver o pedido de outro aluno
    const forbidden = await api().get(`/api/orders/${other.body.id}`).set("Authorization", aluno1.auth);
    expect(forbidden.status).toBe(404);
  });
});

describe("PATCH /api/admin/orders/:id/status — atualização de status", () => {
  async function setupOrder() {
    const student = await createUser("STUDENT");
    const admin = await createUser("ADMIN");
    const { coxinha } = await createCatalog();
    const order = await api()
      .post("/api/orders")
      .set("Authorization", student.auth)
      .send({ items: [{ productId: coxinha.id, quantity: 1 }] });
    return { student, admin, orderId: order.body.id as number };
  }

  it("administrador avança o pedido pelo fluxo completo", async () => {
    const { admin, orderId } = await setupOrder();
    for (const status of ["PREPARING", "READY", "COMPLETED"]) {
      const res = await api().patch(`/api/admin/orders/${orderId}/status`).set("Authorization", admin.auth).send({ status });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }
  });

  it("recusa transição inválida (400)", async () => {
    const { admin, orderId } = await setupOrder();
    const res = await api().patch(`/api/admin/orders/${orderId}/status`).set("Authorization", admin.auth).send({ status: "COMPLETED" });
    expect(res.status).toBe(400);
    expect(res.body.details.allowed).toEqual(["Em preparação", "Cancelado"]);
  });

  it("recusa status desconhecido (400)", async () => {
    const { admin, orderId } = await setupOrder();
    const res = await api().patch(`/api/admin/orders/${orderId}/status`).set("Authorization", admin.auth).send({ status: "ENTREGUE" });
    expect(res.status).toBe(400);
  });

  it("estudante não pode alterar status (403), mas pode cancelar o próprio pedido pendente", async () => {
    const { student, orderId } = await setupOrder();
    const forbidden = await api().patch(`/api/admin/orders/${orderId}/status`).set("Authorization", student.auth).send({ status: "READY" });
    expect(forbidden.status).toBe(403);

    const cancel = await api().patch(`/api/orders/${orderId}/cancel`).set("Authorization", student.auth);
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe("CANCELLED");
  });

  it("painel administrativo reflete pedidos e faturamento", async () => {
    const { admin, orderId } = await setupOrder();
    await api().patch(`/api/admin/orders/${orderId}/status`).set("Authorization", admin.auth).send({ status: "PREPARING" });

    const res = await api().get("/api/admin/dashboard").set("Authorization", admin.auth);
    expect(res.status).toBe(200);
    expect(res.body.orders).toMatchObject({ total: 1, preparing: 1, pending: 0 });
    expect(res.body.revenue.total).toBe(6.5);
    expect(res.body.products).toMatchObject({ total: 3, unavailable: 1 });

    const list = await api().get("/api/admin/orders?status=PREPARING").set("Authorization", admin.auth);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].user.name).toBe("Aluno Teste");
  });
});
