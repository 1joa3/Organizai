import { prisma } from "./prisma";

/** Totais de receita e despesa do mês corrente */
export async function getMonthlyTotals(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const [receitas, despesas] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        type: "receita",
        date: { gte: startDate, lt: endDate },
      },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
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

/** Despesas agrupadas por categoria no mês */
export async function getExpensesByCategory(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const result = await prisma.transaction.groupBy({
    by: ["categoryId"],
    _sum: { amount: true },
    where: {
      type: "despesa",
      date: { gte: startDate, lt: endDate },
    },
    orderBy: { _sum: { amount: "desc" } },
  });

  // Buscar nomes e cores das categorias
  const categoryIds = result.map((r) => r.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
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
export async function getInvestmentTotals() {
  const result = await prisma.investment.aggregate({
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
export async function getPatrimonyEvolution() {
  const now = new Date();
  const months: { label: string; saldo: number; investido: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const year = new Date(now.getFullYear(), now.getMonth() - i, 1).getFullYear();
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1).getMonth() + 1;
    const endDate = new Date(year, month, 1);

    const [receitas, despesas, investments] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: "receita", date: { lt: endDate } },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: "despesa", date: { lt: endDate } },
      }),
      prisma.investment.aggregate({
        _sum: { currentAmount: true },
        where: { date: { lt: endDate } },
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
export async function getRecentTransactions(limit = 5) {
  return prisma.transaction.findMany({
    take: limit,
    orderBy: { date: "desc" },
    include: {
      category: { select: { name: true, color: true, icon: true } },
      account: { select: { name: true } },
    },
  });
}

export async function getGoalsSummary() {
  return prisma.goal.findMany({
    orderBy: { createdAt: "desc" },
  });
}

/** Despesas parceladas agrupadas por descrição base no mês */
export async function getInstallmentsSummary(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const transactions = await prisma.transaction.findMany({
    where: {
      type: "despesa",
      date: { gte: startDate, lt: endDate },
    },
    include: {
      category: true,
    }
  });

  const installments = transactions.filter(t => /\(\d+\/\d+\)$/.test(t.description));

  const grouped = new Map<string, { total: number; color: string; currentInstallment: number; totalInstallments: number; currentAmount: number; targetAmount: number }>();

  installments.forEach(t => {
    const match = t.description.match(/\((\d+)\/(\d+)\)$/);
    let currentInst = 0;
    let totalInst = 1;
    if (match) {
      currentInst = parseInt(match[1]);
      totalInst = parseInt(match[2]);
    }
    const baseName = t.description.replace(/\s*\(\d+\/\d+\)$/, "").trim();
    const existing = grouped.get(baseName) || { 
      total: 0, 
      color: t.category?.color || "#8884d8",
      currentInstallment: 0,
      totalInstallments: 0,
      currentAmount: 0,
      targetAmount: 0,
    };
    
    // As assumps that there's typically 1 transaction per installment in the month
    grouped.set(baseName, {
      total: existing.total + Number(t.amount),
      color: existing.color,
      currentInstallment: currentInst,
      totalInstallments: totalInst,
      currentAmount: currentInst * Number(t.amount),
      targetAmount: totalInst * Number(t.amount),
    });
  });

  return Array.from(grouped.entries()).map(([name, data]) => ({
    name,
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
export async function getDebtsSummary() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactions = await prisma.transaction.findMany({
    where: { type: "despesa" },
    include: { category: true },
  });

  const installments = transactions.filter((t) => /\(\d+\/\d+\)$/.test(t.description));

  interface DebtGroup {
    color: string;
    totalInstallments: number;
    remainingInstallments: number;
    remainingAmount: number;
    payoffDate: Date;
  }

  const groups = new Map<string, DebtGroup>();
  const monthlyDue = new Map<string, number>();

  installments.forEach((t) => {
    const match = t.description.match(/\((\d+)\/(\d+)\)$/);
    if (!match) return;
    const totalInst = parseInt(match[2]);
    const baseName = t.description.replace(/\s*\(\d+\/\d+\)$/, "").trim();
    const amount = Number(t.amount);
    const isFuture = t.date >= startOfMonth;

    const existing = groups.get(baseName) ?? {
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

    groups.set(baseName, existing);
  });

  const debts = Array.from(groups.entries())
    .map(([name, data]) => ({ name, ...data }))
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
