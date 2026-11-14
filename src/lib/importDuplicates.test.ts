import { describe, it, expect } from "vitest";
import { descriptionsSimilar, findDuplicates, normalizeDescription, type ExistingTransaction } from "./importDuplicates";

const day = (d: number, m = 11) => new Date(Date.UTC(2026, m - 1, d, 12));
let seq = 0;
const tx = (description: string, amount: number, date: Date, type = "despesa"): ExistingTransaction => ({
  id: `t${++seq}`,
  description,
  amount,
  date,
  type,
});
const row = (description: string, amount: number, date: Date, type = "despesa") => ({ description, amount, date, type });

describe("normalizeDescription", () => {
  it("ignora acentos, maiúsculas e pontuação", () => {
    expect(normalizeDescription("  PADARIA São João - LTDA. ")).toBe("padaria sao joao ltda");
  });
});

describe("descriptionsSimilar", () => {
  it("reconhece um nome curto contido no nome da fatura", () => {
    expect(descriptionsSimilar("Mercado", "SUPERMERCADO XYZ LTDA")).toBe(true);
  });

  it("reconhece palavras em comum", () => {
    expect(descriptionsSimilar("Uber viagem", "UBER *TRIP HELP.UBER.COM")).toBe(true);
  });

  it("não confunde lojas diferentes", () => {
    expect(descriptionsSimilar("Netflix", "Spotify")).toBe(false);
  });

  it("parcelas só batem com a mesma parcela", () => {
    expect(descriptionsSimilar("Magazine (2/6)", "MAGAZINE - Parcela 2/6")).toBe(true);
    expect(descriptionsSimilar("Magazine (2/6)", "MAGAZINE - Parcela 3/6")).toBe(false);
  });
});

describe("findDuplicates", () => {
  it("marca a cópia exata", () => {
    const e = tx("Padaria", 12.5, day(3));
    const [m] = findDuplicates([row("Padaria", 12.5, day(3))], [e]);
    expect(m).toEqual({ kind: "exact", existing: e });
  });

  it("acha a transação lançada à mão com outro nome e dia próximo", () => {
    const e = tx("Mercado", 230.4, day(3));
    const [m] = findDuplicates([row("SUPERMERCADO XYZ", 230.4, day(4))], [e]);
    expect(m?.kind).toBe("probable");
  });

  it("mesmo dia e valor com outro nome é só uma possível duplicata", () => {
    const [m] = findDuplicates([row("RESTAURANTE ABC", 58, day(3))], [tx("Almoço", 58, day(3))]);
    expect(m?.kind).toBe("possible");
  });

  it("ignora valor diferente, tipo diferente ou mais de 2 dias", () => {
    const existing = [tx("Mercado", 100, day(3)), tx("Mercado", 50, day(3), "receita"), tx("Mercado", 50, day(10))];
    expect(findDuplicates([row("Mercado", 50, day(3))], existing)).toEqual([null]);
  });

  it("cada transação existente só absorve uma linha", () => {
    // dois cafés iguais no arquivo, só um já cadastrado
    const result = findDuplicates([row("Café", 8, day(5)), row("Café", 8, day(5))], [tx("Café", 8, day(5))]);
    expect(result.map((m) => m?.kind ?? null)).toEqual(["exact", null]);
  });

  it("prioriza a exata antes de gastar a transação numa provável", () => {
    const exactOne = tx("Padaria Pão Bom", 20, day(5));
    const result = findDuplicates([row("Padaria", 20, day(4)), row("Padaria Pão Bom", 20, day(5))], [exactOne]);
    expect(result[1]).toEqual({ kind: "exact", existing: exactOne });
    expect(result[0]).toBeNull();
  });

  it("pula linhas inválidas", () => {
    expect(findDuplicates([null], [tx("X", 1, day(1))])).toEqual([null]);
  });
});
