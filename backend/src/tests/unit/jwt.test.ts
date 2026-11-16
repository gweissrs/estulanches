import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "../../utils/jwt.js";

const SECRET = "segredo-de-teste-unitario-com-mais-de-32-chars";

describe("Geração e validação de JWT", () => {
  it("gera um token com três partes e o valida recuperando id e perfil", () => {
    const token = signToken({ sub: 42, role: "STUDENT" }, SECRET, "1h");
    expect(token.split(".")).toHaveLength(3);
    expect(verifyToken(token, SECRET)).toEqual({ sub: 42, role: "STUDENT" });
  });

  it("preserva o perfil ADMIN", () => {
    const token = signToken({ sub: 1, role: "ADMIN" }, SECRET);
    expect(verifyToken(token, SECRET).role).toBe("ADMIN");
  });

  it("rejeita token assinado com outro segredo", () => {
    const token = signToken({ sub: 1, role: "STUDENT" }, "outro-segredo-qualquer-com-32-caracteres!!");
    expect(() => verifyToken(token, SECRET)).toThrow();
  });

  it("rejeita token adulterado", () => {
    const token = signToken({ sub: 1, role: "STUDENT" }, SECRET);
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "1", role: "ADMIN", iss: "estulanches-api" })).toString("base64url");
    expect(() => verifyToken(`${header}.${forgedPayload}.${signature}`, SECRET)).toThrow();
  });

  it("rejeita token expirado", () => {
    const expired = jwt.sign({ role: "STUDENT" }, SECRET, {
      subject: "1",
      issuer: "estulanches-api",
      expiresIn: -10,
    });
    expect(() => verifyToken(expired, SECRET)).toThrow(/expired/);
  });

  it("rejeita token com perfil desconhecido", () => {
    const token = jwt.sign({ role: "SUPERUSER" }, SECRET, { subject: "1", issuer: "estulanches-api" });
    expect(() => verifyToken(token, SECRET)).toThrow("Token malformado");
  });
});
