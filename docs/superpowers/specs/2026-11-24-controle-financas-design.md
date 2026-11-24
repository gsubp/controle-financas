# Controle de Finanças — design

Data: 2026-11-24 · Repositórios: `gsubp/controle-financas` (API) e `gsubp/controle-financas-frontend` (web)
Telas aprovadas: https://claude.ai/artifact/15s8x8yUzXroth3xreTW4k (Dashboard, Lançamentos, Novo lançamento)

## Intenção

Projeto pessoal para registrar receitas e despesas e enxergar o balanço do mês. Qualquer pessoa pode criar
conta; cada conta só vê e altera os próprios lançamentos. O visual segue o canvas aprovado.

## Metas (v1)

- Cadastro e login com e-mail e senha.
- Criar, editar, excluir e listar lançamentos (receita ou despesa) do usuário logado.
- Dashboard de um mês: saldo, receitas, despesas, taxa de poupança, variação contra o mês anterior,
  gráfico receitas x despesas dos últimos 6 meses, despesas por categoria, últimos 6 lançamentos.
- Lista do mês com filtros por tipo, categoria e busca na descrição.
- Navegar entre meses (‹ ›) no dashboard e na lista.

## Não-metas (v1)

Recuperação/troca de senha, confirmação de e-mail, lançamentos recorrentes ou parcelados, contas/cartões,
orçamento e metas, categorias personalizadas, importação/exportação de extrato, multi-moeda, tema escuro,
app mobile, deploy em produção (v1 roda local).

## Anti-metas (falhou mesmo que "funcione")

- Um usuário consegue ler, alterar ou apagar lançamento de outro.
- Somas que não batem no centavo.
- Segredo (`.env`, senha, JWT secret) commitado — os dois repositórios são **públicos**.
- Superengenharia: nada de filas, cache, microserviços, monorepo, libs de gráfico/formulário/estado.

## Restrições

- Backend Nest.js, frontend Next.js, repositórios separados já existentes na conta pessoal `gsubp`.
- Versionamento com git flow (AVH 1.12.3 instalado): `main` = produção, `develop` = integração.
- PostgreSQL 17 local (sem Docker na máquina). npm.
- Node **22.12.0** (já instalado via nvm), fixado em `.nvmrc` nos dois repositórios — o Node padrão da máquina
  (22.5.1) não atende Prisma 7 nem Vitest 5. *(decisão do construtor)*
- Versões fixadas (verificadas no npm em 2026-11-24): Nest 12, Prisma **7.10.1** (o `latest` do npm aponta para
  `8.0.0-rc.35`, um release candidate — instalar com versão explícita), Next 16, Vitest 5.
- Commits com o e-mail pessoal do `git config --global`.

## Abordagens consideradas (login)

| | Abordagem | Troca | Decisão |
|-|-|-|-|
| A | E-mail e senha, JWT emitido pelo Nest | Simples, sem dependência externa; precisa guardar hash de senha | **Escolhida pelo usuário** |
| B | Entrar com Google (OAuth) | Sem senha para guardar; exige credenciais no Google Cloud e mais peças entre front e back | Descartada |

## Arquitetura

```
Navegador ──► Next.js (servidor: Server Components + Server Actions) ──► API Nest (REST/JSON) ──► PostgreSQL
                 cookie httpOnly "sessao" = JWT              Authorization: Bearer <JWT>
```

O navegador nunca chama a API direto: o Next guarda o JWT em cookie httpOnly e faz as chamadas no servidor.
Isso tira o token do alcance de JavaScript na página e dispensa CORS.

## Backend — `controle-financas`

- Nest (última estável), TypeScript, npm. Porta `3333`.
- Prisma (última estável) + PostgreSQL.
- Senha: `crypto.scrypt` do Node (salt aleatório de 16 bytes por usuário, comparação com `timingSafeEqual`).
  Sem bcrypt/argon2.
- JWT: `@nestjs/jwt`, expira em 7 dias, segredo em `JWT_SECRET`. Guard global; rotas abertas marcadas com
  `@Public()`. Sem Passport.
- Validação: `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`) + `class-validator`.
- Config: `.env` (fora do git) com `DATABASE_URL`, `JWT_SECRET`, `PORT`; `.env.example` versionado.
- E-mail normalizado para minúsculas e sem espaços nas pontas antes de salvar e de buscar.

### Modelo

```prisma
model Usuario {
  id          String       @id @default(uuid())
  nome        String
  email       String       @unique
  senhaHash   String
  criadoEm    DateTime     @default(now())
  lancamentos Lancamento[]
}

enum TipoLancamento {
  RECEITA
  DESPESA
}

model Lancamento {
  id            String         @id @default(uuid())
  usuarioId     String
  usuario       Usuario        @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  tipo          TipoLancamento
  descricao     String
  categoria     String
  valorCentavos Int            // sempre > 0; o sinal vem do tipo
  data          DateTime       @db.Date
  criadoEm      DateTime       @default(now())
  atualizadoEm  DateTime       @updatedAt

  @@index([usuarioId, data])
}
```

Dinheiro é sempre inteiro em centavos, da API ao banco. Limite de validação: 1 a 2.000.000.000 centavos.

Categorias fixas (constante no código; a API rejeita categoria que não pertence ao tipo):

- RECEITA: Salário, Freelance, Investimentos, Outros
- DESPESA: Moradia, Alimentação, Transporte, Saúde, Contas, Educação, Lazer, Outros

### API

Formatos: data `YYYY-MM-DD`, mês `YYYY-MM`, valores em centavos (inteiro). Tudo exige token, exceto cadastro e login.

| Método | Rota | Entrada | Saída |
|-|-|-|-|
| POST | `/auth/cadastro` | `{nome, email, senha}` (senha ≥ 8) | 201 `{token, usuario: {id, nome, email}}` · 409 e-mail em uso |
| POST | `/auth/login` | `{email, senha}` | 200 `{token, usuario}` · 401 "E-mail ou senha inválidos" (mesma mensagem para os dois casos) |
| GET | `/auth/me` | — | `{id, nome, email}` |
| GET | `/lancamentos?mes=YYYY-MM` | `mes` obrigatório | lançamentos do mês, `data` desc, depois `criadoEm` desc |
| GET | `/lancamentos/:id` | — | lançamento · 404 se não existe **ou não é do usuário** |
| POST | `/lancamentos` | `{tipo, descricao, categoria, valorCentavos, data}` | 201 lançamento |
| PATCH | `/lancamentos/:id` | campos parciais (mesma validação; categoria checada contra o tipo final) | 200 · 404 idem |
| DELETE | `/lancamentos/:id` | — | 204 · 404 idem |
| GET | `/resumo?mes=YYYY-MM` | `mes` obrigatório | ver abaixo |

Toda consulta filtra por `usuarioId` vindo do token. Alterar/apagar usa `where: {id, usuarioId}`; nada afetado → 404.

`GET /resumo?mes=2026-11`:

```json
{
  "mes": "2026-11",
  "receitasCentavos": 1044237,
  "despesasCentavos": 595285,
  "saldoCentavos": 448952,
  "taxaPoupanca": 43.0,
  "variacao": { "receitas": 3.4, "despesas": -13.8, "saldo": 40.5 },
  "historico": [{ "mes": "2026-06", "receitasCentavos": 850000, "despesasCentavos": 612040 }],
  "porCategoria": [{ "categoria": "Moradia", "totalCentavos": 302000, "percentual": 50.7 }],
  "recentes": [{ "id": "…", "tipo": "DESPESA", "descricao": "Supermercado", "categoria": "Alimentação", "valorCentavos": 41230, "data": "2026-11-23" }]
}
```

- `taxaPoupanca` = saldo ÷ receitas × 100, 1 casa decimal; `null` se receitas = 0. Pode ser negativa.
- `variacao.x` = (atual − anterior) ÷ |anterior| × 100, 1 casa; `null` se o anterior = 0.
- `historico`: sempre 6 itens, do 5º mês anterior até o mês pedido, meses vazios com zero.
- `porCategoria`: só despesas do mês, maior total primeiro; `percentual` sobre o total de despesas.
- `recentes`: até 6, mesma ordem da lista.
- `quantidade`: número de lançamentos do mês (subtítulo do dashboard: "17 lançamentos registrados").
- Cálculo: busca os lançamentos do usuário na janela de 6 meses e agrega numa função pura `montarResumo`.
  Volume pessoal (centenas de linhas) não justifica SQL de agregação.

### Testes (backend)

- Unitário: `montarResumo` com os números do canvas (novembro fecha em 1.044.237 / 595.285 / 448.952;
  percentuais do canvas), meses vazios, receita zero, saldo anterior negativo. Hash/verificação de senha.
- E2E (supertest, banco `controle_financas_test` limpo a cada execução): cadastro → login → CRUD;
  usuário B recebe 404 ao ler/alterar/apagar lançamento de A e não o vê na lista nem no resumo;
  sem token → 401; categoria de outro tipo → 400; e-mail duplicado (inclusive com maiúsculas) → 409.

## Frontend — `controle-financas-frontend`

- Next.js (última estável, App Router), TypeScript, Tailwind CSS, ESLint — via `create-next-app`.
- Fontes Inter (texto) e Space Grotesk (títulos e números grandes) com `next/font/google`.
- Cores do canvas: fundo `#F5F6F4`, superfície `#FFFFFF`, texto `#16181D`, secundário `#5B616E`, borda `#E2E4E7`;
  receita `#2B5FD9` (barras) / `#1F4FB8` (texto) / `#E8EEFB` (chip); despesa `#D9701F` (barras) /
  `#9A3F08` (texto) / `#FBEDE3` (chip). Botão primário `#16181D`.
- Sem lib de gráfico (barras em CSS, como no canvas), sem lib de formulário ou estado global
  (Server Actions + `useActionState`).
- Sessão: cookie httpOnly `sessao` com o JWT, `sameSite=lax`, `secure` em produção, 7 dias.
  O middleware/proxy do Next manda quem não tem cookie para `/login` e quem tem cookie em `/login` ou `/cadastro`
  para `/`. Se a API responder 401 (token vencido), o servidor redireciona para a rota `/sair` (route handler),
  que apaga o cookie e manda para `/login` — Server Components não podem alterar cookies. "Sair" no cabeçalho
  usa a mesma rota.
- Chamadas à API num helper só de servidor que lê `API_URL` (padrão `http://localhost:3333`) e injeta o Bearer.
- Dinheiro: exibição com `Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'})`; o campo de valor
  aceita `1234,56`, `1.234,56` e `1234` e converte para centavos num helper com teste (Vitest).

### Telas

| Rota | Conteúdo |
|-|-|
| `/login`, `/cadastro` | Card centralizado no estilo do "Novo lançamento" (não estão no canvas; seguem a mesma linguagem). Link entre as duas. |
| `/?mes=YYYY-MM` | Dashboard do canvas. Sem `mes` → mês atual em America/Sao_Paulo. Mês sem lançamentos: zeros e um convite para criar o primeiro. |
| `/lancamentos?mes=YYYY-MM` | Lista do canvas. Filtros (tipo, categoria, busca) no navegador, sobre os lançamentos do mês já carregados. O filtro de categoria inclui "Outros" (o canvas omitiu). Excluir pede confirmação (`confirm()` nativo). |
| `/lancamentos/novo` | Formulário do canvas como página (card de 560 px centralizado). Data padrão = hoje. |
| `/lancamentos/[id]/editar` | Mesmo formulário, preenchido. |

Depois de salvar ou excluir, volta para `/lancamentos?mes=<mês da data do lançamento>`.
Cabeçalho (todas as telas logadas): marca, Dashboard / Lançamentos, seletor de mês, "Novo lançamento",
nome do usuário e "Sair".

Tela estreita: cards empilham, cabeçalho quebra linha, tabela rola na horizontal dentro do card.

## Git flow e GitHub

- Backend: ligar a pasta local ao remote (`git@github.com:gsubp/controle-financas.git`), adotar o `main` do GitHub
  (tem o README) e descartar o `master` local vazio. Frontend: enviar o `main` local (commit "first commit")
  ao GitHub, que está vazio.
- Em ambos: `git flow init` com `main`/`develop`, prefixos padrão (`feature/`, `release/`, `hotfix/`),
  tag com prefixo `v`. `develop` publicado no GitHub.
- Cada etapa é uma feature (`git flow feature start`), com commits pequenos, PR para `develop` aberto pela
  skill `abrir-pr`, revisão de código, merge (merge commit) quando os testes passam, branch apagada.
- **O construtor revisa e faz o merge dos próprios PRs e fecha o release** (envia `main` e tags) sem parar para
  aprovação — decisão do usuário. O usuário revisa no GitHub quando quiser.
- Features — backend: `setup`, `auth`, `lancamentos`, `resumo`; frontend: `setup`, `auth`, `lancamentos`, `dashboard`.
- Ao final: release `1.0.0` em cada repo → `main` com tag `v1.0.0`.
- `.gitignore` inclui `.env` e `.remember/`. Este documento entra no `develop` do backend.
- "Testes passando" = testes rodados localmente (unitários + e2e). Sem GitHub Actions na v1. *(decisão do construtor)*
- Frontend: o `README.md` atual só tem o título; é removido antes do `create-next-app` (que recusa pasta com
  arquivos) e reescrito depois.

## Ambiente local

- Bancos `controle_financas` e `controle_financas_test` no Postgres local (`localhost:5432`), com a role local já
  existente do usuário. Credenciais só no `.env` (nunca no git nem neste documento).
- README de cada repositório explica como rodar (env, migração, dev, testes).

## Deixado para quem constrói

Versões exatas (últimas estáveis na data), organização interna de pastas e componentes, texto exato das
mensagens de erro, detalhes de Tailwind, ordem dos commits dentro de cada feature.
