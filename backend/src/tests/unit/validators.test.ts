import { describe, expect, it } from "vitest";
import { isStrongPassword, isValidEmail, isValidQuantity, normalizeEmail } from "../../utils/validators.js";

describe("Validação de e-mail", () => {
  it.each(["aluno@escola.com", "maria.silva@senai.br", "joao+cantina@sp.senai.br"])("aceita e-mail válido: %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(["", "aluno", "aluno@", "@escola.com", "aluno@escola", "aluno @escola.com", "aluno@@escola.com", "a..b@escola.com"])(
    "rejeita e-mail inválido: '%s'",
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );

  it("rejeita valores que não são texto", () => {
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(123)).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });

  it("normaliza e-mail (minúsculas e sem espaços)", () => {
    expect(normalizeEmail("  Aluno@Escola.COM ")).toBe("aluno@escola.com");
  });
});

describe("Validação de quantidade de produtos", () => {
  it.each([1, 5, 20])("aceita quantidade %i", (q) => {
    expect(isValidQuantity(q)).toBe(true);
  });

  it.each([0, -1, 21, 1.5, Number.NaN, "2", null])("rejeita quantidade %s", (q) => {
    expect(isValidQuantity(q)).toBe(false);
  });
});

describe("Política de senha", () => {
  it("exige ao menos 8 caracteres com letras e números", () => {
    expect(isStrongPassword("Senha123")).toBe(true);
    expect(isStrongPassword("curta1")).toBe(false);
    expect(isStrongPassword("somenteletras")).toBe(false);
    expect(isStrongPassword("12345678")).toBe(false);
  });

  it("rejeita senhas acima de 72 caracteres (limite do bcrypt)", () => {
    expect(isStrongPassword("a1".repeat(37))).toBe(false);
  });
});
