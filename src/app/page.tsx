import {
  getPeriodTotals,
  getExpensesByCategory,
  getInvestmentTotals,
  getPatrimonyEvolution,
  getRecentTransactions,
  getGoalsSummary,
  getInstallmentsSummary,
  getDebtsSummary,
} from "@/lib/aggregations";
import DashboardClient from "./DashboardClient";
import { requireUser } from "@/lib/dal";
import { cookies } from "next/headers";
import { DASHBOARD_LAYOUT_COOKIE, parseLayout } from "@/lib/dashboardLayout";
import { PERIOD_COOKIE, resolvePeriod, periodRange, periodLabel, formatPeriod } from "@/lib/period";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ period?: string; month?: string; year?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { id: userId } = await requireUser();
  const params = await searchParams;
  const cookieStore = await cookies();
  const period = resolvePeriod(params, cookieStore.get(PERIOD_COOKIE)?.value);
  const range = periodRange(period);

  const [
    monthlyTotals,
    expensesByCategory,
    investmentTotals,
    patrimonyEvolution,
    recentTransactions,
    goals,
    installmentsSummary,
    debtsSummary,
  ] = await Promise.all([
    getPeriodTotals(userId, range),
    getExpensesByCategory(userId, range),
    getInvestmentTotals(userId),
    getPatrimonyEvolution(userId),
    getRecentTransactions(userId, 5),
    getGoalsSummary(userId),
    getInstallmentsSummary(userId, range),
    getDebtsSummary(userId),
  ]);

  // Serializar transações recentes
  const serializedTransactions = recentTransactions.map((t) => ({
    id: t.id,
    description: t.description,
    amount: Number(t.amount),
    type: t.type,
    date: t.date.toISOString(),
    category: t.category,
    account: t.account,
  }));

  // Serializar metas
  const serializedGoals = goals.map((g) => ({
    id: g.id,
    name: g.name,
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    color: g.color,
    deadline: g.deadline?.toISOString() || null,
  }));

  const serializedDebtsSummary = {
    ...debtsSummary,
    payoffDate: debtsSummary.payoffDate?.toISOString() ?? null,
  };

  return (
    <DashboardClient
      monthlyTotals={monthlyTotals}
      expensesByCategory={expensesByCategory}
      investmentTotals={investmentTotals}
      patrimonyEvolution={patrimonyEvolution}
      recentTransactions={serializedTransactions}
      goals={serializedGoals}
      installmentsSummary={installmentsSummary}
      debtsSummary={serializedDebtsSummary}
      periodLabel={periodLabel(period)}
      period={formatPeriod(period)}
      layout={parseLayout(cookieStore.get(DASHBOARD_LAYOUT_COOKIE)?.value)}
    />
  );
}
