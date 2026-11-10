import { describe, expect, it } from "vitest";
import { buildPatrimonyEvolution, patrimonyWindow } from "./patrimony";

const now = new Date(2026, 10, 10, 12); // 10/nov/2026

describe("patrimonyWindow", () => {
  it("cobre do início de 11 meses atrás até o início do próximo mês", () => {
    const w = patrimonyWindow(now);
    expect(w.start).toEqual(new Date(2025, 11, 1));
    expect(w.end).toEqual(new Date(2026, 11, 1));
  });
});

describe("buildPatrimonyEvolution", () => {
  it("acumula o saldo inicial e as transações mês a mês", () => {
    const months = buildPatrimonyEvolution(
      now,
      1000,
      [
        { type: "receita", amount: 500, date: new Date(2026, 0, 15, 12) },
        { type: "despesa", amount: 200.1, date: new Date(2026, 1, 3, 12) },
        { type: "despesa", amount: 50, date: new Date(2026, 10, 9, 12) },
      ],
      [
        { currentAmount: 300, date: new Date(2025, 5, 1, 12) },
        { currentAmount: 100, date: new Date(2026, 2, 20, 12) },
      ]
    );

    expect(months).toHaveLength(12);
    expect(months[0]).toMatchObject({ saldo: 1000, investido: 300 }); // dez/25
    expect(months[1]).toMatchObject({ saldo: 1500, investido: 300 }); // jan/26
    expect(months[2]).toMatchObject({ saldo: 1299.9, investido: 300 }); // fev/26
    expect(months[3]).toMatchObject({ saldo: 1299.9, investido: 400 }); // mar/26
    expect(months[11]).toMatchObject({ saldo: 1249.9, investido: 400 }); // nov/26
  });

  it("sem dados, tudo zero", () => {
    const months = buildPatrimonyEvolution(now, 0, [], []);
    expect(months.every((m) => m.saldo === 0 && m.investido === 0)).toBe(true);
  });
});
