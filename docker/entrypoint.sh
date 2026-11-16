#!/bin/sh
# Inicialização do container da aplicação em produção.
set -e

echo "[entrypoint] Aplicando migrations do Prisma (prisma migrate deploy)..."
# O compose só inicia este container depois do healthcheck do banco (pg_isready).
# Ainda assim, tentamos algumas vezes para tolerar reinícios do PostgreSQL.
attempt=1
until ./node_modules/.bin/prisma migrate deploy; do
  if [ "$attempt" -ge 5 ]; then
    echo "[entrypoint] ERRO: não foi possível aplicar as migrations após $attempt tentativas."
    exit 1
  fi
  echo "[entrypoint] Banco indisponível, nova tentativa em 3s ($attempt/5)..."
  attempt=$((attempt + 1))
  sleep 3
done

echo "[entrypoint] Executando seed idempotente..."
node dist/scripts/seed.js

echo "[entrypoint] Iniciando servidor de produção..."
exec node dist/server.js
