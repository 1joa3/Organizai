import { describe, expect, it } from "vitest";
import { buildInsights, buildPace, comparisonPhrase, type StoryExpense } from "./dashboardStory";

const nov = { start: new Date(2026, 10, 1), end: new Date(2026, 11, 1) };
const oct = { start: new Date(2026, 9, 1), end: new Date(2026, 10, 1) };

const e = (amount: number, date: Date, category = "Lazer", description = "x"): StoryExpense => ({
  amount,
  date,
  description,
  categoryId: category,
  category: { name: category, color: "#fff" },
});

describe("buildPace", () => {
  const current = [e(100, new Date(2026, 10, 2, 12)), e(50, new Date(2026, 10, 10, 12)), e(300, new Date(2026, 10, 25, 12))];
  const previous = [e(200, new Date(2026, 9, 5, 12)), e(400, new Date(2026, 9, 20, 12))];

  it("no mês em andamento, compara até o mesmo dia e separa o que já está lançado", () => {
    const pace = buildPace(current, previous, nov, oct, new Date(2026, 10, 11));
    expect(pace.days).toBe(30);
    expect(pace.elapsed).toBe(11);
    expect(pace.ongoing).toBe(true);
    expect(pace.spentToDate).toBe(150);
    expect(pace.previousToDate).toBe(200);
    expect(pace.previousTotal).toBe(600);
    expect(pace.scheduled).toBe(300);
    // O resto de outubro (400) é mais que o lançado (300)
    expect(pace.projection).toBe(550);
    expect(pace.current).toHaveLength(30);
    expect(pace.current[29]).toBe(450);
    expect(pace.previous).toHaveLength(31);
  });

  it("período que já acabou não tem projeção", () => {
    const pace = buildPace(current, previous, nov, oct, new Date(2026, 11, 3));
    expect(pace.elapsed).toBe(30);
    expect(pace.ongoing).toBe(false);
    expect(pace.spentToDate).toBe(450);
    expect(pace.scheduled).toBe(0);
    expect(pace.projection).toBeNull();
  });

  it("período futuro: nada passou ainda", () => {
    const pace = buildPace(current, previous, nov, oct, new Date(2026, 9, 15));
    expect(pace.elapsed).toBe(0);
    expect(pace.spentToDate).toBe(0);
    expect(pace.scheduled).toBe(450);
  });
});

describe("comparisonPhrase", () => {
  it("fala o nome do mês quando tem", () => {
    expect(comparisonPhrase("outubro", true)).toBe("que no mesmo ponto de outubro");
    expect(comparisonPhrase(null, false)).toBe("que no período anterior");
  });
});

describe("buildInsights", () => {
  const today = new Date(2026, 10, 11);
  const current = [
    e(300, new Date(2026, 10, 3, 12), "Mercado", "Supermercado"),
    e(20, new Date(2026, 10, 4, 12), "Transporte"),
    e(999, new Date(2026, 10, 28, 12), "Moradia", "Aluguel"), // depois de hoje: fica fora das comparações
  ];
  const previous = [
    e(100, new Date(2026, 9, 2, 12), "Mercado"),
    e(200, new Date(2026, 9, 6, 12), "Transporte"),
    e(500, new Date(2026, 9, 25, 12), "Mercado"), // depois do mesmo ponto
  ];
  const pace = buildPace(current, previous, nov, oct, today);
  const base = {
    current,
    previous,
    range: nov,
    previousRange: oct,
    pace,
    receitas: 2000,
    despesas: 1319,
    previousName: "outubro",
    installments: [],
    goals: [],
  };

  it("compara categorias até o mesmo dia do mês anterior", () => {
    const insights = buildInsights(base);
    const up = insights.find((i) => i.id === "categoria-subiu");
    const down = insights.find((i) => i.id === "categoria-caiu");
    expect(up?.title).toBe("Mercado subiu 200%");
    expect(up?.detail).toContain("no mesmo ponto de outubro");
    expect(down?.title).toBe("Transporte caiu 90%");
  });

  it("maior gasto ignora o que ainda não aconteceu", () => {
    const biggest = buildInsights(base).find((i) => i.id === "maior-gasto");
    expect(biggest?.title).toBe("Maior gasto: Supermercado");
  });

  it("taxa de poupança, parcelas que terminam e meta perto do fim", () => {
    const insights = buildInsights({
      ...base,
      installments: [
        { name: "TV", currentInstallment: 10, totalInstallments: 10 },
        { name: "Sofá", currentInstallment: 3, totalInstallments: 12 },
      ],
      goals: [{ name: "Viagem", currentAmount: 900, targetAmount: 1000 }],
    });
    expect(insights[0]).toMatchObject({ id: "poupanca", tone: "good", title: "Você guardou 34% do que entrou" });
    expect(insights.find((i) => i.id === "parcelas-fim")).toMatchObject({ title: "Um parcelamento termina agora", detail: "TV" });
    expect(insights.find((i) => i.id === "meta")?.title).toBe("Falta pouco para a meta Viagem");
    expect(insights.length).toBeLessThanOrEqual(5);
  });

  it("gastar mais do que entrou vira alerta", () => {
    const poupanca = buildInsights({ ...base, receitas: 1000, despesas: 1200 })[0];
    expect(poupanca).toMatchObject({ tone: "bad", title: "Saiu 20% a mais do que entrou" });
  });

  it("conta os dias sem gastar até hoje", () => {
    const free = buildInsights(base).find((i) => i.id === "dias-sem-gastar");
    expect(free?.title).toBe("9 dias sem gastar");
  });
});
