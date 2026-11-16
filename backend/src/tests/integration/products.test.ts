import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { api, createCatalog, createUser, prisma, resetDatabase } from "./helpers.js";

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe("GET /api/products — consulta do cardápio", () => {
  it("lista apenas produtos disponíveis, com categoria e preço numérico", async () => {
    await createCatalog();
    const res = await api().get("/api/products");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((p: { name: string }) => p.name)).not.toContain("Pastel esgotado");
    expect(res.body[0]).toMatchObject({ price: expect.any(Number), category: { name: expect.any(String) } });
  });

  it("filtra por categoria e pesquisa por nome", async () => {
    const { bebidas } = await createCatalog();

    const byCategory = await api().get(`/api/products?categoryId=${bebidas.id}`);
    expect(byCategory.body.map((p: { name: string }) => p.name)).toEqual(["Suco de laranja"]);

    const bySearch = await api().get("/api/products?search=coxi");
    expect(bySearch.body.map((p: { name: string }) => p.name)).toEqual(["Coxinha"]);
  });

  it("lista categorias publicamente", async () => {
    await createCatalog();
    const res = await api().get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body.map((c: { name: string }) => c.name)).toEqual(["Bebidas", "Salgados"]);
  });
});

describe("Acesso administrativo", () => {
  it("bloqueia estudante em rota administrativa (403)", async () => {
    const { auth } = await createUser("STUDENT");
    const { salgados } = await createCatalog();

    const create = await api()
      .post("/api/admin/products")
      .set("Authorization", auth)
      .send({ name: "Hacker dog", price: 1, categoryId: salgados.id });
    expect(create.status).toBe(403);

    const dashboard = await api().get("/api/admin/dashboard").set("Authorization", auth);
    expect(dashboard.status).toBe(403);
    expect(await prisma.product.count({ where: { name: "Hacker dog" } })).toBe(0);
  });

  it("bloqueia rota administrativa sem token (401)", async () => {
    const res = await api().get("/api/admin/orders");
    expect(res.status).toBe(401);
  });

  it("administrador cria, edita, desativa e exclui produto", async () => {
    const { auth } = await createUser("ADMIN");
    const { salgados } = await createCatalog();

    const created = await api()
      .post("/api/admin/products")
      .set("Authorization", auth)
      .send({ name: "Empada", description: "Empada de palmito", price: 5.75, categoryId: salgados.id });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: "Empada", price: 5.75, available: true });

    const updated = await api()
      .put(`/api/admin/products/${created.body.id}`)
      .set("Authorization", auth)
      .send({ price: 6.25, available: false });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ price: 6.25, available: false });

    const adminList = await api().get("/api/admin/products").set("Authorization", auth);
    expect(adminList.body.map((p: { name: string }) => p.name)).toContain("Empada");

    const removed = await api().delete(`/api/admin/products/${created.body.id}`).set("Authorization", auth);
    expect(removed.status).toBe(204);
  });

  it("valida dados do produto (400)", async () => {
    const { auth } = await createUser("ADMIN");
    const res = await api()
      .post("/api/admin/products")
      .set("Authorization", auth)
      .send({ name: "", price: -5, categoryId: "abc" });
    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThanOrEqual(3);
  });

  it("gerencia categorias e impede excluir categoria com produtos", async () => {
    const { auth } = await createUser("ADMIN");
    const { salgados } = await createCatalog();

    const created = await api().post("/api/admin/categories").set("Authorization", auth).send({ name: "Doces" });
    expect(created.status).toBe(201);

    const duplicated = await api().post("/api/admin/categories").set("Authorization", auth).send({ name: "doces" });
    expect(duplicated.status).toBe(409);

    const blocked = await api().delete(`/api/admin/categories/${salgados.id}`).set("Authorization", auth);
    expect(blocked.status).toBe(409);

    const removed = await api().delete(`/api/admin/categories/${created.body.id}`).set("Authorization", auth);
    expect(removed.status).toBe(204);
  });
});
