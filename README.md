# Livro-Caixa

App pessoal de finanças: transações, investimentos, metas e dashboard consolidado.
Arquitetura, decisões técnicas, changelog e roadmap completos em [`ARQUITETURA.md`](./ARQUITETURA.md).

## Stack

Next.js 16 (App Router) + Prisma + PostgreSQL (Supabase) + Tailwind CSS + Chart.js + Framer Motion. Ver o documento de arquitetura para justificativas e o roadmap.

## Setup

```bash
npm install
cp .env.example .env         # preencha DATABASE_URL, DIRECT_URL e AUTH_TOKEN
npx prisma migrate deploy    # aplica as migrations no banco Postgres
npm run db:seed:prod         # popula categorias + 1 conta (produção)
# ou, só em ambiente de desenvolvimento:
npm run db:seed              # popula com dados de exemplo (contas, transações, metas)
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Banco de dados

Postgres gerenciado (Supabase ou Neon). `DATABASE_URL` é a conexão **pooled** (porta `6543`,
`?pgbouncer=true`) usada em runtime; `DIRECT_URL` é a conexão **direta** (porta `5432`),
usada só por `prisma migrate`/`db push` — pgbouncer em modo transaction não suporta os
prepared statements que DDL exige. Ambas vêm prontas no botão **Connect → ORMs → Prisma**
do painel do Supabase.

## Deploy (Vercel)

1. Importe o repositório na Vercel.
2. Configure as env vars do projeto: `DATABASE_URL`, `DIRECT_URL`, `AUTH_TOKEN`.
3. Deploy. O build roda `prisma generate` automaticamente; as migrations já devem ter
   sido aplicadas antes (`prisma migrate deploy` local, ou via um passo de build separado).

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Roda o build de produção |
| `npm run lint` | ESLint |
| `npm test` | Testes (Vitest), isolados no schema `test` do mesmo Postgres |
| `npm run test:watch` | Testes em modo watch |
| `npm run db:seed` | Popula com dados de exemplo (uso em desenvolvimento) |
| `npm run db:seed:prod` | Popula só categorias + 1 conta (uso em produção) |

## Autenticação

Single-user via `AUTH_TOKEN` no `.env`. Vazio = acesso liberado (modo dev). Definido = exige login em `/login`, que seta um cookie httpOnly (`src/proxy.ts` + `src/lib/auth.ts`).

## Dados sensíveis

`.env` nunca deve ser commitado — já está no `.gitignore`. Use `.env.example` como referência de variáveis. As credenciais do Postgres (senha do banco) ficam só no `.env` local e nas env vars da Vercel, nunca no código.
