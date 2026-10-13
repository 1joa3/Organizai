import { describe, it, expect } from "vitest";
import {
  defaultLayout,
  parseLayout,
  formatLayout,
  isDefaultLayout,
  spanFromPointer,
  clampSpan,
} from "./dashboardLayout";

describe("parseLayout / formatLayout", () => {
  it("sem cookie usa o layout padrão", () => {
    expect(parseLayout(undefined)).toEqual(defaultLayout());
    expect(isDefaultLayout(parseLayout(undefined))).toBe(true);
  });

  it("ida e volta preserva as larguras", () => {
    const layout = { ...defaultLayout(), saldo: 6, patrimonio: 6, metas: 8 };
    expect(parseLayout(formatLayout(layout))).toEqual(layout);
    expect(isDefaultLayout(layout)).toBe(false);
  });

  it("ignora blocos desconhecidos, valores fora de 3..12 e lixo, mantendo o resto", () => {
    const layout = parseLayout("saldo:6,xyz:4,metas:2,recentes:13,categorias:abc,dividas:8");
    expect(layout).toEqual({ ...defaultLayout(), saldo: 6, dividas: 8 });
  });
});

describe("spanFromPointer", () => {
  // grid de 1200px com gap de 24px → coluna de 78px, passo de 102px
  const grid = { width: 1200, gap: 24 };

  it("arredonda para a coluna mais próxima", () => {
    expect(spanFromPointer(0 + 4 * 102 - 24, 0, grid.width, grid.gap)).toBe(4);
    expect(spanFromPointer(0 + 6 * 102 - 24 + 40, 0, grid.width, grid.gap)).toBe(6);
    expect(spanFromPointer(0 + 6 * 102 - 24 + 60, 0, grid.width, grid.gap)).toBe(7);
  });

  it("considera onde o bloco começa", () => {
    expect(spanFromPointer(600 + 3 * 102 - 24, 600, grid.width, grid.gap)).toBe(3);
  });

  it("limita entre 3 e 12 colunas", () => {
    expect(spanFromPointer(10, 0, grid.width, grid.gap)).toBe(3);
    expect(spanFromPointer(5000, 0, grid.width, grid.gap)).toBe(12);
    expect(clampSpan(7.4)).toBe(7);
  });
});
