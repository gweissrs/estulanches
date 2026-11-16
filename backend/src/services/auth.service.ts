import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { signToken } from "../utils/jwt.js";
import { comparePassword, hashPassword } from "../utils/password.js";

const publicUser = { id: true, name: true, email: true, role: true, createdAt: true } as const;

// Hash válido usado quando o e-mail não existe, para que o tempo de resposta do login
// não revele se uma conta está cadastrada (mitiga enumeração de usuários).
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword("estulanches-dummy-password", env.bcryptSaltRounds));

function issueToken(user: { id: number; role: "STUDENT" | "ADMIN" }) {
  return signToken({ sub: user.id, role: user.role }, env.jwtSecret, env.jwtExpiresIn);
}

export async function register(data: { name: string; email: string; password: string }) {
  const exists = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (exists) throw AppError.conflict("Este e-mail já está cadastrado.");

  // Cadastro público cria sempre perfil STUDENT; administradores são criados pelo seed.
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: await hashPassword(data.password, env.bcryptSaltRounds),
      role: "STUDENT",
    },
    select: publicUser,
  });

  return { user, token: issueToken(user) };
}

export async function login(data: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  const valid = await comparePassword(data.password, user?.password ?? (await getDummyHash()));
  if (!user || !valid) throw AppError.unauthorized("E-mail ou senha incorretos.");

  const { password: _password, updatedAt: _updatedAt, ...safeUser } = user;
  return { user: safeUser, token: issueToken(user) };
}

export async function getProfile(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUser });
  if (!user) throw AppError.notFound("Usuário não encontrado.");
  return user;
}
