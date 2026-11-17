# 🔒 Revisão Completa — OrganizAI

Revisão de segurança e qualidade de código do aplicativo **OrganizAI**, um controle financeiro pessoal construído com Next.js 16, Prisma, Supabase Auth e PostgreSQL.

---

## Resumo Executivo

| Área | Nota |
|------|------|
| Autenticação & Sessão | ✅ Boa |
| Isolamento entre usuários | ✅ Boa |
| Validação de entrada | ✅ Boa |
| Proteção contra XSS | ✅ Boa |
| Proteção contra SQL Injection | ✅ Boa |
| Headers de segurança | ⚠️ Ausentes |
| Rate limiting na aplicação | ⚠️ Ausente |
| Cookies de preferências | ⚠️ Melhorável |
| Middleware do Next.js | 🔴 Crítico — não existe |
| Performance de queries | ⚠️ Melhorável |
| Variáveis de ambiente | ⚠️ Melhorável |
| Node.js | 🔴 Versão abaixo do mínimo |

---

## 🔴 Problemas Críticos

### 1. Middleware não existe — proteção de rotas não funciona

> [!CAUTION]
> O arquivo [`src/proxy.ts`](file:///home/joaof/organizAI/Organizai/src/proxy.ts) exporta `proxy()` e `config`, mas o **Next.js espera um arquivo `middleware.ts` na raiz do `src/`** (ou na raiz do projeto). Sem o arquivo correto, o Next.js **nunca executa** essa função.

O resultado: a "checagem otimista" que redireciona visitantes não-logados para `/login` e renova cookies de sessão **simplesmente não roda**. A aplicação depende exclusivamente do `requireUser()` dentro de cada página e server action, que felizmente existe em todos os pontos — então dados não vazam — mas:

- O usuário vê a **página piscar** (carrega o layout, depois redireciona)
- Cookies de sessão do Supabase **não são renovados** em cada request, podendo expirar prematuramente
- Rotas que retornam JSON/dados podem retornar erros em vez de redirects limpos

**Correção:** Renomear `src/proxy.ts` → `src/middleware.ts` e ajustar a exportação:

```diff
- export async function proxy(request: NextRequest) {
+ export async function middleware(request: NextRequest) {
```

### 2. Node.js v18 em uso — Next.js 16 requer ≥ 20.9.0

> [!CAUTION]
> O build falha com `You are using Node.js 18.19.1. For Next.js, Node.js version ">=20.9.0" is required.`

O [`.nvmrc`](file:///home/joaof/organizAI/Organizai/.nvmrc) provavelmente aponta para 18. Isso significa que nenhuma build de produção funciona, e o app pode ter comportamentos inesperados em dev.

**Correção:** `nvm install 22 && nvm use 22` e atualizar `.nvmrc` para `22`.

---

## ⚠️ Problemas de Segurança (Médio)

### 3. Sem headers de segurança HTTP

Não há configuração de:
- **`Content-Security-Policy`** — sem CSP, se algum XSS surgir não há camada extra de proteção
- **`X-Frame-Options`** / `frame-ancestors` — a aplicação pode ser embutida em iframe (clickjacking)
- **`Strict-Transport-Security`** (HSTS) — se hospedar fora da Vercel
- **`X-Content-Type-Options: nosniff`**
- **`Referrer-Policy`**
- **`Permissions-Policy`**

**Correção:** Adicionar em [`next.config.ts`](file:///home/joaof/organizAI/Organizai/next.config.ts):

```ts
const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      ],
    }];
  },
};
```

### 4. `siteOrigin()` confia em headers que podem ser falsificados

Em [`authActions.ts:48-54`](file:///home/joaof/organizAI/Organizai/src/lib/authActions.ts#L48-L54), quando `NEXT_PUBLIC_SITE_URL` não está definida:

```ts
const host = h.get("x-forwarded-host") ?? h.get("host");
const proto = h.get("x-forwarded-proto") ?? "https";
return `${proto}://${host}`;
```

Um atacante pode enviar `X-Forwarded-Host: evil.com` e os e-mails de confirmação/recuperação teriam links apontando para o domínio do atacante (Host Header Injection → phishing).

**Correção:** Sempre definir `NEXT_PUBLIC_SITE_URL` em produção e remover o fallback de headers, ou adicionar uma allowlist de hosts:

```ts
async function siteOrigin() {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SITE_URL é obrigatória em produção");
  return url.replace(/\/$/, "");
}
```

### 5. Sem rate limiting no nível da aplicação

O Supabase Auth tem rate limiting próprio, mas as **server actions de dados** (criar transação, importar CSV com 5000 linhas, etc.) não têm nenhum throttle. Um script pode:

- Inserir milhares de transações rapidamente
- Importar CSVs repetidamente para sobrecarregar o banco
- Chamar `addAmountToGoal` em loop para inflar metas

**Mitigação:** Implementar rate limiting via middleware (ex: [Upstash Rate Limit](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)) ou pelo menos limitar o tamanho do payload e frequência por IP/usuário.

### 6. Cookies de preferências sem flag `Secure`

Os cookies de preferências ([`theme`](file:///home/joaof/organizAI/Organizai/src/lib/theme.ts#L23), [`sidebar`](file:///home/joaof/organizAI/Organizai/src/lib/sidebar.ts#L9), [`dash_layout`](file:///home/joaof/organizAI/Organizai/src/lib/dashboardLayout.ts#L169), [`lc_period`](file:///home/joaof/organizAI/Organizai/src/lib/period.ts#L183)) são gravados via `document.cookie` com `SameSite=Lax` mas **sem `Secure`**. Em produção HTTPS isso é aceitável pois `SameSite=Lax` dá proteção razoável, mas sem `Secure` os cookies trafegam em HTTP em ambientes mistos.

**Correção:** Adicionar `; secure` em produção:

```ts
const secure = location.protocol === "https:" ? "; secure" : "";
document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax${secure}`;
```

### 7. `.env` tem `AUTH_TOKEN=""` — resquício do sistema antigo

O [`.env`](file:///home/joaof/organizAI/Organizai/.env) contém `AUTH_TOKEN=""`, que não parece ser usado em nenhum lugar do código atual (a autenticação é pelo Supabase). Se o deploy incluir essa variável, pode ser confuso. Limpe variáveis mortas.

---

## ⚠️ Problemas de Qualidade / Bugs Potenciais

### 8. Performance: `getPatrimonyEvolution` faz 36 queries

Em [`aggregations.ts:89-125`](file:///home/joaof/organizAI/Organizai/src/lib/aggregations.ts#L89-L125), o loop de 12 meses faz 3 queries por iteração = **36 queries sequenciais** para renderizar o dashboard. Com dados grandes isso pode levar vários segundos.

**Correção:** Usar uma única query com `groupBy` por mês, ou uma raw query SQL que calcula o acumulado com window functions.

### 9. Performance: `getDebtsSummary` carrega **todas** as despesas

Em [`aggregations.ts:216-219`](file:///home/joaof/organizAI/Organizai/src/lib/aggregations.ts#L216-L219):

```ts
const transactions = await prisma.transaction.findMany({
  where: { userId, type: "despesa" },
  include: { category: true },
});
```

Carrega **todas as despesas de todos os tempos** na memória para depois filtrar as parceladas. Conforme o usuário acumular anos de dados, isso ficará lento.

**Correção:** Filtrar no banco: `where: { userId, type: "despesa", installmentGroupId: { not: null } }`.

### 10. `importTransactions` é `async` dentro do `for` loop — sem batching

Em [`transacoes/actions.ts:258-281`](file:///home/joaof/organizAI/Organizai/src/app/transacoes/actions.ts#L258-L281), o `for (const row of rows)` chama `await groupIdFor()` dentro do loop. Com 5000 linhas, pode haver milhares de queries individuais para encontrar grupos de parcelas anteriores.

**Correção:** Pré-computar todos os possíveis grupos de parcelas antes do loop com uma única query.

### 11. `getTransactions` como server action retorna dados brutos do Prisma

Em [`transacoes/actions.ts:146-174`](file:///home/joaof/organizAI/Organizai/src/app/transacoes/actions.ts#L146-L174), `getTransactions` é uma server action (arquivo com `"use server"`) que retorna objetos Prisma com `Decimal`. A serialização automática funciona, mas não é ideal — seria melhor transformar `Decimal` para `number` explicitamente para evitar erros de serialização futuros.

### 12. `nova-senha/page.tsx` é `"use client"` sem verificar sessão

A página [`nova-senha/page.tsx`](file:///home/joaof/organizAI/Organizai/src/app/nova-senha/page.tsx) é um Client Component. A server action `updatePassword` valida a sessão, mas a página em si não verifica se o usuário tem uma sessão válida antes de renderizar. Sem middleware funcionando (#1), qualquer visitante vê o formulário de nova senha (embora submeter sem sessão retorne erro).

---

## ✅ O que está bem feito

### Segurança

| Aspecto | Detalhes |
|---------|----------|
| **Isolamento de dados** | Todas as queries Prisma filtram por `userId`. `updateMany`/`deleteMany` com `where: { id, userId }` previne IDOR (Insecure Direct Object Reference). ✅ |
| **Validação com Zod** | Todos os inputs de server actions são validados com schemas Zod rigorosos antes de tocar o banco. ✅ |
| **Sem SQL injection** | Prisma ORM é usado exclusivamente; nenhum `$queryRaw` ou string interpolation. ✅ |
| **Sem XSS** | React escapa tudo por padrão; nenhum `dangerouslySetInnerHTML` ou `innerHTML` em todo o código. ✅ |
| **Open redirect protegido** | `safeNext()` em [`authActions.ts:57-59`](file:///home/joaof/organizAI/Organizai/src/lib/authActions.ts#L57-L59) rejeita URLs absolutas e `//`. ✅ |
| **Enumeração de e-mails** | [`requestPasswordReset`](file:///home/joaof/organizAI/Organizai/src/lib/authActions.ts#L100-L112) retorna a mesma mensagem independente de existir a conta. ✅ |
| **`server-only`** | [`dal.ts`](file:///home/joaof/organizAI/Organizai/src/lib/dal.ts#L1) e [`supabase/server.ts`](file:///home/joaof/organizAI/Organizai/src/lib/supabase/server.ts#L1) importam `server-only` para prevenir vazamento para o bundle client. ✅ |
| **RLS no banco** | Migrations habilitam Row Level Security em todas as tabelas. ✅ |
| **`.gitignore`** | Arquivos `.env*` estão no `.gitignore` (exceto `.env.example`). ✅ |
| **Verificação de referências** | [`checkReferences()`](file:///home/joaof/organizAI/Organizai/src/app/transacoes/actions.ts#L27-L36) verifica se conta e categoria pertencem ao usuário antes de criar/editar transação. ✅ |
| **Proteção contra duplicação** | Import CSV verifica duplicatas por `date + description + amount`. ✅ |

### Qualidade de Código

| Aspecto | Detalhes |
|---------|----------|
| **Zero erros de TypeScript** | `tsc --noEmit` passa sem erros. ✅ |
| **Zero erros de ESLint** | `npx eslint src/` passa limpo. ✅ |
| **Testes unitários** | Módulos puros (`aggregations`, `validation`, `period`, `csvImport`, `installments`, etc.) têm testes com Vitest. ✅ |
| **Separação de camadas** | DAL → aggregations → server actions → client components, bem organizado. ✅ |
| **Serialização explícita** | Decimal e Date são convertidos antes de passar para client components. ✅ |
| **Documentação inline** | JSDoc em português em todas as funções relevantes. ✅ |

---

## 📋 Plano de Ação Priorizado

| Prioridade | Item | Esforço |
|:----------:|------|:-------:|
| 🔴 P0 | Renomear `proxy.ts` → `middleware.ts` | 5 min |
| 🔴 P0 | Atualizar Node.js para ≥ 20 (`.nvmrc`) | 5 min |
| ⚠️ P1 | Adicionar headers de segurança no `next.config.ts` | 15 min |
| ⚠️ P1 | Definir `NEXT_PUBLIC_SITE_URL` e remover fallback de headers | 10 min |
| ⚠️ P1 | Limpar `AUTH_TOKEN` do `.env` | 2 min |
| ⚠️ P2 | Otimizar `getPatrimonyEvolution` (36 queries → 1) | 1-2h |
| ⚠️ P2 | Otimizar `getDebtsSummary` (filtrar no banco) | 30 min |
| ⚠️ P2 | Adicionar flag `Secure` nos cookies de preferências | 15 min |
| ⚠️ P3 | Rate limiting nas server actions | 2-3h |
| ⚠️ P3 | Otimizar `importTransactions` (batching) | 1-2h |

---

> [!IMPORTANT]
> Os dois itens P0 (middleware e Node.js) devem ser resolvidos imediatamente — o middleware é fundamental para renovação de sessão e experiência do usuário, e o Node.js precisa estar na versão certa para o deploy funcionar.
