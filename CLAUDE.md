# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

API REST do Controle de Finanças (projeto pessoal): cadastro/login, lançamentos de receitas e despesas por usuário e
resumo mensal. Nest 12 (ESM) + Prisma 7.10.1 + PostgreSQL. O único cliente é o
[controle-financas-frontend](https://github.com/gsubp/controle-financas-frontend), que chama a API só pelo servidor do
Next (o tipo `Resumo`, `Lancamento` e as categorias estão duplicados em `src/lib/tipos.ts` de lá — mantenha em sincronia).
Design e plano: `docs/superpowers/specs/2026-11-24-controle-financas-design.md` e `docs/superpowers/plans/`.

## Comandos

Node **22.12** (`.nvmrc`): rode `nvm use` antes de qualquer `npm`/`npx` — o Node padrão da máquina não atende Prisma 7.

```bash
npm install                 # postinstall roda `prisma generate` (client em src/generated/prisma, fora do git)
npx prisma migrate dev      # aplica/cria migrações no banco do .env
npm run start:dev           # http://localhost:3333
npm run build && npm run lint

npm test                                          # unitários (*.spec.ts em src/)
npx vitest run src/resumo/montar-resumo.spec.ts   # um arquivo unitário
npm run test:e2e                                  # migrate deploy + e2e (*.e2e-spec.ts em test/) no banco de .env.test
ENV_FILE=.env.test npx vitest run --config ./vitest.config.e2e.ts test/auth.e2e-spec.ts   # um arquivo e2e
```

`.env` e `.env.test` são locais (repo público); modelo em `.env.example`. O `.env.test` precisa apontar para o banco
`controle_financas_test` — `test/setup-e2e.ts` aborta se não for, porque os e2e gravam dados. Os e2e não limpam o banco
(cada teste cria usuários com e-mail aleatório). `prisma migrate reset` é bloqueado pelo Prisma quando chamado por um
agente: não use; prefira `migrate dev`/`migrate deploy`.

## Arquitetura e convenções que atravessam arquivos

- **ESM com `nodenext`**: imports relativos levam `.js` (`./auth.service.js`). Cliente Prisma vem de
  `src/generated/prisma/client.js` (generator `prisma-client`, `moduleFormat = "esm"`); o schema não tem `url` — ela fica
  em `prisma.config.ts`, que carrega `process.env.ENV_FILE ?? '.env'`.
- **Env carregado tarde**: `main.ts` chama `process.loadEnvFile()` depois que os imports já rodaram. Nada pode ler
  `process.env` no topo de módulo; use fábricas (`JwtModule.registerAsync`) ou leia no construtor (`PrismaService`).
- **`configurarApp()`** (`src/configurar-app.ts`) aplica o `ValidationPipe` global com `whitelist` +
  `forbidNonWhitelisted` + `transform`, e é usado tanto por `main.ts` quanto por `criarApp()` dos e2e. Campo de DTO sem
  decorator de validação faz a requisição virar 400. DTO parcial usa `PartialType(..., { skipNullProperties: false })`
  para `null` virar 400 e não 500. Mensagens de erro ao usuário em português.
- **Auth**: `AuthGuard` é global (`APP_GUARD` registrado no `AuthModule`) — toda rota exige `Bearer` JWT (7 dias,
  payload `{ sub }`), exceto as marcadas com `@Public()`. `@UsuarioId()` entrega o id do token. Senha com `crypto.scrypt`
  em `src/auth/senha.ts` (formato `scrypt$salt$hash`). E-mail normalizado (trim + minúsculas) no DTO.
- **Isolamento por usuário**: toda consulta filtra por `usuarioId`; lançamento de outro usuário responde **404** (não 403);
  alterar/apagar usa `where: { id, usuarioId }`. Respostas são montadas por `paraResposta()` — nunca devolva o model cru.
- **Dinheiro e datas**: valores sempre inteiros em centavos (`valorCentavos`, 1 a 2.000.000.000). `data` é `@db.Date`
  gravada como meia-noite UTC; a API troca `YYYY-MM-DD` e meses `YYYY-MM`. Helpers em `src/lancamentos/mes.ts`
  (`intervaloDoMes` com fim exclusivo, `somarMeses`, `paraData`, `dataValida`); anos limitados a 1900–2099 (`MES_REGEX`).
- **Categorias fixas** por tipo em `src/lancamentos/categorias.ts`; o service recusa categoria que não pertence ao tipo
  final (inclusive no PATCH que muda só o tipo).
- **Resumo**: `GET /resumo?mes=` busca os lançamentos do usuário numa janela de 6 meses e agrega em memória na função
  pura `montarResumo` (`src/resumo/montar-resumo.ts`); percentuais com 1 casa, `null` quando a base é zero.

## Versionamento

Git flow (`main` = produção, `develop` = integração, prefixos `feature/`, `bugfix/`, `release/`, `hotfix/`, tags `v*`).
Cada mudança vai num branch do git flow com PR para `develop` (hotfix: para `main`) via `gh`, descrição em português
(O que foi feito / Por quê / Como testar). Commits em português no formato `tipo: descrição` (`feat`, `fix`, `test`,
`chore`, `docs`). Remote via SSH (`git@github.com:gsubp/...`).
