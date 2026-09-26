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
