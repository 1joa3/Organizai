import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "./prisma";
import {
  getMonthlyTotals,
  getExpensesByCategory,
  getInstallmentsSummary,
  getInvestmentTotals,
} from "./aggregations";

const YEAR = 2024;
const MONTH = 3; // março/2024

let accountId: string;
let categoryDespesaId: string;
let categoryReceitaId: string;

beforeAll(async () => {
  const account = await prisma.account.create({
    data: { name: "Conta Teste", type: "corrente" },
  });
  accountId = account.id;

  const catDespesa = await prisma.category.create({
    data: { name: "Alimentação", type: "despesa", color: "#F87171" },
  });
  categoryDespesaId = catDespesa.id;

  const catReceita = await prisma.category.create({
    data: { name: "Salário", type: "receita", color: "#34D399" },
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

describe("getMonthlyTotals", () => {
  it("soma receitas e despesas apenas do mês/ano informado", async () => {
    await prisma.transaction.createMany({
      data: [
        {
          description: "Salário",
          amount: 5000,
          type: "receita",
          date: new Date(YEAR, MONTH - 1, 5),
          accountId,
          categoryId: categoryReceitaId,
        },
        {
          description: "Mercado",
          amount: 300,
          type: "despesa",
          date: new Date(YEAR, MONTH - 1, 10),
          accountId,
          categoryId: categoryDespesaId,
        },
        // fora do período — não deve entrar na soma
        {
          description: "Mercado mês anterior",
          amount: 999,
          type: "despesa",
          date: new Date(YEAR, MONTH - 2, 10),
          accountId,
          categoryId: categoryDespesaId,
        },
      ],
    });

    const totals = await getMonthlyTotals(YEAR, MONTH);

    expect(totals.receitas).toBe(5000);
    expect(totals.despesas).toBe(300);
    expect(totals.saldo).toBe(4700);
  });

  it("retorna zeros quando não há transações no período", async () => {
    const totals = await getMonthlyTotals(YEAR, MONTH);
    expect(totals).toEqual({ receitas: 0, despesas: 0, saldo: 0 });
  });
});

describe("getExpensesByCategory", () => {
  it("agrupa despesas por categoria e ordena da maior para a menor", async () => {
    const catAluguel = await prisma.category.create({
      data: { name: "Moradia", type: "despesa", color: "#60A5FA" },
    });

    await prisma.transaction.createMany({
      data: [
        {
          description: "Mercado",
          amount: 300,
          type: "despesa",
          date: new Date(YEAR, MONTH - 1, 10),
          accountId,
          categoryId: categoryDespesaId,
        },
        {
          description: "Aluguel",
          amount: 1500,
          type: "despesa",
          date: new Date(YEAR, MONTH - 1, 5),
          accountId,
          categoryId: catAluguel.id,
        },
      ],
    });

    const result = await getExpensesByCategory(YEAR, MONTH);

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
        categoryId: categoryDespesaId,
      },
    });

    const result = await getInstallmentsSummary(YEAR, MONTH);

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
        categoryId: categoryDespesaId,
      },
    });

    const result = await getInstallmentsSummary(YEAR, MONTH);
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
          investedAmount: 1000,
          currentAmount: 1100,
          date: new Date(YEAR, MONTH - 1, 1),
        },
        {
          asset: "IVVB11",
          assetType: "renda_variavel",
          investedAmount: 500,
          currentAmount: 450,
          date: new Date(YEAR, MONTH - 1, 1),
        },
      ],
    });

    const totals = await getInvestmentTotals();

    expect(totals.invested).toBe(1500);
    expect(totals.current).toBe(1550);
    expect(totals.returnAmount).toBe(50);
    expect(totals.returnPercent).toBeCloseTo(50 / 1500);
  });

  it("retorna 0% de retorno quando não há valor investido", async () => {
    const totals = await getInvestmentTotals();
    expect(totals).toEqual({
      invested: 0,
      current: 0,
      returnAmount: 0,
      returnPercent: 0,
    });
  });
});
