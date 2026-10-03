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

> ⚠️ Esta seção documentava a direção original "Terminal Luxe". Em algum ponto do
> desenvolvimento (fora das sessões que geraram este documento) o app foi
> re-skinado para **"Cyber-Luxe Glassmorphism"** — os tokens abaixo refletem o
> `globals.css` real, não o plano original. Ver Changelog para o dia em que essa
> divergência foi percebida.

Direção visual: **Cyber-Luxe Glassmorphism** — fundo quase-preto, paleta neon (lima/rosa/dourado/ciano), cards em vidro fosco (`backdrop-filter: blur`) com brilho sutil nas bordas. O "memorável" é o contraste entre a densidade de dados financeiros e o acabamento neon/glow.

### Paleta

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#030303` | Fundo principal |
| `--bg-raised` | `rgba(20,20,25,0.4)` | Cards e superfícies elevadas (glass) |
| `--bg-surface` | `rgba(30,30,40,0.4)` | Inputs, tags, tooltips |
| `--border` | `rgba(255,255,255,0.08)` | Divisórias e bordas |
| `--text` | `#F8F9FA` | Texto primário |
| `--text-dim` | `#A1A1AA` | Texto secundário |
| `--text-muted` | `#52525B` | Labels terciários |
| `--emerald` | `#CCFF00` | Receita / positivo (lima elétrico) |
| `--coral` | `#FF0055` | Despesa / negativo (rosa cyber) |
| `--amber` | `#FFB800` | Metas / investimentos (dourado) |
| `--blue` | `#00E5FF` | Acento informacional (ciano) |

Esses tokens vivem em `src/app/globals.css` (`:root`) e são expostos como classes Tailwind (`text-emerald`, `bg-coral/15`, etc.) via `@theme inline`. Popups compartilham os mesmos tokens através de `src/lib/accents.ts` (ver Changelog) — nunca duplicar esses hex em outro lugar.

### Tipografia

| Papel | Família | Peso |
|---|---|---|
| Títulos de seção (`.font-display`) | Plus Jakarta Sans | 600 |
| Todos os valores numéricos (`.font-mono-value`) | JetBrains Mono | 400–600 |
| Texto de apoio, labels, nav | Inter | 400–500 |

### Princípios

- Valores monetários sempre em monospace — alinhamento visual como extrato bancário
- Cards em `glass-card`/`glass-panel` (`globals.css`): blur + borda translúcida + box-shadow suave, border-radius 8–12px
- Glow via `drop-shadow`/`box-shadow` colorido nos tokens acima, não gradientes genéricos
- Animações com staggered delay no page load (fade-up) e barras de progresso com intersection observer
- Grid de pontos sutil no background (radial-gradient) — textura sem poluir
- Modo claro como futura iteração (ver Sugestões)

---

## Roadmap MVP

| Fase | Escopo | Entregável | Status |
|---|---|---|---|
| 1 | Setup | Projeto Next.js + Prisma + banco no Supabase, seed de categorias | ✅ |
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
- **Repositório publicado:** commit `abc4881` enviado para `https://github.com/1joa3/Organizai` (remote `origin`, branch `master`). `.env`/`prisma/*.db` confirmados fora do histórico antes do push.

### Sessão seguinte — Descoberta do UI drift, gráfico de dívidas e polimento de popups/ícones

- **Descoberta:** entre a auditoria acima e esta sessão, alguém (fora destas sessões) re-skinou o app inteiro de "Terminal Luxe" para **"Cyber-Luxe Glassmorphism"** (`globals.css`, `Toast.tsx`, `ConfirmDialog.tsx` já criados com essa paleta). A seção Design System deste doc foi corrigida para refletir a realidade — ver acima.
- **UX — Receita não estava visível:** o campo "Tipo" no modal de Nova Transação era um `<select>` escondido, sempre iniciando em "Despesa". Trocado por um toggle visível **− Despesa / + Receita** no topo do formulário; a lista de Categoria agora filtra pelo tipo escolhido (antes misturava categorias de receita e despesa no mesmo dropdown). Um resquício do emoji antigo (`${c.icon} ${c.name}`) sobrou nesse mesmo `<select>` de categoria e foi removido depois, num segundo ajuste.
- **Novo: gráfico "Quitação de Dívidas" no dashboard** — `getDebtsSummary()` em `aggregations.ts` soma o saldo restante de todas as despesas parceladas (`(i/n)` na descrição) a partir do mês atual, projeta a curva de saldo devedor mês a mês até zerar, e informa a data prevista de quitação. Renderizado via `DebtPayoffChart.tsx` (barras) em card full-width no dashboard, com dados reais das parcelas já cadastradas (cada parcela já é uma transação futura no banco).
- **Popups redesenhados** (skill `frontend-design` usada aqui): `Modal.tsx` estava genérico e destoava do `Toast`/`ConfirmDialog` (que já tinham a estética Cyber-Luxe). Agora os três compartilham a mesma linguagem — linha de destaque colorida no topo + etiqueta monoespaçada de contexto (`TRANSAÇÃO`, `INVESTIMENTO`, `META`, `APORTE`) — via tokens centralizados em `src/lib/accents.ts` (elimina hex duplicados que existiam em `Toast`/`ConfirmDialog`). Removido também um glow pulsante puramente decorativo do `ConfirmDialog`.
- **Ícones de categoria:** os emojis (`🏠🍔🚗...`) renderizavam de forma inconsistente entre plataformas e destoavam do resto da UI (toda vetorial). Criado `CategoryIcon.tsx` — 12 ícones de linha (mesmo peso de traço dos ícones da sidebar), mapeados por nome de categoria, tingidos pela cor da categoria. Substituído em: tabela de Transações, lista "Recentes" do dashboard, legenda do donut de categorias e o dropdown de categoria do formulário.
- **Skills instaladas** (globalmente em `~/.claude/skills/`, não fazem parte do repo): `security-auditor`, `frontend-design`, `tdd-orchestrator` — vieram do pacote npm `antigravity-awesome-skills`, mas foram copiadas manualmente (não via `npx ... install <nome>`, que ignora o nome da skill e instalaria as ~1935 skills do pacote inteiro). Conteúdo revisado antes de instalar — arquivos de instrução markdown, sem nada suspeito.
- **Responsividade mobile:** grids rígidos de 2 colunas nos modais agora empilham abaixo de `sm`; headers de Investimentos/Metas, `KpiStrip` e `PeriodSelector` ajustados para telas pequenas.
- **Layout de cards no mobile:** `Table.tsx` ganhou `renderMobileItem` opcional — abaixo de `md` mostra uma lista de cards em vez da tabela com scroll horizontal. Usado em Transações.
- **Criar categoria inline:** `createCategory` em `actions.ts` + mini-formulário (nome + cor) dentro do próprio modal de Nova Transação, sem precisar de uma tela separada de categorias.
- **Deploy — banco migrado para Postgres (Supabase):** `schema.prisma` passou de `sqlite` para `postgresql` com `directUrl` (conexão direta, só para migrations — a `url` normal usa o pooler/pgbouncer). Migration inicial aplicada em produção. `prisma/seed-production.ts` criado (categorias + 1 conta, sem os dados de exemplo do `seed.ts` de dev). Testes passaram a rodar isolados no schema `test` do mesmo Postgres (não o `public`) via `DIRECT_URL` com `?schema=test` — zero infraestrutura extra.
- **Deploy — `AUTH_TOKEN` definido:** gerado um token aleatório de 32 bytes para proteger o acesso antes de publicar.
- **Editar transação (incluindo categoria):** `updateTransaction` já existia em `actions.ts` sem nenhuma UI que o chamasse. Adicionado botão de editar (lápis) em cada linha/card, reaproveitando o modal de Nova Transação em modo edição (campo Parcelas some, pois editar não re-divide em novas parcelas).
- **Correção de segurança:** `next` tinha uma vulnerabilidade crítica de RCE (GHSA-vcvr-r3jv-pc5j, `next/og ImageResponse`) nas versões 16.2.0–16.3.5 — descoberta via `npm audit` ao instalar uma dependência nova, corrigida atualizando para `16.3.8`.
- **Importar fatura/extrato (CSV):** novo botão "Importar Fatura" em Transações abre um fluxo de upload → mapeamento de colunas (Data/Descrição/Valor, com auto-detecção pelo nome do header) → pré-visualização → confirmação. Parser de CSV próprio em `src/lib/csvImport.ts` (sem dependência externa — a lib óbvia, `xlsx`/SheetJS, tinha 2 CVEs high sem correção no npm no momento). Detecta `,`/`;` como delimitador, formatos de data BR/ISO e valor BR (`1.234,56`)/internacional, e deduplica contra transações já existentes (mesma conta+data+descrição+valor) para permitir reimportar o mesmo arquivo sem duplicar. Suporte a `.xlsx` binário real ficou de fora (débito técnico abaixo); PDF de fatura fica para uma próxima sessão, mediante exemplo do layout.
- **Detecção automática de parcelamento no import:** faturas costumam listar só a parcela do mês corrente (ex: "Loja - Parcela 2/6"). `expandInstallmentRow()` reconhece esse padrão (e o formato interno `(2/6)`) e gera as parcelas futuras (3/6 até 6/6, uma por mês, mesmo valor) automaticamente — as passadas (1/6) não são recriadas, já que são histórico e não afetam o saldo devedor projetado. Resultado entra no mesmo formato usado por `getDebtsSummary`/exclusão em grupo, então o gráfico de dívidas e o "excluir todas as parcelas" funcionam igual a uma parcelada criada manualmente. Checkbox na UI permite desligar se não for desejado.
- **Bug de dados real corrigido:** uma compra parcelada criada manualmente (25 parcelas de R$4.000, "Airbnb... Parcela 2/6") teve a parcela 1 excluída, mas as outras 24 continuaram no banco e seguiam contando nos gráficos — cada parcela é uma transação independente, excluir uma não sabia que fazia parte de um grupo. Limpeza manual feita em produção + `deleteTransactionGroup` em `actions.ts` (botão "Excluir todas as N parcelas" no `ConfirmDialog`, que ganhou um terceiro botão opcional) resolve isso daqui para frente.
- **Categoria por linha no import:** a pré-visualização do import agora tem um `<select>` de categoria em cada linha (inicializado com a "Categoria padrão", mas editável individualmente antes de confirmar). `importTransactions` deixou de receber um `categoryId` único para o lote inteiro — cada linha enviada já carrega a sua. A pré-visualização também passou a mostrar todas as linhas (antes cortava em 12) para dar acesso a todas no editor por linha.
- **Entrada manual no import (sem CSV):** o `ImportModal` ganhou um toggle "Importar arquivo CSV" / "Adicionar uma a uma" — no modo manual, um mini-formulário (Descrição + Valor + Data) com botão "+ Adicionar" empilha despesas uma a uma num estado local (`manualEntries`), que alimenta a mesma pipeline de pré-visualização/detecção de parcelamento/categoria por linha/importação já usada pelo CSV. Cada linha manual tem um botão de remover antes de confirmar. Pensado para quem está lendo uma fatura em PDF (ainda não suportado) e digitando os itens à mão.
- **Período persistente entre abas:** `PeriodSelector` grava o mês/ano escolhido num cookie (`lc_period`, 1 ano de validade) além de atualizar a query string. Dashboard e Transações usam esse cookie como fallback quando não há `?month=&year=` na URL — antes, navegar entre as abas pela sidebar (links sem query string) sempre voltava pro mês atual, mesmo depois de escolher outro mês.
- **Seleção múltipla de transações:** checkbox em cada linha/card (+ "selecionar todas" no cabeçalho da tabela). Com algo selecionado, aparece uma barra de ações: excluir todas as selecionadas de uma vez (`deleteTransactions`), ou mudar a categoria de todas de uma vez (`updateTransactionsCategory`) — essa segunda opção só habilita quando a seleção é toda do mesmo tipo (despesa ou receita), já que categoria é vinculada ao tipo. `Table.tsx`: `label` de coluna passou de `string` para `ReactNode` para caber o checkbox no cabeçalho.

---

## Débitos técnicos conhecidos

| Item | Descrição | Risco |
|---|---|---|
| Sem CI | Não há GitHub Actions/pipeline rodando `tsc`, `lint` e `vitest` automaticamente a cada push | Médio |
| Categorias/contas fixas no seed | `installments` e parcelamento assumem 1 transação por parcela/mês; edição de uma transação parcelada não recalcula as demais parcelas | Baixo/médio |
| Testes dependem de rede | A suíte roda contra o Postgres do Supabase (schema `test`), então precisa de internet e fica mais lenta (~40s) que um SQLite local. Sem isso, não tem como testar sem infraestrutura extra (Docker, etc.) | Baixo |
| Import de fatura só lê CSV | `.xlsx` binário real (não CSV com extensão trocada) não é suportado — evitamos a lib `xlsx`/SheetJS por 2 CVEs high sem correção no npm. Dá pra adicionar `exceljs` (sem esses CVEs) se um arquivo `.xlsx` de verdade for necessário | Baixo |
| Import de fatura sem leitura de PDF | Fatura em PDF precisa ser convertida pro banco exportar CSV antes, ou aguardar uma próxima sessão com um exemplo real de layout pra calibrar o parser | Baixo |
| `npm audit` com 3 high restantes | `deepmerge-ts` (via `@prisma/config`, cadeia de dependência do CLI do Prisma, não do runtime) tem um DoS por stack exhaustion; correção automática baixaria o Prisma pra uma versão antiga. Risco baixo (ferramenta de dev, não exposta publicamente) | Baixo |

---

## Sugestões de próximas melhorias

Por ordem sugerida de valor/esforço:

1. **CI básico (GitHub Actions)** — workflow rodando `npm run build`, `npx tsc --noEmit` e `npm test` a cada push/PR. Baixo esforço, alto valor para não regredir o que foi corrigido nesta sessão.
2. **Edição de transações parceladas** — hoje só a criação gera as N parcelas; `updateTransaction` não sabe que uma transação faz parte de um grupo. Vale um `installmentGroupId` no schema para editar/excluir o grupo inteiro.
3. **Editar investimentos com histórico** — `Investment.currentAmount` é sobrescrito a cada atualização, perdendo a evolução histórica do ativo. Um model `InvestmentSnapshot` (data + valor) daria uma curva de evolução por ativo, não só o patrimônio total.
4. **Modo claro** (Fase 6, pendente) — os tokens CSS já estão centralizados em `globals.css`, então é majoritariamente definir a paleta clara e um toggle persistido em cookie/localStorage.
5. **PWA mobile** (Fase 6, pendente) — `manifest.json` + service worker básico (cache do shell) via `next-pwa` ou manual.
6. **Exportar mais do que transações** — o CSV cobre só `/transacoes`; investimentos e metas também se beneficiariam de export para backup/planilha.
7. **Testes de componentes** — a stack prevê Testing Library além do Vitest; hoje só há testes de lógica pura (`lib/`). Cobrir `TransactionsClient` (criação, exclusão, filtro) e `PeriodSelector` traria confiança na camada de UI.
8. **Rate limiting / lockout no login** — o form de login atual aceita tentativas ilimitadas de token; um limite simples por IP/cookie evita força bruta caso a app fique pública.
9. **Editar/excluir categorias e contas** — hoje só dá para criar; renomear cor/nome ou remover uma categoria sem uso precisa ser feito direto no banco.
