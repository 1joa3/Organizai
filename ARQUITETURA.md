# Livro-Caixa — Arquitetura e Plano Técnico

App de finanças pessoais. Controle de receitas/despesas por categoria, investimentos com evolução patrimonial, metas financeiras e dashboard consolidado.

---

## Stack

Projeto pessoal rodando em stack única — sem backend separado.

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** com TypeScript | Server Components + Server Actions = frontend e backend no mesmo projeto, sem precisar manter API separada |
| ORM | **Prisma** | Migrations declarativas, tipagem automática, boa DX |
| Banco | **PostgreSQL** via Supabase (ou Neon) | Free tier generoso, Postgres gerenciado, painel visual incluso |
| Estilo | **Tailwind CSS** + CSS custom properties | Tokens de design centralizados em variáveis CSS; Tailwind pra produtividade |
| Gráficos | **Chart.js** (via react-chartjs-2) | Leve, customizável, bom pra donut + line — sem peso extra de libs maiores |
| Animação | **Framer Motion** | Staggered reveals no dashboard, transições entre views, micro-interações |
| Auth | **Variável de ambiente** (single-user) | Sem necessidade de multi-tenant; um middleware simples com token fixo basta |
| Deploy | **Vercel** (app) + Supabase (banco) | Zero config pra Next.js, SSL grátis, preview deploys |
| Testes | **Vitest** + Testing Library | Testes unitários nos cálculos financeiros e nos componentes de UI |

### Por que não FastAPI + Next.js separado?

A stack dual funciona bem pros projetos de trabalho (NFe, conferência fiscal) onde o backend Python faz sentido por si só. Aqui, toda a lógica é CRUD simples + agregações — Server Actions do Next.js cobrem isso sem precisar de deploy separado, segundo servidor, e duas linguagens.

---

## Arquitetura

```
┌─────────────────────────────────────────────────┐
│                    Vercel                        │
│                                                  │
│  Next.js App Router                              │
│  ┌────────────┐  ┌──────────────────────────┐   │
│  │ Pages/UI   │──│ Server Actions / API Routes│   │
│  │ (React)    │  │ (validação, lógica)       │   │
│  └────────────┘  └────────────┬─────────────┘   │
│                               │                  │
│                         Prisma Client            │
└───────────────────────────────┼──────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   PostgreSQL           │
                    │   (Supabase / Neon)    │
                    └───────────────────────┘
```

O fluxo é direto: componentes React chamam Server Actions que usam Prisma Client pra ler/escrever no Postgres. Sem camadas intermediárias, sem REST, sem serialização manual.

---

## Modelo de dados

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Account {
  id           String        @id @default(cuid())
  name         String                            // "Nubank", "Carteira", "Bradesco"
  type         String                            // corrente | poupança | carteira
  transactions Transaction[]
  createdAt    DateTime      @default(now())
}

model Category {
  id           String        @id @default(cuid())
  name         String                            // "Moradia", "Alimentação"
  type         String                            // receita | despesa
  color        String                            // hex: "#F87171"
  icon         String?                           // emoji ou ícone opcional
  transactions Transaction[]
}

model Transaction {
  id          String   @id @default(cuid())
  description String
  amount      Decimal  @db.Decimal(12, 2)
  type        String                              // receita | despesa
  date        DateTime
  accountId   String
  account     Account  @relation(fields: [accountId], references: [id])
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  createdAt   DateTime @default(now())

  @@index([date])
  @@index([type])
}

model Investment {
  id             String   @id @default(cuid())
  asset          String                           // "Tesouro Selic 2029", "IVVB11"
  assetType      String                           // renda_fixa | renda_variavel | cripto | fundo
  investedAmount Decimal  @db.Decimal(12, 2)
  currentAmount  Decimal  @db.Decimal(12, 2)
  date           DateTime
  notes          String?
  createdAt      DateTime @default(now())

  @@index([date])
}

model Goal {
  id            String    @id @default(cuid())
  name          String                            // "Reserva de emergência"
  targetAmount  Decimal   @db.Decimal(12, 2)
  currentAmount Decimal   @db.Decimal(12, 2)
  deadline      DateTime?
  color         String    @default("#FBBF24")
  createdAt     DateTime  @default(now())
}
```

---

## Estrutura de pastas

```
livro-caixa/
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts                        # dados iniciais (categorias padrão)
├─ src/
│  ├─ proxy.ts                        # auth no boundary de rede (ex-middleware.ts, Next 16+)
│  ├─ app/
│  │  ├─ layout.tsx                   # shell global (nav, fonte, tema)
│  │  ├─ page.tsx                     # dashboard
│  │  ├─ DashboardClient.tsx
│  │  ├─ login/
│  │  │  ├─ page.tsx
│  │  │  ├─ LoginForm.tsx
│  │  │  └─ actions.ts               # valida AUTH_TOKEN, seta cookie httpOnly
│  │  ├─ transacoes/
│  │  │  ├─ page.tsx                  # listagem filtrável por mês/ano (searchParams)
│  │  │  ├─ TransactionsClient.tsx
│  │  │  └─ actions.ts               # create, update, delete
│  │  ├─ investimentos/
│  │  │  ├─ page.tsx
│  │  │  └─ actions.ts
│  │  └─ metas/
│  │     ├─ page.tsx
│  │     └─ actions.ts
│  ├─ components/
│  │  ├─ dashboard/
│  │  │  ├─ KpiStrip.tsx
│  │  │  ├─ HeroSaldo.tsx
│  │  │  └─ RecentTransactions.tsx
│  │  ├─ charts/
│  │  │  ├─ DonutCategories.tsx
│  │  │  ├─ LinePatrimony.tsx
│  │  │  └─ GoalProgressBar.tsx
│  │  └─ ui/
│  │     ├─ Button.tsx
│  │     ├─ Input.tsx
│  │     ├─ Modal.tsx
│  │     ├─ Table.tsx
│  │     └─ PeriodSelector.tsx        # seletor de mês/ano via query string
│  ├─ lib/
│  │  ├─ prisma.ts                    # singleton do Prisma Client
│  │  ├─ auth.ts                      # lógica de auth por token fixo (consumida pelo proxy.ts)
│  │  ├─ formatters.ts               # formatCurrency, formatDate
│  │  ├─ aggregations.ts             # queries de dashboard (totais, agrupamentos)
│  │  └─ csv.ts                      # export de transações para CSV
│  └─ styles/
│     └─ globals.css                  # tokens CSS + Tailwind
├─ public/
├─ .env.example
├─ vitest.config.ts
├─ vitest.global-setup.ts
├─ package.json
├─ tailwind.config.ts
└─ tsconfig.json
```

---

## Design System

Direção visual: **Terminal Luxe** — a densidade funcional de um terminal financeiro com refinamento tipográfico e espaço respirável. O "memorável" é a tipografia monospace como protagonista de todos os dados numéricos.

### Paleta

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#0C0F14` | Fundo principal |
| `--bg-raised` | `#13161D` | Cards e superfícies elevadas |
| `--bg-surface` | `#1A1E27` | Inputs, tags, tooltips |
| `--border` | `#252A35` | Divisórias e bordas |
| `--text` | `#E8E6E1` | Texto primário |
| `--text-dim` | `#6B7280` | Texto secundário |
| `--text-muted` | `#3D4451` | Labels terciários |
| `--emerald` | `#34D399` | Receita / positivo |
| `--coral` | `#F87171` | Despesa / negativo |
| `--amber` | `#FBBF24` | Metas / investimentos |
| `--blue` | `#60A5FA` | Acento informacional |

### Tipografia

| Papel | Família | Peso |
|---|---|---|
| Títulos de seção | Instrument Serif (italic) | 400 |
| Todos os valores numéricos | JetBrains Mono | 300–600 |
| Texto de apoio, labels, nav | Outfit | 300–500 |

### Princípios

- Valores monetários sempre em monospace — alinhamento visual como extrato bancário
- Sem border-radius exagerado — máximo 4px
- Sem box-shadow — hierarquia por bordas finas e cor de fundo
- Animações com staggered delay no page load (fade-up) e barras de progresso com intersection observer
- Grid de pontos sutil no background (radial-gradient) — textura sem poluir
- Fundo escuro por padrão; modo claro como futura iteração

---

## Roadmap MVP

| Fase | Escopo | Entregável | Status |
|---|---|---|---|
| 1 | Setup | Projeto Next.js + Prisma + banco no Supabase, seed de categorias | ✅ (banco local em SQLite; Supabase/Postgres ainda não provisionado — ver Débitos técnicos) |
| 2 | Transações | CRUD completo com filtro por mês/categoria, tabela com sort | ✅ |
| 3 | Investimentos | Registro de ativos + aportes, cálculo de evolução vs aportado | ✅ (reconectado ao dashboard em 2026-09-26, ver Changelog) |
| 4 | Metas | Cadastro com valor alvo + prazo, progresso automático | ✅ |
| 5 | Dashboard | Agregação dos dados, gráficos, KPIs — a tela do protótipo | ✅ |
| 6 | Refino | Filtros globais por período, export CSV, modo claro, PWA mobile | 🟡 parcial — filtro de período e export CSV entregues; modo claro e PWA pendentes |

---

## Changelog

### 2026-09-26 — Auditoria e correções complementares

- **Fix:** `Investment` estava com a integração comentada em `aggregations.ts`, `KpiStrip` e `DashboardClient` — o dashboard exibia patrimônio investido sempre como zero. Reconectado: KPIs de "Patrimônio Investido" e "Retorno" voltaram, e `getPatrimonyEvolution` agora soma o `currentAmount` real dos investimentos por mês.
- **Segurança:** o Next.js 16 renomeou a convenção `middleware.ts` para `proxy.ts` (breaking change). `src/lib/auth.ts` existia mas nunca foi conectado — criado `src/proxy.ts` + página `/login` com Server Action que autentica contra `AUTH_TOKEN` e seta cookie httpOnly. Sem `AUTH_TOKEN` definido, o acesso segue liberado (modo dev).
- **Testes:** adicionado Vitest, conforme previsto na stack original mas nunca configurado. Banco de teste SQLite isolado (`prisma/test.db`, criado via `globalSetup`, gitignored). 25 testes cobrindo `formatters`, `aggregations` (totais mensais, agrupamento por categoria, parcelamentos, retorno de investimentos) e `csv`.
- **Fase 6 — Filtro de período:** componente `PeriodSelector` (mês/ano via query string) plugado em `/` e `/transacoes`, substituindo o "mês atual" fixo.
- **Fase 6 — Export CSV:** botão em Transações exporta a listagem filtrada (`src/lib/csv.ts`).
- **Dados sensíveis:** `prisma/dev.db` (dados financeiros reais) não estava no `.gitignore` — corrigido antes do primeiro commit real do projeto.

---

## Débitos técnicos conhecidos

| Item | Descrição | Risco |
|---|---|---|
| Banco em SQLite | `schema.prisma` usa `provider = "sqlite"`, divergindo do Postgres/Supabase planejado originalmente. Funciona bem local, mas não roda em serverless (Vercel) sem migrar para Postgres antes do deploy | Alto — bloqueia deploy |
| `AUTH_TOKEN` vazio | Auth está desabilitada por padrão em dev. Antes de expor a app publicamente, definir um token forte em produção | Alto se for para produção |
| Sem CI | Não há GitHub Actions/pipeline rodando `tsc`, `lint` e `vitest` automaticamente a cada push | Médio |
| Categorias/contas fixas no seed | `installments` e parcelamento assumem 1 transação por parcela/mês; edição de uma transação parcelada não recalcula as demais parcelas | Baixo/médio |

---

## Sugestões de próximas melhorias

Por ordem sugerida de valor/esforço:

1. **Migrar para Postgres antes do deploy** — trocar `provider = "sqlite"` por `"postgresql"` no schema, provisionar Supabase/Neon, e rodar `prisma migrate` em vez de `db push`. Pré-requisito para publicar no Vercel.
2. **CI básico (GitHub Actions)** — workflow rodando `npm run build`, `npx tsc --noEmit` e `npm test` a cada push/PR. Baixo esforço, alto valor para não regredir o que foi corrigido nesta sessão.
3. **Edição de transações parceladas** — hoje só a criação gera as N parcelas; `updateTransaction` não sabe que uma transação faz parte de um grupo. Vale um `installmentGroupId` no schema para editar/excluir o grupo inteiro.
4. **Editar investimentos com histórico** — `Investment.currentAmount` é sobrescrito a cada atualização, perdendo a evolução histórica do ativo. Um model `InvestmentSnapshot` (data + valor) daria uma curva de evolução por ativo, não só o patrimônio total.
5. **Modo claro** (Fase 6, pendente) — os tokens CSS já estão centralizados em `globals.css`, então é majoritariamente definir a paleta clara e um toggle persistido em cookie/localStorage.
6. **PWA mobile** (Fase 6, pendente) — `manifest.json` + service worker básico (cache do shell) via `next-pwa` ou manual.
7. **Exportar mais do que transações** — o CSV cobre só `/transacoes`; investimentos e metas também se beneficiariam de export para backup/planilha.
8. **Testes de componentes** — a stack prevê Testing Library além do Vitest; hoje só há testes de lógica pura (`lib/`). Cobrir `TransactionsClient` (criação, exclusão, filtro) e `PeriodSelector` traria confiança na camada de UI.
9. **Rate limiting / lockout no login** — o form de login atual aceita tentativas ilimitadas de token; um limite simples por IP/cookie evita força bruta caso a app fique pública.
