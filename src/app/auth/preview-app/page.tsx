/* eslint-disable */
"use client";
// Página só para desenvolvimento: as telas do app com dados de exemplo.
// Não vai para o commit.
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ClientLayout from "@/components/ui/ClientLayout";
import DashboardClient from "@/app/DashboardClient";
import TransactionsClient from "@/app/transacoes/TransactionsClient";
import GoalsClient from "@/app/metas/GoalsClient";
import ProfileClient from "@/app/perfil/ProfileClient";
import { summarizeByCategory, buildMonthlyTrend } from "@/lib/categoryBreakdown";
import { buildPace, buildInsights } from "@/lib/dashboardStory";
import { buildBudgets } from "@/lib/budget";
import { goalPlan, compareGoals } from "@/lib/goalPlan";
import { defaultLayout } from "@/lib/dashboardLayout";

const today = new Date(2026, 10, 13);
const cats = [
  { id: "a", name: "Alimentação", color: "#F87171", type: "despesa", monthlyBudget: 1200 },
  { id: "b", name: "Lazer", color: "#A78BFA", type: "despesa", monthlyBudget: 300 },
  { id: "c", name: "Moradia", color: "#60A5FA", type: "despesa", monthlyBudget: 2000 },
  { id: "d", name: "Transporte", color: "#34D399", type: "despesa", monthlyBudget: 400 },
  { id: "e", name: "Saúde", color: "#FBBF24", type: "despesa", monthlyBudget: null },
  { id: "x0", name: "Academia", color: "#F472B6", type: "despesa", monthlyBudget: null }, { id: "x1", name: "Assinaturas", color: "#22D3EE", type: "despesa", monthlyBudget: null }, { id: "x2", name: "Educação", color: "#FB923C", type: "despesa", monthlyBudget: null }, { id: "x3", name: "Pets", color: "#A3E635", type: "despesa", monthlyBudget: null }, { id: "x4", name: "Presentes", color: "#94A3B8", type: "despesa", monthlyBudget: null }, { id: "x5", name: "Viagem", color: "#60A5FA", type: "despesa", monthlyBudget: null }, { id: "x6", name: "Mercado", color: "#34D399", type: "despesa", monthlyBudget: null }, { id: "x7", name: "Restaurantes", color: "#F87171", type: "despesa", monthlyBudget: null }, { id: "x8", name: "Farmácia", color: "#FBBF24", type: "despesa", monthlyBudget: null }, { id: "x9", name: "Vestuário", color: "#A78BFA", type: "despesa", monthlyBudget: null }, { id: "x10", name: "Impostos", color: "#94A3B8", type: "despesa", monthlyBudget: null }, { id: "x11", name: "Beleza", color: "#F472B6", type: "despesa", monthlyBudget: null }, 
  { id: "s", name: "Salário", color: "#34D399", type: "receita", monthlyBudget: null },
];
const accounts = [{ id: "n", name: "Nubank", type: "corrente" }, { id: "i", name: "Inter", type: "corrente" }];
const raw: [string, number, string, number, number][] = [
  ["Aluguel", 1500, "c", 10, 5], ["Mercado Extra", 412.9, "a", 10, 3], ["Uber", 38.5, "d", 10, 4], ["Cinema", 64, "b", 10, 8],
  ["Farmácia", 120, "e", 10, 9], ["iFood", 89.9, "a", 10, 9], ["Show (2/4)", 180, "b", 10, 10], ["Gasolina", 210, "d", 10, 11],
  ["Padaria", 32.4, "a", 10, 12], ["Bar", 145.5, "b", 10, 12], ["Notebook (3/10)", 420, "e", 10, 20], ["Internet", 119.9, "c", 10, 15],
  ["Aluguel", 1500, "c", 9, 5], ["Mercado", 980, "a", 9, 8], ["Uber", 160, "d", 9, 14], ["Lazer", 210, "b", 9, 20], ["Farmácia", 60, "e", 9, 22], ["Contas", 400, "c", 9, 25],
];
const cat = (id: string) => cats.find((c) => c.id === id)!;
const tx = raw.map(([description, amount, cid, m, d], i) => ({
  id: "t" + i, userId: "u", description, amount, type: "despesa", date: new Date(2026, m, d, 12), accountId: "n", categoryId: cid,
  category: { name: cat(cid).name, color: cat(cid).color, icon: null }, account: { name: "Nubank" },
  createdAt: new Date(), installmentGroupId: null, installmentNumber: null, installmentTotal: null,
}));
const income = { ...tx[0], id: "inc", description: "Salário", amount: 8500, type: "receita", date: new Date(2026, 10, 5, 12), categoryId: "s", category: { name: "Salário", color: "#34D399", icon: null } };
const range = { start: new Date(2026, 10, 1), end: new Date(2026, 11, 1) };
const prev = { start: new Date(2026, 9, 1), end: new Date(2026, 10, 1) };
const cur = tx.filter((t) => t.date >= range.start), before = tx.filter((t) => t.date < range.start);
const despesas = cur.reduce((s, t) => s + t.amount, 0);
const pace = buildPace(cur as any, before as any, range, prev, today);
const rows = summarizeByCategory(cur as any, before as any);
const spent = Object.fromEntries(rows.map((r) => [r.categoryId, r.total]));
const budgetCats = cats.filter((c) => c.type === "despesa").map(({ id, name, color, monthlyBudget }) => ({ id, name, color, monthlyBudget }));
const budgets = buildBudgets(budgetCats, spent, range, pace);
const goals = [
  { id: "g1", userId: "u", name: "Reserva de emergência", targetAmount: 20000, currentAmount: 12400, deadline: new Date(2027, 5, 30), color: "#60A5FA", createdAt: new Date(2026, 0, 10) },
  { id: "g2", userId: "u", name: "Viagem para o Chile", targetAmount: 8000, currentAmount: 1500, deadline: new Date(2027, 1, 15), color: "#F87171", createdAt: new Date(2026, 5, 1) },
  { id: "g3", userId: "u", name: "Notebook novo", targetAmount: 6000, currentAmount: 6000, deadline: null, color: "#34D399", createdAt: new Date(2026, 2, 1) },
];
const insights = buildInsights({ current: cur as any, previous: before as any, range, previousRange: prev, pace, receitas: 8500, despesas, previousName: "outubro",
  installments: [{ name: "Show", currentInstallment: 2, totalInstallments: 4 }], goals: goals.map((g) => ({ name: g.name, currentAmount: g.currentAmount, targetAmount: g.targetAmount })), budgets });
const trend = buildMonthlyTrend(tx as any, new Date(2026, 10, 30), 6);
const ser = (t: any) => ({ ...t, date: t.date.toISOString(), createdAt: t.createdAt.toISOString() });

const SAMPLE_PHOTO = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6b26b"/><stop offset="1" stop-color="#c2683c"/></linearGradient></defs><rect width="64" height="64" fill="#2b3a55"/><circle cx="32" cy="26" r="12" fill="url(#g)"/><path d="M10 64c2-14 12-22 22-22s20 8 22 22z" fill="url(#g)"/></svg>');

function Screen() {
  const params = useSearchParams();
  const s = params.get("s") ?? "dashboard";
  const photo = params.get("foto") ? SAMPLE_PHOTO : null;
  let page: React.ReactNode;
  if (s === "transacoes") page = <TransactionsClient transactions={[income, ...cur].sort((a, b) => +b.date - +a.date).map(ser)} accounts={accounts as any} categories={cats as any} period="2026-11" />;
  else if (s === "metas") page = <GoalsClient items={goals.map((g) => ({ goal: { ...g, deadline: g.deadline?.toISOString() ?? null, createdAt: g.createdAt.toISOString() } as any, plan: goalPlan(g, today), deadline: g.deadline })).sort(compareGoals as any).map(({ goal, plan }) => ({ goal, plan }))} />;
  else if (s === "perfil") page = <ProfileClient name="João Ferreira" email="joao@example.com" avatarUrl={photo} createdAt={new Date(2026, 9, 2).toISOString()} />;
  else page = (
    <DashboardClient
      monthlyTotals={{ receitas: 8500, despesas, saldo: 8500 - despesas }} previousTotals={{ receitas: 8000, despesas: 3310, saldo: 4690 }}
      pace={pace} insights={insights} previousName="outubro" rangeStart="2026-11-01" firstName="João"
      budget={{ summary: budgets, categories: budgetCats, spentByCategory: spent, periodWord: "mês" }}
      categoryReport={{ total: despesas, previousTotal: 3310, categories: rows, trend: { months: trend.months.map((m) => m.toISOString()), series: trend.series }, expenses: cur.map((t) => ({ id: t.id, description: t.description, amount: t.amount, date: t.date.toISOString(), categoryId: t.categoryId, account: "Nubank" })) }}
      investmentTotals={{ invested: 22000, current: 25300, returnAmount: 3300, returnPercent: 0.15 }}
      patrimonyEvolution={["jun", "jul", "ago", "set", "out", "nov"].map((label, i) => ({ label, saldo: 3000 + i * 1400, investido: 18000 + i * 1300 }))}
      recentTransactions={[income, ...cur].sort((a, b) => +b.date - +a.date).slice(0, 5).map(ser)}
      goals={goals.map((g) => ({ ...g, deadline: g.deadline?.toISOString() ?? null })) as any}
      installmentsSummary={[{ name: "Show", category: "Lazer", color: "#A78BFA", total: 180, currentInstallment: 2, totalInstallments: 4, currentAmount: 360, targetAmount: 720 }, { name: "Notebook", category: "Saúde", color: "#FBBF24", total: 420, currentInstallment: 3, totalInstallments: 10, currentAmount: 1260, targetAmount: 4200 }, { name: "Geladeira", category: "Moradia", color: "#60A5FA", total: 250, currentInstallment: 12, totalInstallments: 12, currentAmount: 3000, targetAmount: 3000 }]}
      debtsSummary={{ debts: [], totalDebt: 3300, payoffDate: new Date(2027, 5, 1).toISOString(), monthsToPayoff: 7, timeline: ["dez", "jan", "fev", "mar", "abr", "mai", "jun"].map((label, i) => ({ label, remaining: 3300 - i * 500 })) } as any}
      periodLabel="Novembro 2026" period="2026-11" layout={defaultLayout()}
    />
  );
  // ?foto=1: simula uma foto de perfil (imagem de exemplo)
  return <ClientLayout user={{ name: "João Ferreira", email: "joao@example.com", avatarUrl: photo }} initialSidebarExpanded>{page}</ClientLayout>;
}
export default function Page() { return <Suspense><Screen /></Suspense>; }
