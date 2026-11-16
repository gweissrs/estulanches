import { describe, expect, it } from "vitest";
import { comparePassword, hashPassword } from "../../utils/password.js";

describe("Hash de senha com bcrypt", () => {
  it("gera um hash bcrypt diferente da senha original", async () => {
    const hash = await hashPassword("Senha1234", 4);
    expect(hash).not.toBe("Senha1234");
    expect(hash).toMatch(/^\$2[aby]\$04\$.{53}$/);
  });

  it("gera hashes diferentes para a mesma senha (salt aleatório)", async () => {
    const [a, b] = await Promise.all([hashPassword("Senha1234", 4), hashPassword("Senha1234", 4)]);
    expect(a).not.toBe(b);
  });
});

describe("Comparação de senhas", () => {
  it("retorna true para a senha correta", async () => {
    const hash = await hashPassword("Senha1234", 4);
    await expect(comparePassword("Senha1234", hash)).resolves.toBe(true);
  });

  it("retorna false para senha incorreta", async () => {
    const hash = await hashPassword("Senha1234", 4);
    await expect(comparePassword("senha1234", hash)).resolves.toBe(false);
    await expect(comparePassword("", hash)).resolves.toBe(false);
  });
});
