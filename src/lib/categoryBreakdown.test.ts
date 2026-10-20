import { describe, it, expect } from "vitest";
import { summarizeByCategory, monthsSpanned, buildMonthlyTrend, type ExpenseLike } from "./categoryBreakdown";

const food = { name: "Alimentação", color: "#F87171" };
const home = { name: "Moradia", color: "#60A5FA" };
const fun = { name: "Lazer", color: "#FBBF24" };

function expense(categoryId: string, amount: number, date = new Date(2026, 9, 10)): ExpenseLike {
  const category = categoryId === "food" ? food : categoryId === "home" ? home : fun;
  return { categoryId, amount, date, category };
}

describe("summarizeByCategory", () => {
  it("soma, conta, calcula média, fatia e variação", () => {
    const rows = summarizeByCategory(
      [expense("food", 100), expense("food", 50), expense("home", 850)],
      [expense("food", 100), expense("home", 1000)]
    );
    expect(rows.map((r) => r.categoryId)).toEqual(["home", "food"]);
    const foodRow = rows.find((r) => r.categoryId === "food")!;
    expect(foodRow).toMatchObject({ total: 150, count: 2, average: 75, share: 0.15, previousTotal: 100, change: 0.5 });
    expect(rows[0].change).toBeCloseTo(-0.15);
  });

  it("categoria sem gasto antes tem variação null", () => {
    const [row] = summarizeByCategory([expense("fun", 30)], []);
    expect(row.change).toBeNull();
  });

  it("categoria que zerou aparece com total 0 e -100%, depois das demais", () => {
    const rows = summarizeByCategory([expense("food", 10)], [expense("fun", 40)]);
    expect(rows.map((r) => r.categoryId)).toEqual(["food", "fun"]);
    expect(rows[1]).toMatchObject({ total: 0, count: 0, average: 0, share: 0, change: -1 });
  });

  it("sem gastos devolve lista vazia", () => {
    expect(summarizeByCategory([], [])).toEqual([]);
  });
});

describe("monthsSpanned", () => {
  it.each([
    [new Date(2026, 9, 1), new Date(2026, 10, 1), 1],
    [new Date(2026, 0, 1), new Date(2027, 0, 1), 12],
    [new Date(2026, 8, 25), new Date(2026, 9, 5), 2],
  ])("%s → %s = %i", (start, end, expected) => {
    expect(monthsSpanned(start, end)).toBe(expected);
  });
});

describe("buildMonthlyTrend", () => {
  it("distribui por mês na janela e ignora o que está fora", () => {
    const trend = buildMonthlyTrend(
      [
        expense("food", 10, new Date(2026, 7, 3)),
        expense("food", 5, new Date(2026, 7, 20)),
        expense("home", 100, new Date(2026, 9, 1)),
        expense("food", 999, new Date(2026, 6, 31)), // antes da janela
        expense("food", 999, new Date(2026, 10, 1)), // depois da janela
      ],
      new Date(2026, 9, 1),
      3
    );
    expect(trend.months).toEqual([new Date(2026, 7, 1), new Date(2026, 8, 1), new Date(2026, 9, 1)]);
    expect(trend.series).toEqual([
      { categoryId: "home", ...home, values: [0, 0, 100] },
      { categoryId: "food", ...food, values: [15, 0, 0] },
    ]);
  });

  it("atravessa a virada do ano", () => {
    const trend = buildMonthlyTrend([expense("food", 7, new Date(2025, 11, 15))], new Date(2026, 1, 1), 3);
    expect(trend.series[0].values).toEqual([7, 0, 0]);
  });
});
