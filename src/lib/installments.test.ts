import { describe, it, expect } from "vitest";
import {
  parseInstallmentDescription,
  escapeRegExp,
  addMonthsClamped,
  splitInstallmentAmounts,
} from "./installments";

describe("parseInstallmentDescription", () => {
  it("extrai nome base, parcela atual e total", () => {
    expect(parseInstallmentDescription("Notebook (3/10)")).toEqual({
      baseName: "Notebook",
      current: 3,
      total: 10,
    });
  });

  it("funciona com nomes compostos e caracteres especiais", () => {
    expect(parseInstallmentDescription("Airbnb * Hmmenx82xr - Parcela 2/6 (2/25)")).toEqual({
      baseName: "Airbnb * Hmmenx82xr - Parcela 2/6",
      current: 2,
      total: 25,
    });
  });

  it("retorna null para descrição sem padrão de parcela", () => {
    expect(parseInstallmentDescription("Mercado")).toBeNull();
  });
});

describe("escapeRegExp", () => {
  it("escapa caracteres especiais de regex", () => {
    expect(escapeRegExp("Airbnb * Hmmenx82xr (2/6)")).toBe("Airbnb \\* Hmmenx82xr \\(2/6\\)");
  });

  it("usado como regex continua combinando o texto literal original", () => {
    const original = "Compra (1/3)?";
    const pattern = new RegExp(`^${escapeRegExp(original)}$`);
    expect(pattern.test(original)).toBe(true);
  });
});

describe("addMonthsClamped", () => {
  it("mantém o dia quando ele existe no mês de destino", () => {
    expect(addMonthsClamped(new Date(2026, 0, 15), 1)).toEqual(new Date(2026, 1, 15));
  });

  it("usa o último dia do mês quando o dia não existe (31/01 + 1 = 28/02)", () => {
    expect(addMonthsClamped(new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 28));
  });

  it("respeita ano bissexto e volta ao dia original nos meses seguintes", () => {
    expect(addMonthsClamped(new Date(2028, 0, 31), 1)).toEqual(new Date(2028, 1, 29));
    expect(addMonthsClamped(new Date(2028, 0, 31), 2)).toEqual(new Date(2028, 2, 31));
  });

  it("atravessa a virada de ano", () => {
    expect(addMonthsClamped(new Date(2026, 10, 30), 3)).toEqual(new Date(2027, 1, 28));
  });

  it("não altera a data original", () => {
    const original = new Date(2026, 0, 31);
    addMonthsClamped(original, 1);
    expect(original).toEqual(new Date(2026, 0, 31));
  });
});

describe("splitInstallmentAmounts", () => {
  it("a última parcela absorve o arredondamento (100 em 3x)", () => {
    expect(splitInstallmentAmounts(100, 3)).toEqual([33.33, 33.33, 33.34]);
  });

  it("divide exato quando possível", () => {
    expect(splitInstallmentAmounts(120, 4)).toEqual([30, 30, 30, 30]);
  });

  it("a soma das parcelas sempre bate com o total em centavos", () => {
    for (const [total, count] of [[0.1, 3], [999.99, 7], [1234.56, 12], [10, 120]] as const) {
      const cents = splitInstallmentAmounts(total, count).reduce((s, a) => s + Math.round(a * 100), 0);
      expect(cents).toBe(Math.round(total * 100));
    }
  });
});
