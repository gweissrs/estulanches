# syntax=docker/dockerfile:1
# =====================================================================
# EstuLanches - imagem de produção (multi-stage)
#   Stage 1: build do frontend (React + Vite)
#   Stage 2: build do backend (TypeScript + Prisma Client)
#   Stage 3: imagem final enxuta, sem ferramentas de build, executando como usuário não-root
# =====================================================================

ARG NODE_VERSION=24-slim

# ---------- Stage 1: frontend ----------
FROM node:${NODE_VERSION} AS frontend-build
WORKDIR /build/frontend
# Copia só os manifestos primeiro para aproveitar o cache de camadas do Docker
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: backend ----------
FROM node:${NODE_VERSION} AS backend-build
WORKDIR /build/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY backend/ ./
# prisma generate + tsc → dist/ ; depois remove dependências de desenvolvimento
RUN npm run build && npm prune --omit=dev && npm cache clean --force

# ---------- Stage 3: runtime ----------
FROM node:${NODE_VERSION} AS runtime
ARG APP_VERSION=1.0.0
LABEL org.opencontainers.image.title="EstuLanches" \
      org.opencontainers.image.description="Sistema de gestão de cantina escolar" \
      org.opencontainers.image.version="${APP_VERSION}"

ENV NODE_ENV=production \
    PORT=3000 \
    PUBLIC_DIR=/app/public \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    PRISMA_HIDE_UPDATE_MESSAGE=1

# OpenSSL é usado pelo Prisma CLI (migrate deploy) para detectar a plataforma
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Arquivos necessários em tempo de execução (com dono = usuário não-root "node")
COPY --chown=node:node --from=backend-build /build/backend/package.json ./package.json
COPY --chown=node:node --from=backend-build /build/backend/node_modules ./node_modules
COPY --chown=node:node --from=backend-build /build/backend/dist ./dist
COPY --chown=node:node --from=backend-build /build/backend/prisma ./prisma
COPY --chown=node:node --from=backend-build /build/backend/prisma.config.ts ./prisma.config.ts
COPY --chown=node:node --from=frontend-build /build/frontend/dist ./public
COPY --chown=node:node docker/entrypoint.sh ./entrypoint.sh
RUN chmod 0555 ./entrypoint.sh

# Não executar como root
USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Entrypoint: aplica migrations → seed idempotente → inicia o servidor (node, sem nodemon)
ENTRYPOINT ["./entrypoint.sh"]
