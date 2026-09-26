# Livro-Caixa

App pessoal de finanças: transações, investimentos, metas e dashboard consolidado.
Arquitetura, decisões técnicas, changelog e roadmap completos em [`ARQUITETURA.md`](./ARQUITETURA.md).

## Stack

Next.js 16 (App Router) + Prisma + SQLite (local) + Tailwind CSS + Chart.js + Framer Motion. Ver o documento de arquitetura para justificativas e o roadmap.

## Setup

```bash
npm install
cp .env.example .env      # ajuste AUTH_TOKEN se quiser habilitar login
npx prisma db push        # cria o banco local (prisma/dev.db)
npm run db:seed           # popula contas e categorias padrão
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Roda o build de produção |
| `npm run lint` | ESLint |
| `npm test` | Testes (Vitest) contra um banco SQLite isolado (`prisma/test.db`) |
| `npm run test:watch` | Testes em modo watch |
| `npm run db:seed` | Popula contas/categorias padrão |

## Autenticação

Single-user via `AUTH_TOKEN` no `.env`. Vazio = acesso liberado (modo dev). Definido = exige login em `/login`, que seta um cookie httpOnly (`src/proxy.ts` + `src/lib/auth.ts`).

## Dados sensíveis

`prisma/dev.db` contém dados financeiros reais e **nunca** deve ser commitado — está no `.gitignore`. O mesmo vale para `.env`. Use `.env.example` como referência de variáveis.
