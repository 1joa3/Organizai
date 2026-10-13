import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "./prisma";
import { periodRange } from "./period";
import {
  getPeriodTotals,
  getExpensesByCategory,
  getInstallmentsSummary,
  getInvestmentTotals,
  getDebtsSummary,
} from "./aggregations";

const YEAR = 2024;
const MONTH = 3; // março/2024
const USER = "user-a";
const OTHER_USER = "user-b";
const monthRange = periodRange({ kind: "month", year: YEAR, month: MONTH });

let accountId: string;
let categoryDespesaId: string;
let categoryReceitaId: string;

beforeAll(async () => {
  const account = await prisma.account.create({
    data: { name: "Conta Teste", type: "corrente", userId: USER },
  });
  accountId = account.id;

  const catDespesa = await prisma.category.create({
    data: { name: "Alimentação", type: "despesa", color: "#F87171", userId: USER },
  });
  categoryDespesaId = catDespesa.id;

  const catReceita = await prisma.category.create({
    data: { name: "Salário", type: "receita", color: "#34D399", userId: USER },
  });
  categoryReceitaId = catReceita.id;
});

afterAll(async () => {
  await prisma.transaction.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.category.deleteMany();
  await prisma.account.deleteMany();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.transaction.deleteMany();
  await prisma.investment.deleteMany();
});

describe("getPeriodTotals", () => {
  it("soma receitas e despesas apenas do mês/ano informado", async () => {
    await prisma.transaction.createMany({
      data: [
        {
          description: "Salário",
          amount: 5000,
          type: "receita",
          date: new Date(YEAR, MONTH - 1, 5),
          accountId,
          userId: USER,
          categoryId: categoryReceitaId,
        },
        {
          description: "Mercado",
          amount: 300,
          type: "despesa",
          date: new Date(YEAR, MONTH - 1, 10),
          accountId,
          userId: USER,
          categoryId: categoryDespesaId,
        },
        // fora do período — não deve entrar na soma
        {
          description: "Mercado mês anterior",
          amount: 999,
          type: "despesa",
          date: new Date(YEAR, MONTH - 2, 10),
          accountId,
          userId: USER,
          categoryId: categoryDespesaId,
        },
      ],
    });

    const totals = await getPeriodTotals(USER, monthRange);

    expect(totals.receitas).toBe(5000);
    expect(totals.despesas).toBe(300);
    expect(totals.saldo).toBe(4700);
  });

  it("retorna zeros quando não há transações no período", async () => {
    const totals = await getPeriodTotals(USER, monthRange);
    expect(totals).toEqual({ receitas: 0, despesas: 0, saldo: 0 });
  });
});

describe("getExpensesByCategory", () => {
  it("agrupa despesas por categoria e ordena da maior para a menor", async () => {
    const catAluguel = await prisma.category.create({
      data: { name: "Moradia", type: "despesa", color: "#60A5FA", userId: USER },
    });

    await prisma.transaction.createMany({
      data: [
        {
          description: "Mercado",
          amount: 300,
          type: "despesa",
          date: new Date(YEAR, MONTH - 1, 10),
          accountId,
          userId: USER,
          categoryId: categoryDespesaId,
        },
        {
          description: "Aluguel",
          amount: 1500,
          type: "despesa",
          date: new Date(YEAR, MONTH - 1, 5),
          accountId,
          userId: USER,
          categoryId: catAluguel.id,
        },
      ],
    });

    const result = await getExpensesByCategory(USER, monthRange);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ name: "Moradia", total: 1500 });
    expect(result[1]).toMatchObject({ name: "Alimentação", total: 300 });

    await prisma.transaction.deleteMany();
    await prisma.category.delete({ where: { id: catAluguel.id } });
  });
});

describe("getInstallmentsSummary", () => {
  it("extrai parcela atual/total da descrição e calcula progresso", async () => {
    await prisma.transaction.create({
      data: {
        description: "Notebook (3/10)",
        amount: 200,
        type: "despesa",
        date: new Date(YEAR, MONTH - 1, 15),
        accountId,
        userId: USER,
        categoryId: categoryDespesaId,
      },
    });

    const result = await getInstallmentsSummary(USER, monthRange);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "Notebook",
      currentInstallment: 3,
      totalInstallments: 10,
      currentAmount: 600, // 3 * 200
      targetAmount: 2000, // 10 * 200
    });
  });

  it("ignora despesas sem padrão de parcela na descrição", async () => {
    await prisma.transaction.create({
      data: {
        description: "Mercado",
        amount: 300,
        type: "despesa",
        date: new Date(YEAR, MONTH - 1, 10),
        accountId,
        userId: USER,
        categoryId: categoryDespesaId,
      },
    });

    const result = await getInstallmentsSummary(USER, monthRange);
    expect(result).toHaveLength(0);
  });
});

describe("getInvestmentTotals", () => {
  it("calcula retorno absoluto e percentual sobre o total investido", async () => {
    await prisma.investment.createMany({
      data: [
        {
          asset: "Tesouro Selic",
          assetType: "renda_fixa",
          userId: USER,
          investedAmount: 1000,
          currentAmount: 1100,
          date: new Date(YEAR, MONTH - 1, 1),
        },
        {
          asset: "IVVB11",
          assetType: "renda_variavel",
          userId: USER,
          investedAmount: 500,
          currentAmount: 450,
          date: new Date(YEAR, MONTH - 1, 1),
        },
      ],
    });

    const totals = await getInvestmentTotals(USER);

    expect(totals.invested).toBe(1500);
    expect(totals.current).toBe(1550);
    expect(totals.returnAmount).toBe(50);
    expect(totals.returnPercent).toBeCloseTo(50 / 1500);
  });

  it("retorna 0% de retorno quando não há valor investido", async () => {
    const totals = await getInvestmentTotals(USER);
    expect(totals).toEqual({
      invested: 0,
      current: 0,
      returnAmount: 0,
      returnPercent: 0,
    });
  });
});

describe("getDebtsSummary", () => {
  // getDebtsSummary usa a data real (new Date()), então as parcelas de teste
  // precisam ser relativas ao mês atual, não ao período fixo (YEAR/MONTH) usado acima.
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  it("soma o saldo devedor restante e projeta a curva de quitação mês a mês", async () => {
    for (let i = 0; i < 3; i++) {
      await prisma.transaction.create({
        data: {
          description: `Notebook (${i + 1}/3)`,
          amount: 100,
          type: "despesa",
          date: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + i, 1),
          accountId,
          userId: USER,
          categoryId: categoryDespesaId,
        },
      });
    }

    const summary = await getDebtsSummary(USER);

    expect(summary.totalDebt).toBe(300);
    expect(summary.monthsToPayoff).toBe(3);
    expect(summary.timeline).toHaveLength(3);
    expect(summary.timeline.map((t) => t.remaining)).toEqual([300, 200, 100]);
    expect(summary.debts).toHaveLength(1);
    expect(summary.debts[0]).toMatchObject({
      name: "Notebook",
      remainingInstallments: 3,
      remainingAmount: 300,
    });
  });

  it("ignora parcelamentos já totalmente quitados (todas as parcelas no passado)", async () => {
    for (let i = 0; i < 2; i++) {
      await prisma.transaction.create({
        data: {
          description: `Fone (${i + 1}/2)`,
          amount: 50,
          type: "despesa",
          date: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() - 3 + i, 1),
          accountId,
          userId: USER,
          categoryId: categoryDespesaId,
        },
      });
    }

    const summary = await getDebtsSummary(USER);

    expect(summary.totalDebt).toBe(0);
    expect(summary.debts).toHaveLength(0);
    expect(summary.payoffDate).toBeNull();
    expect(summary.timeline).toHaveLength(0);
  });
});

describe("isolamento entre usuários", () => {
  it("nenhuma consulta enxerga dados de outro usuário", async () => {
    const otherAccount = await prisma.account.create({ data: { name: "Conta do B", type: "corrente", userId: OTHER_USER } });
    const otherCategory = await prisma.category.create({
      data: { name: "Categoria do B", type: "despesa", color: "#000000", userId: OTHER_USER },
    });
    const now = new Date();
    await prisma.transaction.createMany({
      data: [
        // do usuário A
        { description: "Mercado", amount: 100, type: "despesa", date: new Date(YEAR, MONTH - 1, 10), accountId, categoryId: categoryDespesaId, userId: USER },
        // do usuário B, mesmo período, inclusive parcelas futuras
        { description: "Gasto do B", amount: 999, type: "despesa", date: new Date(YEAR, MONTH - 1, 10), accountId: otherAccount.id, categoryId: otherCategory.id, userId: OTHER_USER },
        { description: "Receita do B", amount: 5000, type: "receita", date: new Date(YEAR, MONTH - 1, 10), accountId: otherAccount.id, categoryId: otherCategory.id, userId: OTHER_USER },
        {
          description: "TV do B (1/2)", amount: 300, type: "despesa", date: new Date(now.getFullYear(), now.getMonth() + 1, 5),
          accountId: otherAccount.id, categoryId: otherCategory.id, userId: OTHER_USER,
          installmentGroupId: "grupo-b", installmentNumber: 1, installmentTotal: 2,
        },
      ],
    });
    await prisma.investment.create({
      data: { asset: "Ação do B", assetType: "renda_variavel", investedAmount: 1000, currentAmount: 2000, date: new Date(YEAR, MONTH - 1, 1), userId: OTHER_USER },
    });

    expect(await getPeriodTotals(USER, monthRange)).toEqual({ receitas: 0, despesas: 100, saldo: -100 });
    expect((await getExpensesByCategory(USER, monthRange)).map((c) => c.name)).toEqual(["Alimentação"]);
    expect((await getInvestmentTotals(USER)).invested).toBe(0);
    expect((await getDebtsSummary(USER)).totalDebt).toBe(0);

    // e o usuário B vê só o que é dele
    expect(await getPeriodTotals(OTHER_USER, monthRange)).toEqual({ receitas: 5000, despesas: 999, saldo: 4001 });
    expect((await getDebtsSummary(OTHER_USER)).totalDebt).toBe(300);
  });
});
