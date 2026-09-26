import { describe, it, expect } from "vitest";
import { transactionsToCSV } from "./csv";

describe("transactionsToCSV", () => {
  it("gera cabeçalho e linhas separadas por ponto e vírgula", () => {
    const csv = transactionsToCSV([
      {
        date: "2024-03-15T00:00:00",
        description: "Mercado",
        category: { name: "Alimentação" },
        account: { name: "Nubank" },
        type: "despesa",
        amount: 123.45,
      },
    ]);

    const lines = csv.split("\n");
    expect(lines[0]).toBe("Data;Descrição;Categoria;Conta;Tipo;Valor");
    expect(lines[1]).toBe("2024-03-15;Mercado;Alimentação;Nubank;despesa;123,45");
  });

  it("escapa campos com ponto e vírgula ou aspas", () => {
    const csv = transactionsToCSV([
      {
        date: "2024-03-15T00:00:00",
        description: 'Compra "especial"; parcelada',
        category: { name: "Outros" },
        account: { name: "Carteira" },
        type: "despesa",
        amount: 10,
      },
    ]);

    const lines = csv.split("\n");
    expect(lines[1]).toContain('"Compra ""especial""; parcelada"');
  });

  it("retorna apenas o cabeçalho quando não há transações", () => {
    const csv = transactionsToCSV([]);
    expect(csv).toBe("Data;Descrição;Categoria;Conta;Tipo;Valor");
  });
});
