# Arquitetura do EstuLanches

## 1. Visão geral

O EstuLanches é uma aplicação web em três camadas:

| Camada | Responsabilidade | Tecnologia |
| --- | --- | --- |
| Apresentação | Interface do estudante e do administrador (SPA) | React 19 + Vite + React Router |
| Aplicação | API REST, autenticação, autorização, regras de negócio | Node.js 24 + Express 5 + TypeScript |
| Dados | Persistência relacional e migrations | PostgreSQL 17 + Prisma ORM 7.8.0 |

Em produção, as camadas rodam em **dois containers** orquestrados pelo Docker Compose:

```
┌──────────────────────────── host ────────────────────────────┐
│  porta 3000                                                    │
│      │                                                         │
│  ┌───▼─────────────────────────┐   rede estulanches-net        │
│  │ estulanches-app (node, uid 1000)│ ─────────────────┐         │
│  │  Express                     │                     │         │
│  │   ├─ static  → /app/public   │   postgresql://     │         │
│  │   └─ /api    → controllers   │   senai@db:5432     ▼         │
│  │       └─ services → Prisma   │   ┌──────────────────────┐    │
│  └──────────────────────────────┘   │ estulanches-db         │    │
│                                      │ postgres:17-alpine     │    │
│                                      │ volume estulanches_pgdata│  │
│                                      └──────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

## 2. Backend

### Organização em camadas

```
requisição HTTP
   │
   ▼
routes/index.ts ─── define método, caminho e a cadeia de middlewares
   │
   ├─ middlewares/auth.ts       authenticate (JWT) → authorize(perfil)
   ├─ middlewares/validate.ts   valida body/query/params com Zod
   ▼
controllers/*.controller.ts ─── traduz HTTP ⇄ chamadas de serviço (sem regra de negócio)
   ▼
services/*.service.ts ───────── regras de negócio, transações, consultas Prisma
   ▼
config/prisma.ts ────────────── PrismaClient + @prisma/adapter-pg (pool do driver pg)
   ▼
PostgreSQL

Qualquer erro lançado → middlewares/errorHandler.ts → resposta JSON padronizada
```

- **utils/** concentra funções puras e testáveis: `jwt`, `password`, `cart` (cálculos em centavos), `orderStatus` (máquina de estados), `validators`, `orderNumber`.
- **Express 5** propaga automaticamente erros de handlers `async` para o `errorHandler`.

### Prisma 7.8.0

| Item | Configuração |
| --- | --- |
| Generator | `provider = "prisma-client"`, `output = "../src/generated/prisma"`, `moduleFormat = "esm"`, `importFileExtension = "js"` |
| Datasource | `provider = "postgresql"` (a URL **não** fica no schema no Prisma 7) |
| `prisma.config.ts` | caminho do schema, das migrations, comando de seed e `datasource.url` lido de `DATABASE_URL` |
| Conexão em runtime | `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` |

## 3. Modelagem de dados

```
┌──────────────┐ 1      N ┌──────────────┐ N      1 ┌──────────────┐
│    users     │──────────│    orders    │          │  categories  │
├──────────────┤          ├──────────────┤          ├──────────────┤
│ id PK        │          │ id PK        │          │ id PK        │
│ name         │          │ order_number U│          │ name U       │
│ email U      │          │ user_id FK   │          │ description  │
│ password(hash)│         │ total        │          │ created_at   │
│ role         │          │ status       │          └──────┬───────┘
│ created_at   │          │ created_at   │                 │ 1
│ updated_at   │          │ updated_at   │                 │
└──────────────┘          └──────┬───────┘                 │ N
                                 │ 1                ┌──────┴───────┐
                                 │ N                │   products   │
                          ┌──────┴───────┐ N      1 ├──────────────┤
                          │ order_items  │──────────│ id PK        │
                          ├──────────────┤          │ name         │
                          │ id PK        │          │ description  │
                          │ order_id FK  │          │ price        │
                          │ product_id FK│          │ image        │
                          │ quantity     │          │ available    │
                          │ unit_price   │          │ category_id FK│
                          │ subtotal     │          │ created_at   │
                          └──────────────┘          │ updated_at   │
                                                    └──────────────┘
```

| Regra | Implementação |
| --- | --- |
| Valores monetários | `Decimal(10,2)` |
| Preço histórico | `order_items.unit_price` copia o preço no momento da compra |
| Integridade | `orders → users` e `order_items → products` com `ON DELETE RESTRICT`; `order_items → orders` com `CASCADE`; `products → categories` com `RESTRICT` |
| Enums | `Role (STUDENT, ADMIN)`, `OrderStatus (PENDING, PREPARING, READY, COMPLETED, CANCELLED)` |
| Índices | `users.email` (único), `orders.order_number` (único), `orders(user_id, created_at)`, `orders.status`, `orders.created_at`, `products.category_id`, `products.available`, `order_items.order_id/product_id` |

## 4. Fluxo de criação de pedido

```
Frontend (carrinho)                         Backend
──────────────────                          ──────────────────────────────────────────────
POST /api/orders
{ items: [{productId, quantity}] }  ──►  authenticate + authorize(STUDENT)
(nenhum preço é enviado)                 validate(createOrderSchema)  → 400 se inválido
                                         mergeCartItems (agrupa repetidos)
                                         BEGIN TRANSACTION (Serializable)
                                           SELECT produtos WHERE id IN (...)
                                           inexistente?   → 400
                                           indisponível?  → 409
                                           subtotal = unit_price × qtd (centavos)
                                           INSERT orders + order_items (snapshot do preço)
                                         COMMIT   (colisão de número/serialização → nova tentativa)
                          ◄──  201 { id, orderNumber, total, status: PENDING, items }
```

## 5. Máquina de estados do pedido

```
PENDING ──► PREPARING ──► READY ──► COMPLETED
   │            │
   └────────────┴──► CANCELLED
```

- Somente administradores avançam o status; o estudante pode cancelar apenas em `PENDING`.
- O `UPDATE` é condicional ao status atual (`WHERE id = ? AND status = ?`). Se duas pessoas alterarem ao mesmo tempo, a segunda recebe 409 em vez de sobrescrever.

## 6. Frontend

| Pasta | Conteúdo |
| --- | --- |
| `hooks/useAuth.jsx` | contexto de sessão: login, cadastro, logout, recuperação de sessão via `/auth/me`, logout automático em 401 |
| `hooks/useCart.jsx` | carrinho persistido no `localStorage` (apenas exibição; o backend recalcula) |
| `hooks/useFetch.js` | carregamento com estados de loading/erro e polling opcional (tempo real) |
| `hooks/useToast.jsx` | notificações de sucesso/erro |
| `components/ProtectedRoute.jsx` | bloqueia rotas por autenticação/perfil (UX — a segurança real está no backend) |
| `services/api.js` | instância Axios com interceptor que injeta o JWT |
| `styles/global.css` | tokens de design (cores, raios, sombras, tipografia) |

Rotas: `/`, `/cardapio`, `/carrinho`, `/login`, `/cadastro`, `/pedidos`, `/pedidos/:id`, `/admin`, `/admin/pedidos`, `/admin/produtos`, `/admin/categorias`.

## 7. Infraestrutura

| Item | Configuração |
| --- | --- |
| Dockerfile | multi-stage: `frontend-build` → `backend-build` (prisma generate + tsc + prune) → `runtime` (node:24-slim, usuário `node`) |
| Entrypoint | `prisma migrate deploy` (com novas tentativas) → `seed` idempotente → `exec node dist/server.js` |
| Compose | serviços `app` e `db` (+ `db-test` no profile `test`); `depends_on: condition: service_healthy` |
| Healthchecks | `db`: `pg_isready`; `app`: `GET /api/health` (que executa `SELECT 1`) |
| Persistência | volume nomeado `estulanches_pgdata` |
| Rede | bridge `estulanches-net`; banco sem porta exposta no host |
| Encerramento | `init: true` + tratamento de `SIGTERM` (fecha o servidor e desconecta o Prisma) |
