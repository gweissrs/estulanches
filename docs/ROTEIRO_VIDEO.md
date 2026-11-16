# Roteiro do Vídeo de Apresentação — EstuLanches

**Duração-alvo:** 4 min 30 s (limite: 2 a 5 min) · **Formato:** gravação de tela com narração

## Antes de gravar (checklist)

- [ ] `docker compose up -d --build` executado e `docker compose ps` mostrando os dois containers `healthy`
- [ ] Banco de teste no ar: `docker compose --profile test up -d db-test`
- [ ] Abas abertas no navegador: `http://localhost:3000` (anônima) e outra já logada como admin
- [ ] VS Code com `Dockerfile`, `docker-compose.yml`, `backend/src/middlewares/auth.ts`, `backend/src/services/order.service.ts`
- [ ] Terminal na pasta do projeto, fonte grande
- [ ] `docs/RDM.pdf` aberto
- [ ] Notificações do computador desativadas

---

## 1. Apresentação — 0:00 a 0:25

**Tela:** página inicial do EstuLanches.

> "Olá, eu sou **[seu nome]**, aluno do curso Técnico em Desenvolvimento de Sistemas do SENAI. Este é o **EstuLanches**, um sistema de gestão de cantina escolar.
> Nas cantinas, os pedidos costumam ser anotados no papel, as filas são grandes no intervalo e acontecem erros de comunicação. Com o EstuLanches, o estudante faz o pedido pelo celular e acompanha o preparo, e a equipe da cantina gerencia tudo em um painel."

## 2. Tecnologias e arquitetura — 0:25 a 0:55

**Tela:** seção "Arquitetura" do README.

> "O frontend é feito em **React** com Vite. O backend usa **Node.js** com **Express** e TypeScript, e o banco é **PostgreSQL**, acessado pelo **Prisma ORM versão 7.8**.
> O React chama a API REST em `/api`. A API valida o token, aplica as regras de negócio e usa o Prisma para consultar o banco. Em produção, o próprio Express entrega o frontend, então tudo funciona em uma única porta."

## 3. Dockerfile e Docker Compose — 0:55 a 1:45

**Tela:** `Dockerfile`.

> "O Dockerfile é **multi-stage**. O primeiro estágio gera o build do React; o segundo gera o Prisma Client e compila o backend, removendo as dependências de desenvolvimento. A imagem final só recebe o necessário e roda com o usuário **node**, não como root."

**Tela:** `docker-compose.yml`.

> "No Compose temos dois serviços. O **db** usa a imagem oficial do PostgreSQL, com usuário senai, a senha vinda do arquivo `.env`, um **volume persistente** e healthcheck com **pg_isready**. O **app** só inicia depois que o banco está saudável. Ele acessa o banco pelo nome do serviço, `db`, pela rede interna. O banco nem publica porta para fora.
> Ao iniciar, o container aplica as migrations com `prisma migrate deploy` e sobe o servidor com `node`, sem Nodemon."

**Tela:** terminal → `docker compose ps` e `docker compose logs app --tail 8`.

> "Aqui estão os dois containers **healthy**, e no log as migrations aplicadas e o servidor ouvindo na porta 3000."

## 4. Testes — 1:45 a 2:20

**Tela:** terminal → `cd backend` e `npm run test:unit`.

> "Os testes usam **Vitest**. Os unitários cobrem validação de e-mail, hash de senha com bcrypt, geração e validação do JWT, o cálculo do carrinho e as regras de mudança de status: **49 testes aprovados**."

**Tela:** `npm run test:integration`.

> "Os de integração chamam a API de verdade, com **Supertest**, em um **banco de teste separado**. Eles testam cadastro, login com senha errada, acesso sem token, estudante tentando acessar rota de administrador, criação de pedido e atualização de status: **30 testes aprovados**."

## 5. Demonstração prática — 2:20 a 3:20

**Tela:** navegador (aba anônima).

> "Vou entrar como estudante..." *(login)*
> "No cardápio, filtro por categoria, pesquiso e adiciono itens ao carrinho." *(adicionar 2–3 itens)*
> "No carrinho altero a quantidade e confirmo. O backend busca os preços no banco e calcula o total, então ninguém consegue alterar o preço pelo navegador." *(confirmar)*
> "Pronto: o pedido foi gerado com este número e está aguardando confirmação."

**Tela:** aba do administrador → Painel.

> "No painel administrativo vejo os indicadores: pedidos, pendentes, faturamento e produtos indisponíveis. Na fila de pedidos clico em **Preparar**..."

**Tela:** volta para a aba do estudante.

> "...e o estudante vê o status mudar sozinho para **Em preparação**. O admin também gerencia o cardápio: cadastra, edita e desativa produtos."

## 6. Segurança — 3:20 a 3:50

**Tela:** `backend/src/middlewares/auth.ts` e `.env.example`.

> "As senhas são salvas com **bcrypt**, nunca em texto puro. No login, a API gera um **JWT**, que o frontend envia em cada requisição. Este middleware valida o token, e o `authorize` bloqueia quem não é administrador: um estudante recebe **403**.
> Credenciais e o segredo do JWT ficam em **variáveis de ambiente**. O `.env` não vai para o GitHub; só o `.env.example`, sem senhas reais."

## 7. Escalabilidade — 3:50 a 4:15

**Tela:** diagrama do `docs/ESCALABILIDADE.md`.

> "Para atender **1 milhão de usuários e 100 mil simultâneos**, a proposta é colocar um **load balancer** na frente de várias instâncias da API, com **escalabilidade horizontal** no **Kubernetes**. O banco ganha **réplicas de leitura** e pool de conexões, o **Redis** faz cache do cardápio, filas processam tarefas em segundo plano e uma **CDN** entrega imagens e o frontend. É uma proposta de evolução; a versão atual é para uma cantina."

## 8. Ficha RDM — 4:15 a 4:30

**Tela:** `docs/RDM.pdf`.

> "Por fim, a Ficha de Registro de Mudança: implantação da **versão 1.0.0**, containers saudáveis, **79 testes aprovados** e logs sem erros críticos. Status final: **aprovado**. Obrigado!"

---

### Dicas

- Fale em ritmo natural. Se passar de 5 min, encurte as seções 2 e 7.
- Ensaie a demonstração uma vez antes de gravar para ter dados no painel.
- Aproxime o zoom (Ctrl + +) em código e terminal.
