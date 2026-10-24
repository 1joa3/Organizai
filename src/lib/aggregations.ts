import { prisma } from "./prisma";
import { previousRange, type DateRange } from "./period";
import { getInstallmentInfo } from "./installments";
import { summarizeByCategory, buildMonthlyTrend, monthsSpanned } from "./categoryBreakdown";

/** Totais de receita e despesa no período */
export async function getPeriodTotals(userId: string, { start: startDate, end: endDate }: DateRange) {

  const [receitas, despesas] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        type: "receita",
        date: { gte: startDate, lt: endDate },
      },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        type: "despesa",
        date: { gte: startDate, lt: endDate },
      },
    }),
  ]);

  const totalReceitas = Number(receitas._sum.amount ?? 0);
  const totalDespesas = Number(despesas._sum.amount ?? 0);

  return {
    receitas: totalReceitas,
    despesas: totalDespesas,
    saldo: totalReceitas - totalDespesas,
  };
}

/** Despesas agrupadas por categoria no período */
export async function getExpensesByCategory(userId: string, { start: startDate, end: endDate }: DateRange) {

  const result = await prisma.transaction.groupBy({
    by: ["categoryId"],
    _sum: { amount: true },
    where: {
      userId,
      type: "despesa",
      date: { gte: startDate, lt: endDate },
    },
    orderBy: { _sum: { amount: "desc" } },
  });

  // Buscar nomes e cores das categorias
  const categoryIds = result.map((r) => r.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds }, userId },
  });
  const catMap = new Map(categories.map((c) => [c.id, c]));

  return result.map((r) => ({
    categoryId: r.categoryId,
    name: catMap.get(r.categoryId)?.name ?? "Sem categoria",
    color: catMap.get(r.categoryId)?.color ?? "#6B7280",
    total: Number(r._sum.amount ?? 0),
  }));
}

/** Total investido e valor atual de todos os investimentos */
export async function getInvestmentTotals(userId: string) {
  const result = await prisma.investment.aggregate({
    where: { userId },
    _sum: {
      investedAmount: true,
      currentAmount: true,
    },
  });

  const invested = Number(result._sum.investedAmount ?? 0);
  const current = Number(result._sum.currentAmount ?? 0);

  return {
    invested,
    current,
    returnAmount: current - invested,
    returnPercent: invested > 0 ? (current - invested) / invested : 0,
  };
}

/** Evolução patrimonial mensal (últimos 12 meses) */
export async function getPatrimonyEvolution(userId: string) {
  const now = new Date();
  const months: { label: string; saldo: number; investido: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const year = new Date(now.getFullYear(), now.getMonth() - i, 1).getFullYear();
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1).getMonth() + 1;
    const endDate = new Date(year, month, 1);

    const [receitas, despesas, investments] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId, type: "receita", date: { lt: endDate } },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId, type: "despesa", date: { lt: endDate } },
      }),
      prisma.investment.aggregate({
        _sum: { currentAmount: true },
        where: { userId, date: { lt: endDate } },
      }),
    ]);

    const saldo = Number(receitas._sum.amount ?? 0) - Number(despesas._sum.amount ?? 0);
    const investido = Number(investments._sum.currentAmount ?? 0);

    const monthLabel = new Date(year, month - 1).toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    });

    months.push({ label: monthLabel, saldo, investido });
  }

  return months;
}

/** Últimas N transações */
export async function getRecentTransactions(userId: string, limit = 5) {
  return prisma.transaction.findMany({
    where: { userId },
    take: limit,
    orderBy: { date: "desc" },
    include: {
      category: { select: { name: true, color: true, icon: true } },
      account: { select: { name: true } },
    },
  });
}

/** Transações do período, mais recentes primeiro (tela de transações) */
export async function getTransactionsInRange(userId: string, { start, end }: DateRange) {
  return prisma.transaction.findMany({
    where: { userId, date: { gte: start, lt: end } },
    orderBy: { date: "desc" },
    include: {
      category: { select: { name: true, color: true, icon: true } },
      account: { select: { name: true } },
    },
  });
}

export async function getGoalsSummary(userId: string) {
  return prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/** Despesas parceladas agrupadas por descrição base no mês */
export async function getInstallmentsSummary(userId: string, { start: startDate, end: endDate }: DateRange) {

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: "despesa",
      date: { gte: startDate, lt: endDate },
    },
    include: {
      category: true,
    },
    // Em períodos de vários meses a mesma compra aparece mais de uma vez;
    // em ordem de data, a parcela "atual" fica sendo a mais recente
    orderBy: { date: "asc" },
  });

  const installments = transactions.filter((t) => getInstallmentInfo(t));

  const grouped = new Map<string, { name: string; total: number; color: string; currentInstallment: number; totalInstallments: number; currentAmount: number; targetAmount: number }>();

  installments.forEach(t => {
    const info = getInstallmentInfo(t)!;
    const currentInst = info.current;
    const totalInst = info.total;
    const baseName = info.baseName;
    // Agrupa pela compra; transações antigas sem grupo caem no nome
    const groupKey = t.installmentGroupId ?? baseName;
    const existing = grouped.get(groupKey) || { 
      name: baseName,
      total: 0, 
      color: t.category?.color || "#8884d8",
      currentInstallment: 0,
      totalInstallments: 0,
      currentAmount: 0,
      targetAmount: 0,
    };
    
    // As assumps that there's typically 1 transaction per installment in the month
    grouped.set(groupKey, {
      name: existing.name,
      total: existing.total + Number(t.amount),
      color: existing.color,
      currentInstallment: currentInst,
      totalInstallments: totalInst,
      currentAmount: currentInst * Number(t.amount),
      targetAmount: totalInst * Number(t.amount),
    });
  });

  return Array.from(grouped.values()).map((data) => ({
    name: data.name,
    color: data.color,
    total: data.total,
    currentInstallment: data.currentInstallment,
    totalInstallments: data.totalInstallments,
    currentAmount: data.currentAmount,
    targetAmount: data.targetAmount,
  })).sort((a, b) => b.total - a.total);
}

/**
 * Resumo de dívidas parceladas em aberto: valor total restante, previsão de
 * quitação e a curva de saldo devedor mês a mês até zerar.
 */
export async function getDebtsSummary(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactions = await prisma.transaction.findMany({
    where: { userId, type: "despesa" },
    include: { category: true },
  });

  const installments = transactions.filter((t) => getInstallmentInfo(t));

  interface DebtGroup {
    name: string;
    color: string;
    totalInstallments: number;
    remainingInstallments: number;
    remainingAmount: number;
    payoffDate: Date;
  }

  const groups = new Map<string, DebtGroup>();
  const monthlyDue = new Map<string, number>();

  installments.forEach((t) => {
    const info = getInstallmentInfo(t)!;
    const totalInst = info.total;
    const baseName = info.baseName;
    const groupKey = t.installmentGroupId ?? baseName;
    const amount = Number(t.amount);
    const isFuture = t.date >= startOfMonth;

    const existing = groups.get(groupKey) ?? {
      name: baseName,
      color: t.category?.color ?? "#8884d8",
      totalInstallments: totalInst,
      remainingInstallments: 0,
      remainingAmount: 0,
      payoffDate: t.date,
    };

    if (isFuture) {
      existing.remainingInstallments += 1;
      existing.remainingAmount += amount;

      const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
      monthlyDue.set(key, (monthlyDue.get(key) ?? 0) + amount);
    }
    if (t.date > existing.payoffDate) existing.payoffDate = t.date;

    groups.set(groupKey, existing);
  });

  const debts = Array.from(groups.values())
    .filter((d) => d.remainingAmount > 0)
    .sort((a, b) => b.remainingAmount - a.remainingAmount);

  const totalDebt = debts.reduce((sum, d) => sum + d.remainingAmount, 0);
  const payoffDate = debts.length
    ? debts.reduce((max, d) => (d.payoffDate > max ? d.payoffDate : max), debts[0].payoffDate)
    : null;

  // Curva de saldo devedor mês a mês, do mês atual até quitar tudo
  const timeline: { label: string; remaining: number }[] = [];
  let remaining = totalDebt;
  const cursor = new Date(startOfMonth);
  let guard = 0;

  while (remaining > 0.01 && guard < 60) {
    timeline.push({
      label: cursor.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      remaining,
    });
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    remaining -= monthlyDue.get(key) ?? 0;
    cursor.setMonth(cursor.getMonth() + 1);
    guard++;
  }

  const monthsToPayoff = timeline.length;

  return {
    debts: debts.map((d) => ({
      name: d.name,
      color: d.color,
      totalInstallments: d.totalInstallments,
      remainingInstallments: d.remainingInstallments,
      remainingAmount: d.remainingAmount,
    })),
    totalDebt,
    payoffDate,
    monthsToPayoff,
    timeline,
  };
}

/**
 * Relatório da página de categorias: cada categoria no período comparada ao
 * período anterior, a evolução mês a mês (6 a 12 meses, terminando no mês
 * final do período) e as despesas do período para o detalhe de cada uma.
 */
export async function getCategoryReport(userId: string, range: DateRange) {
  const previous = previousRange(range);
  const lastMonth = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate() - 1);
  const trendMonths = Math.min(12, Math.max(6, monthsSpanned(range.start, range.end)));
  const trendStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth() - (trendMonths - 1), 1);
  const trendEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 1);

  // Uma consulta só, cobrindo o período, o anterior e a janela da evolução
  const from = [range.start, previous.start, trendStart].reduce((a, b) => (a < b ? a : b));
  const to = range.end > trendEnd ? range.end : trendEnd;

  const rows = await prisma.transaction.findMany({
    where: { userId, type: "despesa", date: { gte: from, lt: to } },
    include: {
      category: { select: { name: true, color: true } },
      account: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  const expenses = rows.map((t) => ({ ...t, amount: Number(t.amount) }));
  const inRange = (r: DateRange) => expenses.filter((t) => t.date >= r.start && t.date < r.end);
  const current = inRange(range);
  const before = inRange(previous);

  return {
    total: current.reduce((sum, t) => sum + t.amount, 0),
    previousTotal: before.reduce((sum, t) => sum + t.amount, 0),
    days: Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000),
    categories: summarizeByCategory(current, before),
    trend: buildMonthlyTrend(inRange({ start: trendStart, end: trendEnd }), lastMonth, trendMonths),
    transactions: current,
  };
}
