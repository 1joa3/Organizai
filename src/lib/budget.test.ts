import { describe, expect, it } from "vitest";
import { budgetMonths, buildBudgets, type BudgetCategory } from "./budget";
import { buildInsights } from "./dashboardStory";

const nov = { start: new Date(2026, 10, 1), end: new Date(2026, 11, 1) };
const cats: BudgetCategory[] = [
  { id: "mercado", name: "Mercado", color: "#0f0", monthlyBudget: 1000 },
  { id: "lazer", name: "Lazer", color: "#f00", monthlyBudget: 300 },
  { id: "casa", name: "Casa", color: "#00f", monthlyBudget: 2000 },
  { id: "outros", name: "Outros", color: "#999", monthlyBudget: null },
];

describe("budgetMonths", () => {
  it("meses inteiros contam um limite por mês", () => {
    expect(budgetMonths(nov)).toBe(1);
    expect(budgetMonths({ start: new Date(2026, 0, 1), end: new Date(2027, 0, 1) })).toBe(12);
    expect(budgetMonths({ start: new Date(2026, 8, 1), end: new Date(2026, 11, 1) })).toBe(3);
  });

  it("intervalo quebrado é proporcional aos dias", () => {
    const m = budgetMonths({ start: new Date(2026, 10, 5), end: new Date(2026, 10, 20) });
    expect(m).toBeCloseTo((15 * 12) / 365);
  });
});

describe("buildBudgets", () => {
  // 11 de novembro: 11 de 30 dias passados (~37%)
  const pace = { days: 30, elapsed: 11, ongoing: true };

  it("classifica pelo limite e pelo ritmo do mês", () => {
    const summary = buildBudgets(cats, { mercado: 350, lazer: 320, casa: 1200, outros: 80 }, nov, pace);
    const byId = Object.fromEntries(summary.items.map((i) => [i.categoryId, i]));
    expect(byId.lazer.status).toBe("over");
    expect(byId.casa.status).toBe("warning"); // 60% com 37% do mês
    expect(byId.mercado.status).toBe("ok"); // 35%
    expect(summary.items.map((i) => i.categoryId)).toEqual(["lazer", "casa", "mercado"]);
    expect(byId.outros).toBeUndefined();
    expect(summary.unbudgeted).toBe(80);
    expect(summary.limit).toBe(3300);
    expect(summary.spent).toBe(1870);
  });

  it("quanto dá para gastar por dia, contando hoje", () => {
    const summary = buildBudgets(cats, { mercado: 400 }, nov, pace);
    const mercado = summary.items.find((i) => i.categoryId === "mercado")!;
    expect(summary.daysLeft).toBe(20);
    expect(mercado.remaining).toBe(600);
    expect(mercado.perDay).toBe(30);
    expect(summary.items.find((i) => i.categoryId === "lazer")!.spent).toBe(0);
  });

  it("período encerrado não olha o ritmo, só o limite", () => {
    const done = { days: 30, elapsed: 30, ongoing: false };
    const summary = buildBudgets(cats, { mercado: 850, lazer: 280 }, nov, done);
    const byId = Object.fromEntries(summary.items.map((i) => [i.categoryId, i]));
    expect(byId.mercado.status).toBe("ok");
    expect(byId.lazer.status).toBe("warning"); // 93%, perto do limite
    expect(byId.mercado.perDay).toBeNull();
  });

  it("no ano o limite mensal vale doze vezes", () => {
    const year = { start: new Date(2026, 0, 1), end: new Date(2027, 0, 1) };
    const summary = buildBudgets(cats, { mercado: 9000 }, year, { days: 365, elapsed: 315, ongoing: true });
    expect(summary.items.find((i) => i.categoryId === "mercado")!.limit).toBe(12000);
  });
});

describe("observação do orçamento", () => {
  const base = {
    current: [],
    previous: [],
    range: nov,
    previousRange: { start: new Date(2026, 9, 1), end: nov.start },
    pace: { days: 30, elapsed: 11, ongoing: true, current: [], previous: [], spentToDate: 0, previousToDate: 0, previousTotal: 0, scheduled: 0, projection: null },
    receitas: 0,
    despesas: 0,
    previousName: "outubro",
    installments: [],
    goals: [],
  };
  const pace = { days: 30, elapsed: 11, ongoing: true };

  it("avisa a categoria que estourou", () => {
    const budgets = buildBudgets(cats, { lazer: 320 }, nov, pace);
    const insight = buildInsights({ ...base, budgets }).find((i) => i.id === "orcamento");
    expect(insight).toMatchObject({ tone: "bad", title: "Lazer passou do orçamento" });
  });

  it("avisa quem está acima do ritmo", () => {
    const budgets = buildBudgets(cats, { casa: 1200 }, nov, pace);
    const insight = buildInsights({ ...base, budgets }).find((i) => i.id === "orcamento");
    expect(insight?.title).toBe("Casa está gastando rápido");
    expect(insight?.detail).toBe("60% do orçamento usado com 37% do mês");
  });

  it("sem orçamento definido, nada", () => {
    const budgets = buildBudgets([], { casa: 1200 }, nov, pace);
    expect(buildInsights({ ...base, budgets }).some((i) => i.id === "orcamento")).toBe(false);
  });
});
