import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { api, createUser, prisma, resetDatabase } from "./helpers.js";

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe("POST /api/auth/register — cadastro de usuário", () => {
  it("cadastra um estudante, salva a senha com bcrypt e devolve um token", async () => {
    const res = await api()
      .post("/api/auth/register")
      .send({ name: "Maria Souza", email: "Maria@Escola.com", password: "Senha1234" });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: "Maria Souza", email: "maria@escola.com", role: "STUDENT" });
    expect(res.body.user.password).toBeUndefined();

    const saved = await prisma.user.findUniqueOrThrow({ where: { email: "maria@escola.com" } });
    expect(saved.password).not.toBe("Senha1234");
    expect(saved.password).toMatch(/^\$2[aby]\$/);
  });

  it("ignora tentativa de se cadastrar como ADMIN", async () => {
    const res = await api()
      .post("/api/auth/register")
      .send({ name: "Invasor", email: "invasor@escola.com", password: "Senha1234", role: "ADMIN" });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("STUDENT");
  });

  it("recusa e-mail já cadastrado (409)", async () => {
    await createUser("STUDENT", { email: "repetido@escola.com" });
    const res = await api()
      .post("/api/auth/register")
      .send({ name: "Outro", email: "repetido@escola.com", password: "Senha1234" });
    expect(res.status).toBe(409);
  });
});

describe("Validação de dados inválidos", () => {
  it("retorna 400 com os campos inválidos no cadastro", async () => {
    const res = await api().post("/api/auth/register").send({ name: "A", email: "nao-e-email", password: "123" });
    expect(res.status).toBe(400);
    const fields = res.body.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });

  it("retorna 400 para JSON malformado", async () => {
    const res = await api().post("/api/auth/login").set("Content-Type", "application/json").send("{email:");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("faz login com credenciais válidas", async () => {
    await api().post("/api/auth/register").send({ name: "João Lima", email: "joao@escola.com", password: "Senha1234" });

    const res = await api().post("/api/auth/login").send({ email: "joao@escola.com", password: "Senha1234" });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: "joao@escola.com", role: "STUDENT" });
  });

  it("recusa senha incorreta com 401 e mensagem genérica", async () => {
    await api().post("/api/auth/register").send({ name: "João Lima", email: "joao@escola.com", password: "Senha1234" });

    const res = await api().post("/api/auth/login").send({ email: "joao@escola.com", password: "SenhaErrada1" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("E-mail ou senha incorretos.");
    expect(res.body.token).toBeUndefined();
  });

  it("recusa e-mail inexistente com a mesma mensagem (não revela contas)", async () => {
    const res = await api().post("/api/auth/login").send({ email: "ninguem@escola.com", password: "Senha1234" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("E-mail ou senha incorretos.");
  });
});

describe("Rotas protegidas", () => {
  it("bloqueia acesso sem token (401)", async () => {
    const res = await api().get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("bloqueia token inválido (401)", async () => {
    const res = await api().get("/api/orders/my").set("Authorization", "Bearer token.falso.qualquer");
    expect(res.status).toBe(401);
  });

  it("recupera a sessão com token válido", async () => {
    const { auth, user } = await createUser("STUDENT");
    const res = await api().get("/api/auth/me").set("Authorization", auth);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, email: user.email });
  });
});
