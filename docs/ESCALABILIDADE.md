# Escalabilidade Nacional — Proposta Conceitual

> **Importante:** este documento é uma **proposta conceitual de evolução arquitetural**. A versão atual do EstuLanches é uma aplicação acadêmica com um container de aplicação e um PostgreSQL, adequada para uma cantina. Ela **não** foi testada nem dimensionada para 100 mil usuários simultâneos, e nada aqui afirma que ela já suporte esse volume.

## 1. Cenário-alvo

| Métrica | Valor |
| --- | --- |
| Usuários cadastrados | 1.000.000 |
| Usuários simultâneos | 100.000 |
| Distribuição | todo o Brasil (milhares de escolas, cada uma com sua cantina) |

### Estimativa de carga (ordem de grandeza)

Premissas: cada usuário ativo faz em média **1 requisição a cada 10 s** (navegação no cardápio e polling do pedido).

- 100.000 simultâneos ÷ 10 s ≈ **10.000 requisições/s** em média.
- Picos concentrados nos intervalos escolares (manhã, tarde, noite): considerar **3×** → **~30.000 req/s**.
- Perfil: **~90% leitura** (cardápio, status) e **~10% escrita** (pedidos, mudanças de status).
- Se 20% dos simultâneos fizerem um pedido em uma janela de 15 min, são ~20.000 pedidos em 900 s ≈ **22 pedidos/s**, com picos de algumas centenas por segundo.

Conclusão: o desafio principal é **leitura em alta escala** e **picos curtos**. A escrita é relativamente modesta, mas precisa ser consistente (não pode perder pedidos).

## 2. Arquitetura proposta

```
                         Usuários (todo o Brasil)
                                   │
                    ┌──────────────┴──────────────┐
                    │  DNS + CDN (borda nacional) │  ← React (build estático) e imagens
                    └──────────────┬──────────────┘
                                   │ /api
                         ┌─────────▼─────────┐
                         │ Load Balancer L7  │  ← TLS, health checks, rate limit, WAF
                         └─────────┬─────────┘
             ┌───────────┬─────────┼─────────┬───────────┐
             ▼           ▼         ▼         ▼           ▼
          ┌──────┐   ┌──────┐  ┌──────┐  ┌──────┐    ┌──────┐
          │ API  │   │ API  │  │ API  │  │ API  │ …  │ API  │   ← pods stateless (Kubernetes + HPA)
          └──┬───┘   └──┬───┘  └──┬───┘  └──┬───┘    └──┬───┘
             │          │         │         │           │
     ┌───────┴──────────┴────┬────┴─────────┴───┬───────┴────────┐
     ▼                       ▼                  ▼                ▼
┌──────────┐        ┌────────────────┐   ┌─────────────┐  ┌──────────────┐
│  Redis   │        │   PgBouncer    │   │ Fila        │  │ Observabil.  │
│ (cache,  │        │ (pool)         │   │ RabbitMQ /  │  │ Prometheus,  │
│ rate     │        └───┬────────┬───┘   │ Kafka       │  │ Grafana,     │
│ limit)   │            ▼        ▼       └──────┬──────┘  │ Loki, OTel   │
└──────────┘     ┌──────────┐ ┌──────────┐      ▼         └──────────────┘
                 │ Postgres │ │ Réplicas │  ┌──────────┐
                 │ primário │→│ leitura  │  │ Workers  │ ← notificações, relatórios,
                 │ (escrita)│ │ (N)      │  │          │   agregações do dashboard
                 └──────────┘ └──────────┘  └──────────┘
```

## 3. Load Balancer

- Um balanceador **camada 7** (ex.: NGINX Ingress, AWS ALB, Google Cloud Load Balancing) recebe todo o tráfego `/api` e distribui entre as instâncias com *round-robin* ou *least connections*.
- **Health checks** usam o endpoint que já existe (`GET /api/health`). Instâncias com falha saem do pool automaticamente.
- Terminação **TLS** no balanceador, com **WAF** e **rate limiting** global (proteção contra abuso e DDoS).
- Como a API é **stateless** (sessão em JWT, sem estado em memória), não é preciso *sticky session*.

## 4. Escalabilidade horizontal

- O backend já foi construído **sem estado local**: autenticação por JWT, dados no PostgreSQL, nenhuma sessão em memória. Assim, basta executar **N réplicas idênticas** do container.
- Ajustes necessários para escalar:
  - o **rate limit** em memória (`express-rate-limit`) passa a usar um store compartilhado no **Redis**;
  - o **seed e as migrations** saem do entrypoint e passam a rodar em um **Job** único por versão, evitando que 50 réplicas tentem migrar ao mesmo tempo;
  - o frontend sai do container da API e vai para a **CDN**.
- Dimensionamento ilustrativo: se uma instância Node atende ~1.000–2.000 req/s em rotas cacheadas, 30.000 req/s de pico exigem algo entre **20 e 40 réplicas**, distribuídas em várias zonas de disponibilidade. Os números reais devem vir de **testes de carga** (k6, Gatling).

## 5. Banco de dados (PostgreSQL)

### Pool de conexões
- Cada réplica da API mantém um pool pequeno (o driver `pg` já usa pool; hoje `DB_POOL_MAX=10`).
- 40 réplicas × 10 conexões = 400 conexões. Com **PgBouncer** em modo *transaction pooling*, isso vira poucas dezenas de conexões reais no PostgreSQL.

### Réplicas de leitura
- Um **primário** recebe as escritas (pedidos, status); **réplicas de leitura** atendem cardápio, histórico e dashboards.
- O Prisma suporta essa separação com a extensão de *read replicas* ou com dois clients (escrita/leitura).
- Leituras que precisam de consistência imediata (ex.: o pedido que acabou de ser criado) continuam no primário.

### Otimização de consultas e índices
- O schema atual já tem índices em `orders(user_id, created_at)`, `orders.status`, `orders.created_at`, `products.category_id` e `products.available`.
- Na escala nacional, entra a dimensão **escola/cantina** (multi-tenant): adicionar `school_id` às tabelas e índices compostos como `orders(school_id, status, created_at)` e `products(school_id, available)`.
- Usar `EXPLAIN ANALYZE` e `pg_stat_statements` para encontrar consultas lentas; paginação por **cursor** em listas grandes.
- Indicadores do dashboard pré-agregados (tabelas de resumo ou *materialized views* atualizadas por workers), em vez de `COUNT`/`SUM` sobre milhões de linhas a cada acesso.

### Particionamento
- `orders` e `order_items` crescem continuamente. **Particionamento por data** (mensal) no PostgreSQL mantém índices pequenos e permite arquivar dados antigos.
- Se o volume de escrita superar um único primário, a evolução é **sharding por escola/região** (ex.: Citus), já que cada cantina opera de forma praticamente independente.

## 6. Cache (Redis)

| Dado | Estratégia | TTL sugerido |
| --- | --- | --- |
| Cardápio e categorias por escola | *cache-aside*; invalidação quando o admin altera um produto | 1–5 min |
| Produtos populares | recalculado periodicamente por worker | 5–15 min |
| Status de pedido | escrito no Redis a cada mudança; consultado pelo polling | curto |
| Rate limit | contadores compartilhados entre réplicas | janela do limite |
| Blacklist de tokens (logout forçado) | chave por `jti` até a expiração do JWT | duração do token |

O cardápio é o ponto de maior leitura e muda pouco, então o cache reduz drasticamente a carga no PostgreSQL.

## 7. Filas (RabbitMQ ou Apache Kafka)

Tarefas que não precisam acontecer dentro da requisição vão para uma fila e são processadas por **workers**:

- notificações (push, e-mail, SMS) de "pedido pronto";
- atualização dos agregados do dashboard e de produtos populares;
- integração com pagamento online e emissão de comprovantes;
- auditoria e eventos para análise de dados.

**RabbitMQ** atende bem a filas de tarefas com confirmação e reprocessamento. **Kafka** é mais indicado quando os eventos de pedido precisam ser retidos e consumidos por vários sistemas (analytics, antifraude, BI). Em picos, a fila absorve o excesso e os workers processam no próprio ritmo, sem derrubar a API.

## 8. CDN

- O build do React (HTML, JS, CSS) e as imagens dos produtos são servidos por uma **CDN** com pontos de presença no Brasil (ex.: CloudFront, Cloudflare, Akamai).
- Arquivos com *hash* no nome (gerados pelo Vite) recebem cache longo (`immutable`); o `index.html` recebe cache curto.
- Imagens enviadas pelos administradores ficam em armazenamento de objetos (S3/GCS) e são otimizadas (WebP/AVIF, vários tamanhos).
- Resultado: menor latência para usuários distantes e uma grande fatia do tráfego que nunca chega aos servidores.

## 9. Monitoramento e observabilidade

| Pilar | Ferramentas | O que medir |
| --- | --- | --- |
| Métricas | Prometheus + Grafana | requisições/s, latência p50/p95/p99, taxa de erros 5xx, CPU, memória, conexões do banco, *replication lag*, tamanho das filas |
| Logs | Loki ou ELK, em JSON estruturado | erros com *request id*, auditoria de ações administrativas |
| Traces | OpenTelemetry + Jaeger/Tempo | caminho de uma requisição: API → Redis → PostgreSQL |
| Disponibilidade | *uptime checks* externos + `/api/health` | SLO sugerido: 99,9% e p95 < 300 ms |
| Alertas | Alertmanager / PagerDuty | erro > 1%, p95 acima do SLO, réplica de banco atrasada, disco > 80% |

## 10. Infraestrutura com Kubernetes

O Docker Compose atual é ideal para um servidor. Para dezenas de servidores, o **Kubernetes** orquestra os mesmos containers:

| Necessidade | Recurso Kubernetes |
| --- | --- |
| N réplicas da API | `Deployment` |
| Escalar conforme a carga | `HorizontalPodAutoscaler` (CPU, memória ou req/s) e *cluster autoscaler* para adicionar nós |
| Endereço estável e balanceamento interno | `Service` |
| Entrada HTTP/TLS | `Ingress` / Gateway API |
| Configuração e segredos | `ConfigMap` e `Secret` (ou Vault / Secrets Manager) |
| Migrations uma vez por versão | `Job` executado antes do rollout |
| Atualização sem indisponibilidade | *rolling update* com `readinessProbe` (`/api/health`) e `livenessProbe` |
| Alta disponibilidade | réplicas em várias zonas, `PodDisruptionBudget` |
| Banco gerenciado | PostgreSQL gerenciado (RDS, Cloud SQL, Azure) ou operador (CloudNativePG) |

A imagem Docker atual já segue boas práticas para esse cenário: multi-stage, usuário não-root, healthcheck, configuração 100% por variáveis de ambiente e encerramento gracioso com `SIGTERM`.

## 11. Roteiro de evolução

| Fase | Escopo | Principais mudanças |
| --- | --- | --- |
| **Atual** | 1 cantina | Docker Compose: 1 API + 1 PostgreSQL |
| **1** | Algumas escolas | `school_id` (multi-tenant), frontend na CDN, 2–3 réplicas atrás de um load balancer, backups automáticos |
| **2** | Uma rede regional | Kubernetes + HPA, Redis (cache e rate limit), PgBouncer, réplica de leitura, monitoramento completo |
| **3** | Brasil | múltiplas zonas/regiões, filas e workers, particionamento de pedidos, WebSocket/SSE no lugar do polling, testes de carga contínuos |

Cada fase deve ser validada com **testes de carga** e métricas reais antes de avançar. A arquitetura evolui conforme a demanda medida, não por antecipação.
