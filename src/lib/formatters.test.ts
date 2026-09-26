import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateShort,
  formatMonthYear,
  calcPercent,
  formatReturn,
} from "./formatters";

describe("formatCurrency", () => {
  it("formata número positivo em BRL", () => {
    expect(formatCurrency(1234.56)).toBe("R$ 1.234,56");
  });

  it("formata string numérica", () => {
    expect(formatCurrency("1234.56")).toBe("R$ 1.234,56");
  });

  it("formata valor negativo", () => {
    expect(formatCurrency(-50)).toBe("-R$ 50,00");
  });

  it("formata zero", () => {
    expect(formatCurrency(0)).toBe("R$ 0,00");
  });
});

describe("formatNumber", () => {
  it("formata sem símbolo de moeda", () => {
    expect(formatNumber(1234.5)).toBe("1.234,50");
  });
});

describe("formatDate", () => {
  it("formata data ISO por extenso curto", () => {
    expect(formatDate("2024-03-15T00:00:00")).toBe("15 de mar. de 2024");
  });
});

describe("formatDateShort", () => {
  it("formata dia/mês sem ano", () => {
    expect(formatDateShort("2024-03-15T00:00:00")).toBe("15/03");
  });
});

describe("formatMonthYear", () => {
  it("formata mês por extenso e ano", () => {
    expect(formatMonthYear("2024-03-15T00:00:00")).toBe("março de 2024");
  });
});

describe("calcPercent", () => {
  it("calcula percentual normal", () => {
    expect(calcPercent(750, 1000)).toBe(75);
  });

  it("nunca ultrapassa 100", () => {
    expect(calcPercent(1500, 1000)).toBe(100);
  });

  it("retorna 0 quando o alvo é 0 (evita divisão por zero)", () => {
    expect(calcPercent(100, 0)).toBe(0);
  });

  it("arredonda o resultado", () => {
    expect(calcPercent(1, 3)).toBe(33);
  });
});

describe("formatReturn", () => {
  it("formata retorno positivo com sinal", () => {
    expect(formatReturn(0.1234)).toBe("+12,34%");
  });

  it("formata retorno negativo", () => {
    expect(formatReturn(-0.05)).toBe("-5,00%");
  });

  it("formata retorno zero com sinal positivo", () => {
    expect(formatReturn(0)).toBe("+0,00%");
  });
});
