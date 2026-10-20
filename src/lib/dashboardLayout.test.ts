import { describe, it, expect } from "vitest";
import {
  defaultLayout,
  parseLayout,
  formatLayout,
  isDefaultLayout,
  visibleBlocks,
  moveBlock,
  setBlockSpan,
  setBlockHidden,
  spanFromPointer,
  clampSpan,
} from "./dashboardLayout";

describe("parseLayout / formatLayout", () => {
  it("sem cookie usa o layout padrão", () => {
    expect(parseLayout(undefined)).toEqual(defaultLayout());
    expect(isDefaultLayout(parseLayout(undefined))).toBe(true);
  });

  it("ida e volta preserva ordem, larguras e escondidos", () => {
    let layout = setBlockSpan(defaultLayout(), "metas", 8);
    layout = moveBlock(layout, "metas", -1);
    layout = setBlockHidden(layout, "dividas", true);
    expect(parseLayout(formatLayout(layout))).toEqual(layout);
    expect(isDefaultLayout(layout)).toBe(false);
  });

  it("ignora blocos desconhecidos, repetidos, valores fora de 3..12 e lixo, mantendo o resto", () => {
    const layout = parseLayout("saldo:6,xyz:4,metas:2,recentes:13,categorias:abc,dividas:8,saldo:9");
    expect(layout.spans).toEqual({ ...defaultLayout().spans, saldo: 6, dividas: 8 });
  });

  it("cookie antigo (só larguras) mantém a ordem padrão e encaixa os blocos novos no lugar", () => {
    const old = "saldo:6,patrimonio:6,dividas:12,categorias:4,parceladas:4,metas:4,recentes:4";
    const layout = parseLayout(old);
    expect(layout.order).toEqual(defaultLayout().order);
    expect(layout.hidden).toEqual([]);
    expect(layout.spans.saldo).toBe(6);
  });

  it("bloco ausente entra logo depois do que o antecede na ordem padrão", () => {
    const layout = parseLayout("recentes:4,saldo:5,kpis:12");
    expect(layout.order.slice(0, 5)).toEqual(["recentes", "saldo", "patrimonio", "dividas", "categorias"]);
    expect(layout.order).toHaveLength(defaultLayout().order.length);
  });
});

describe("moveBlock", () => {
  it("troca com o vizinho visível, pulando os escondidos", () => {
    const layout = setBlockHidden(defaultLayout(), "patrimonio", true);
    const moved = moveBlock(layout, "dividas", -1);
    expect(visibleBlocks(moved).slice(0, 3)).toEqual(["kpis", "dividas", "saldo"]);
  });

  it("não sai das pontas", () => {
    const layout = defaultLayout();
    expect(moveBlock(layout, "kpis", -1)).toBe(layout);
    expect(moveBlock(layout, "recentes", 1)).toBe(layout);
  });
});

describe("setBlockHidden", () => {
  it("esconde e mostra sem duplicar", () => {
    let layout = setBlockHidden(defaultLayout(), "metas", true);
    layout = setBlockHidden(layout, "metas", true);
    expect(layout.hidden).toEqual(["metas"]);
    expect(visibleBlocks(layout)).not.toContain("metas");
    expect(setBlockHidden(layout, "metas", false).hidden).toEqual([]);
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
