# controle-financas

API do Controle de Finanças: cadastro e login por e-mail e senha, lançamentos de receitas e despesas por usuário
e resumo mensal. Nest 12 + Prisma 7 + PostgreSQL. O front fica em
[controle-financas-frontend](https://github.com/gsubp/controle-financas-frontend).

Design: [docs/superpowers/specs/2026-11-24-controle-financas-design.md](docs/superpowers/specs/2026-11-24-controle-financas-design.md)

## Rodando localmente

Requisitos: Node 22.12 (`.nvmrc`) e PostgreSQL.

```bash
nvm use
npm install
cp .env.example .env        # ajuste DATABASE_URL e JWT_SECRET
cp .env.example .env.test   # DATABASE_URL apontando para o banco controle_financas_test
npx prisma migrate dev      # cria o banco e aplica as migrações
npm run start:dev           # http://localhost:3333
```

## Testes

```bash
npm test           # unitários
npm run test:e2e   # e2e contra o banco de .env.test (aplica migrações antes)
npm run lint
```

## Rotas

Valores em centavos (inteiro), datas `YYYY-MM-DD`, mês `YYYY-MM`. Tudo exige `Authorization: Bearer <token>`,
exceto cadastro e login.

| Método | Rota | Descrição |
|-|-|-|
| POST | `/auth/cadastro` | `{nome, email, senha}` → `{token, usuario}` |
| POST | `/auth/login` | `{email, senha}` → `{token, usuario}` |
| GET | `/auth/me` | usuário logado |
| GET | `/lancamentos?mes=YYYY-MM` | lançamentos do mês |
| GET | `/lancamentos/:id` | um lançamento |
| POST | `/lancamentos` | `{tipo, descricao, categoria, valorCentavos, data}` |
| PATCH | `/lancamentos/:id` | campos parciais |
| DELETE | `/lancamentos/:id` | remove |
| GET | `/resumo?mes=YYYY-MM` | balanço do mês, histórico de 6 meses e despesas por categoria |
