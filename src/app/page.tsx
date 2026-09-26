import {
  getMonthlyTotals,
  getExpensesByCategory,
  getInvestmentTotals,
  getPatrimonyEvolution,
  getRecentTransactions,
  getGoalsSummary,
  getInstallmentsSummary,
  getDebtsSummary,
} from "@/lib/aggregations";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth() + 1;

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
    getMonthlyTotals(year, month),
    getExpensesByCategory(year, month),
    getInvestmentTotals(),
    getPatrimonyEvolution(),
    getRecentTransactions(5),
    getGoalsSummary(),
    getInstallmentsSummary(year, month),
    getDebtsSummary(),
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
      currentMonth={new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
      month={month}
      year={year}
    />
  );
}
