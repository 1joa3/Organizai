import { describe, it, expect } from "vitest";
import {
  parsePeriod,
  formatPeriod,
  resolvePeriod,
  periodRange,
  periodLabel,
  shiftPeriod,
  type Period,
} from "./period";

const NOW = new Date(2026, 9, 13); // 13/10/2026

describe("parsePeriod / formatPeriod", () => {
  it.each<[string, Period]>([
    ["2026-10", { kind: "month", year: 2026, month: 10 }],
    ["last-3", { kind: "last", months: 3 }],
    ["last-12", { kind: "last", months: 12 }],
    ["2026", { kind: "year", year: 2026 }],
    ["2026-07-01_2026-10-13", { kind: "custom", from: "2026-07-01", to: "2026-10-13" }],
  ])("ida e volta de %s", (text, period) => {
    expect(parsePeriod(text)).toEqual(period);
    expect(formatPeriod(period)).toBe(text);
  });

  it("aceita o formato antigo do cookie, sem zero à esquerda", () => {
    expect(parsePeriod("2026-9")).toEqual({ kind: "month", year: 2026, month: 9 });
  });

  it.each(["", "2026-13", "2026-0", "last-5", "2026-02-30_2026-03-01", "2026-10-13_2026-10-01", "abc"])(
    "rejeita %j",
    (text) => {
      expect(parsePeriod(text)).toBeNull();
    }
  );
});

describe("resolvePeriod", () => {
  it("prioriza ?period=, depois ?month=&year=, depois o cookie, depois o mês atual", () => {
    expect(resolvePeriod({ period: "last-6", month: "1", year: "2025" }, "2024-05", NOW)).toEqual({ kind: "last", months: 6 });
    expect(resolvePeriod({ month: "1", year: "2025" }, "2024-05", NOW)).toEqual({ kind: "month", year: 2025, month: 1 });
    expect(resolvePeriod({}, "2024-05", NOW)).toEqual({ kind: "month", year: 2024, month: 5 });
    expect(resolvePeriod({}, undefined, NOW)).toEqual({ kind: "month", year: 2026, month: 10 });
  });

  it("ignora valores inválidos e cai para o próximo", () => {
    expect(resolvePeriod({ period: "lixo" }, "também-lixo", NOW)).toEqual({ kind: "month", year: 2026, month: 10 });
  });
});

describe("periodRange", () => {
  it("mês: do dia 1 até o dia 1 do mês seguinte", () => {
    expect(periodRange({ kind: "month", year: 2026, month: 12 }, NOW)).toEqual({
      start: new Date(2026, 11, 1),
      end: new Date(2027, 0, 1),
    });
  });

  it("últimos N meses inclui o mês atual inteiro e atravessa o ano", () => {
    expect(periodRange({ kind: "last", months: 3 }, NOW)).toEqual({
      start: new Date(2026, 7, 1),
      end: new Date(2026, 10, 1),
    });
    expect(periodRange({ kind: "last", months: 12 }, NOW)).toEqual({
      start: new Date(2025, 10, 1),
      end: new Date(2026, 10, 1),
    });
  });

  it("ano inteiro", () => {
    expect(periodRange({ kind: "year", year: 2026 }, NOW)).toEqual({
      start: new Date(2026, 0, 1),
      end: new Date(2027, 0, 1),
    });
  });

  it("personalizado inclui o dia final inteiro", () => {
    expect(periodRange({ kind: "custom", from: "2026-07-01", to: "2026-10-13" }, NOW)).toEqual({
      start: new Date(2026, 6, 1),
      end: new Date(2026, 9, 14),
    });
  });
});

describe("periodLabel", () => {
  it("descreve cada tipo de período", () => {
    expect(periodLabel({ kind: "month", year: 2026, month: 10 })).toBe("Outubro de 2026");
    expect(periodLabel({ kind: "last", months: 6 })).toBe("Últimos 6 meses");
    expect(periodLabel({ kind: "year", year: 2026 })).toBe("Ano de 2026");
    expect(periodLabel({ kind: "custom", from: "2026-07-01", to: "2026-10-13" })).toBe("01/07/2026 – 13/10/2026");
  });
});

describe("shiftPeriod", () => {
  it("move o mês atravessando a virada de ano", () => {
    expect(shiftPeriod({ kind: "month", year: 2026, month: 12 }, 1)).toEqual({ kind: "month", year: 2027, month: 1 });
    expect(shiftPeriod({ kind: "month", year: 2026, month: 1 }, -1)).toEqual({ kind: "month", year: 2025, month: 12 });
  });

  it("move o ano", () => {
    expect(shiftPeriod({ kind: "year", year: 2026 }, -1)).toEqual({ kind: "year", year: 2025 });
  });

  it("períodos relativos e personalizados não têm vizinho", () => {
    expect(shiftPeriod({ kind: "last", months: 3 }, 1)).toBeNull();
    expect(shiftPeriod({ kind: "custom", from: "2026-07-01", to: "2026-10-13" }, 1)).toBeNull();
  });
});
