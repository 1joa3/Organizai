import { describe, expect, it } from "vitest";
import { dayLabel, groupByDay, matchesSearch, summarizeTransactions } from "./transactionList";

const t = (description: string, type: string, amount: number, date: Date, category = "Lazer", account = "NU") => ({
  description,
  type,
  amount,
  date: date.toISOString(),
  category: { name: category },
  account: { name: account },
});

describe("summarizeTransactions", () => {
  it("soma receitas e despesas sem erro de ponto flutuante", () => {
    const s = summarizeTransactions([
      { type: "receita", amount: 0.1 },
      { type: "receita", amount: 0.2 },
      { type: "despesa", amount: 0.05 },
    ]);
    expect(s).toEqual({ receitas: 0.3, despesas: 0.05, saldo: 0.25 });
  });
});

describe("matchesSearch", () => {
  const item = t("Padaria São João", "despesa", 10, new Date(), "Alimentação", "INTER");

  it("ignora acentos e maiúsculas e procura em descrição, categoria e conta", () => {
    expect(matchesSearch(item, "sao joao")).toBe(true);
    expect(matchesSearch(item, "ALIMENTACAO")).toBe(true);
    expect(matchesSearch(item, "inter")).toBe(true);
  });

  it("exige todas as palavras; busca vazia aceita tudo", () => {
    expect(matchesSearch(item, "padaria inter")).toBe(true);
    expect(matchesSearch(item, "padaria nubank")).toBe(false);
    expect(matchesSearch(item, "   ")).toBe(true);
  });
});

describe("groupByDay", () => {
  it("agrupa por dia na ordem recebida, com o saldo do dia", () => {
    const groups = groupByDay([
      t("a", "despesa", 30, new Date(2026, 10, 10, 12)),
      t("b", "receita", 100, new Date(2026, 10, 10, 9)),
      t("c", "despesa", 5.5, new Date(2026, 10, 9, 12)),
    ]);
    expect(groups.map((g) => [g.key, g.items.length, g.total])).toEqual([
      ["2026-11-10", 2, 70],
      ["2026-11-09", 1, -5.5],
    ]);
  });
});

describe("dayLabel", () => {
  const now = new Date(2026, 10, 11, 15);

  it("usa Hoje e Ontem", () => {
    expect(dayLabel(new Date(2026, 10, 11), now)).toBe("Hoje");
    expect(dayLabel(new Date(2026, 10, 10), now)).toBe("Ontem");
  });

  it("mostra dia da semana e data, com o ano só quando é outro", () => {
    expect(dayLabel(new Date(2026, 10, 9), now)).toMatch(/9.*nov/);
    expect(dayLabel(new Date(2026, 10, 9), now)).not.toMatch(/2026/);
    expect(dayLabel(new Date(2025, 11, 31), now)).toMatch(/2025/);
  });
});
