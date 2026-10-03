import { describe, it, expect } from "vitest";
import { parseInstallmentDescription, escapeRegExp } from "./installments";

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
