# Guia de Implantação e Validação

Este guia descreve como implantar o EstuLanches com Docker, validar os containers e diagnosticar problemas. As saídas reais da implantação registrada na RDM estão em [evidencias/](evidencias/).

## 1. Pré-requisitos

- Docker Desktop em execução (`docker info` deve responder sem erro)
- Porta **3000** livre no host (ou altere `APP_PORT` no `.env`)
- Arquivo `.env` na raiz, criado a partir de `.env.example`

## 2. Implantação

```bash
cp .env.example .env          # apenas na primeira vez; preencha os valores
docker compose up -d --build
```

O que acontece:

1. O Docker constrói a imagem `estulanches-app:1.0.0` em três estágios (frontend, backend, runtime).
2. O container `db` (PostgreSQL 17) inicia e passa no healthcheck `pg_isready`.
3. Só então o `app` inicia (`depends_on: condition: service_healthy`).
4. O entrypoint executa `prisma migrate deploy`, o seed idempotente e inicia `node dist/server.js`.
5. O healthcheck do `app` chama `GET /api/health`, que testa o banco com `SELECT 1`.

## 3. Validação dos containers

### Estado

```bash
docker compose ps
```

Os dois serviços devem estar `Up ... (healthy)`:

```
NAME              IMAGE                   SERVICE   STATUS                    PORTS
estulanches-app   estulanches-app:1.0.0   app       Up 18 seconds (healthy)   0.0.0.0:3000->3000/tcp
estulanches-db    postgres:17-alpine      db        Up 24 seconds (healthy)   5432/tcp
```

> Observe que o `db` mostra `5432/tcp` **sem** mapeamento para o host: o banco só é acessível pela rede interna.

### Logs

```bash
docker compose logs          # todos os serviços
docker compose logs app      # aplicação
docker compose logs db       # banco
docker compose logs -f app   # acompanhar em tempo real (Ctrl+C para sair)
docker compose logs --tail 50 app
```

Inicialização saudável do `app`:

```
[entrypoint] Aplicando migrations do Prisma (prisma migrate deploy)...
All migrations have been successfully applied.     (ou: No pending migrations to apply.)
[entrypoint] Executando seed idempotente...
[seed] Concluído.
[entrypoint] Iniciando servidor de produção...
[db] Conexão com o PostgreSQL estabelecida.
[app] EstuLanches API ouvindo na porta 3000 (production)
```

Inicialização saudável do `db`:

```
database system is ready to accept connections
```

Auditoria rápida de erros nos logs:

```bash
docker compose logs app | grep -iE "error|fatal|warn"
docker compose logs db  | grep -iE "error|fatal|panic"
```

### Saúde da API

```bash
curl http://localhost:3000/api/health
# {"status":"ok","database":"up","uptime":42}

docker inspect --format "{{.State.Health.Status}}" estulanches-app estulanches-db
```

### Portas ativas

```bash
docker compose port app 3000          # porta publicada → 0.0.0.0:3000
docker port estulanches-app

# Windows
netstat -ano | findstr :3000
# Linux / macOS
ss -ltnp | grep 3000      # ou: lsof -i :3000
```

### Volume, rede e usuário

```bash
docker volume inspect estulanches_pgdata
docker network inspect estulanches-net
docker exec estulanches-app id         # uid=1000(node) → não é root
```

### Persistência

```bash
docker compose down        # remove containers, MANTÉM o volume
docker compose up -d
docker compose logs app    # "[seed] Produtos já existem..." → os dados sobreviveram
```

> ⚠️ `docker compose down -v` apaga o volume `estulanches_pgdata` e **todos os dados**. Use somente quando quiser zerar o banco de propósito.

## 4. Migrations em produção

As migrations são aplicadas automaticamente a cada inicialização (`prisma migrate deploy` só aplica o que estiver pendente). Para operar manualmente:

```bash
docker compose exec app ./node_modules/.bin/prisma migrate status
docker compose exec app ./node_modules/.bin/prisma migrate deploy
```

Para criar uma nova migration (em desenvolvimento):

```bash
cd backend
npx prisma migrate dev --name minha_alteracao    # gera prisma/migrations/<data>_minha_alteracao
docker compose up -d --build                     # a nova migration é aplicada no deploy
```

## 5. Testes

```bash
docker compose --profile test up -d db-test      # banco isolado: estulanches_test, porta 5433, tmpfs
cd backend
cp .env.test.example .env.test                   # ajuste usuário/senha
npm install
npm run test:unit
npm run test:integration
```

## 6. Solução de problemas

| Sintoma | Causa provável | Como resolver |
| --- | --- | --- |
| `failed to connect to the docker API` | Docker Desktop parado | Abra o Docker Desktop e aguarde "Engine running" |
| `required variable POSTGRES_PASSWORD is missing` | `.env` ausente ou incompleto | `cp .env.example .env` e preencha |
| `Bind for 0.0.0.0:3000 failed: port is already allocated` | Porta 3000 ocupada | Encontre o processo (`netstat -ano \| findstr :3000`) ou altere `APP_PORT` no `.env` |
| `app` reiniciando em loop | Erro na inicialização | `docker compose logs app` — procure `[entrypoint] ERRO` ou `Falha na inicialização` |
| `Variável de ambiente obrigatória ausente: JWT_SECRET` | `JWT_SECRET` vazio | Defina no `.env` |
| `JWT_SECRET deve ter pelo menos 32 caracteres` | Segredo fraco em produção | Gere um segredo com o comando do README |
| `P1000: Authentication failed` | Senha do `.env` diferente da usada ao criar o volume | O PostgreSQL só aplica `POSTGRES_PASSWORD` na **primeira** criação do volume. Volte à senha original ou recrie o volume (apaga os dados) |
| `app` em `health: starting` por muito tempo | Migrations/seed ainda rodando ou banco lento | Aguarde ~30 s; verifique `docker compose logs app` |
| `db` `unhealthy` | Erro no PostgreSQL | `docker compose logs db`; verifique espaço em disco |
| Página em branco no navegador | Erro de JavaScript | Abra o DevTools (F12) → Console |
| Login retorna 429 | Rate limit (20 tentativas / 15 min) | Aguarde 15 minutos |

Para inspecionar o container por dentro:

```bash
docker compose exec app sh
docker compose exec db psql -U senai -d estulanches -c "\dt"
```

## 7. Rollback

1. Volte o código para a versão anterior (`git checkout <tag-anterior>`).
2. Execute `docker compose up -d --build`.
3. Se a versão nova tiver migrations destrutivas, restaure um backup feito antes da mudança:

```bash
# backup (antes de implantar)
docker compose exec -T db pg_dump -U senai estulanches > backup.sql
# restauração
docker compose exec -T db psql -U senai -d estulanches < backup.sql
```
