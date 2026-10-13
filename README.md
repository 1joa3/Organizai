# OrganizAI

App pessoal de finanças: transações, investimentos, metas e dashboard consolidado.
Arquitetura, decisões técnicas, changelog e roadmap completos em [`ARQUITETURA.md`](./ARQUITETURA.md).

## Stack

Next.js 16 (App Router) + Prisma + PostgreSQL (Supabase) + Tailwind CSS + Chart.js + Framer Motion. Ver o documento de arquitetura para justificativas e o roadmap.

## Setup

```bash
npm install
cp .env.example .env         # preencha banco, Supabase Auth e LEGACY_OWNER_EMAIL
npx prisma migrate deploy    # aplica as migrations no banco Postgres
# opcional, só em desenvolvimento:
npm run db:seed              # dados de exemplo sem dono, que vão para LEGACY_OWNER_EMAIL no 1º login
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
2. Configure as env vars do projeto: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` e `LEGACY_OWNER_EMAIL`.
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

## Autenticação e usuários

Login com e-mail e senha pelo **Supabase Auth** (cadastro aberto, confirmação de e-mail e
recuperação de senha). Todos os usuários compartilham o mesmo banco, mas cada registro
(conta, categoria, transação, investimento, meta) tem um `userId`, e **toda** consulta e
server action filtra pelo usuário logado — um usuário nunca vê os dados de outro.

- `src/proxy.ts` renova a sessão e manda quem não está logado para `/login` (checagem rápida).
- `src/lib/dal.ts` (`requireUser`) é a checagem que vale: chamada em toda página e action.
- Usuário novo começa com uma conta e as categorias padrão (`src/lib/userSetup.ts`).
- Os dados de antes do multiusuário (sem dono) passam para `LEGACY_OWNER_EMAIL` no primeiro login dele.

No painel do Supabase, em **Authentication → URL Configuration**, defina o **Site URL** com o
endereço do app e adicione `https://<seu-app>/auth/confirm` em **Redirect URLs** — é para lá
que apontam os links de confirmação e de recuperação de senha.

## Dados sensíveis

`.env` nunca deve ser commitado — já está no `.gitignore`. Use `.env.example` como referência de variáveis. As credenciais do Postgres (senha do banco) ficam só no `.env` local e nas env vars da Vercel, nunca no código.
