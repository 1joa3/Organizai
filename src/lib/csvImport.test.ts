import { describe, it, expect } from "vitest";
import { parseCSV, coerceDate, coerceAmount, guessColumn, expandInstallmentRow } from "./csvImport";

describe("parseCSV", () => {
  it("separa por vírgula quando é o delimitador predominante", () => {
    const { headers, rows } = parseCSV("date,title,amount\n2024-03-15,Mercado,123.45");
    expect(headers).toEqual(["date", "title", "amount"]);
    expect(rows).toEqual([["2024-03-15", "Mercado", "123.45"]]);
  });

  it("detecta ; como delimitador (formato comum de banco brasileiro)", () => {
    const { headers, rows } = parseCSV("Data;Descrição;Valor\n15/03/2024;Supermercado;123,45");
    expect(headers).toEqual(["Data", "Descrição", "Valor"]);
    expect(rows).toEqual([["15/03/2024", "Supermercado", "123,45"]]);
  });

  it("lida com campos entre aspas contendo o delimitador", () => {
    const { rows } = parseCSV('Data,Descrição,Valor\n15/03/2024,"Compra, parcelada",100');
    expect(rows).toEqual([["15/03/2024", "Compra, parcelada", "100"]]);
  });

  it("remove o BOM do início do arquivo", () => {
    const { headers } = parseCSV("﻿Data,Valor\n15/03/2024,10");
    expect(headers[0]).toBe("Data");
  });

  it("ignora linhas em branco", () => {
    const { rows } = parseCSV("Data,Valor\n15/03/2024,10\n\n16/03/2024,20");
    expect(rows).toHaveLength(2);
  });
});

describe("coerceDate", () => {
  it("entende dd/mm/yyyy", () => {
    const d = coerceDate("15/03/2024");
    expect(d?.getFullYear()).toBe(2024);
    expect(d?.getMonth()).toBe(2);
    expect(d?.getDate()).toBe(15);
  });

  it("entende yyyy-mm-dd", () => {
    const d = coerceDate("2024-03-15");
    expect(d?.getFullYear()).toBe(2024);
    expect(d?.getMonth()).toBe(2);
    expect(d?.getDate()).toBe(15);
  });

  it("retorna null para texto inválido", () => {
    expect(coerceDate("não é uma data")).toBeNull();
  });

  it("retorna null para string vazia", () => {
    expect(coerceDate("  ")).toBeNull();
  });
});

describe("coerceAmount", () => {
  it("entende formato brasileiro com separador de milhar", () => {
    expect(coerceAmount("R$ 1.234,56")).toBeCloseTo(1234.56);
  });

  it("entende formato internacional", () => {
    expect(coerceAmount("1234.56")).toBeCloseTo(1234.56);
  });

  it("entende negativo com parênteses", () => {
    expect(coerceAmount("(123,45)")).toBeCloseTo(-123.45);
  });

  it("entende sinal de menos", () => {
    expect(coerceAmount("-45,90")).toBeCloseTo(-45.9);
  });

  it("retorna null para texto não numérico", () => {
    expect(coerceAmount("abc")).toBeNull();
  });
});

describe("guessColumn", () => {
  it("encontra a coluna de data ignorando acentos e maiúsculas", () => {
    expect(guessColumn(["Data", "Descrição", "Valor"], ["data", "date"])).toBe(0);
  });

  it("encontra a coluna de valor", () => {
    expect(guessColumn(["Data", "Descrição", "Valor"], ["valor", "amount"])).toBe(2);
  });

  it("retorna -1 quando nenhuma coluna combina", () => {
    expect(guessColumn(["A", "B"], ["xyz"])).toBe(-1);
  });
});

describe("expandInstallmentRow", () => {
  it('detecta "Nome - Parcela X/Y" e expande da parcela atual até a última', () => {
    const result = expandInstallmentRow({
      date: new Date(2024, 2, 15), // 15/03/2024
      description: "Loja XYZ - Parcela 2/6",
      amount: 100,
      type: "despesa",
    });

    expect(result).toHaveLength(5); // 2,3,4,5,6
    expect(result.map((r) => r.description)).toEqual([
      "Loja XYZ (2/6)",
      "Loja XYZ (3/6)",
      "Loja XYZ (4/6)",
      "Loja XYZ (5/6)",
      "Loja XYZ (6/6)",
    ]);
    expect(result[0].date).toEqual(new Date(2024, 2, 15));
    expect(result[1].date).toEqual(new Date(2024, 3, 15));
    expect(result[4].date).toEqual(new Date(2024, 6, 15));
    expect(result.every((r) => r.amount === 100 && r.type === "despesa")).toBe(true);
  });

  it('detecta o formato "Nome (X/Y)" sem a palavra parcela', () => {
    const result = expandInstallmentRow({
      date: new Date(2024, 0, 1),
      description: "Notebook (1/3)",
      amount: 500,
      type: "despesa",
    });
    expect(result.map((r) => r.description)).toEqual(["Notebook (1/3)", "Notebook (2/3)", "Notebook (3/3)"]);
  });

  it("é case-insensitive para a palavra Parcela e tolera espaços ao redor da barra", () => {
    const result = expandInstallmentRow({
      date: new Date(2024, 0, 1),
      description: "Mercado - PARCELA 1 / 2",
      amount: 50,
      type: "despesa",
    });
    expect(result).toHaveLength(2);
    expect(result[0].description).toBe("Mercado (1/2)");
  });

  it("retorna a linha original sem alterações quando não é parcelada", () => {
    const row = { date: new Date(2024, 0, 1), description: "Supermercado", amount: 80, type: "despesa" as const };
    expect(expandInstallmentRow(row)).toEqual([row]);
  });

  it("não expande quando a parcela atual é maior que o total (dado inconsistente)", () => {
    const row = { date: new Date(2024, 0, 1), description: "Erro - Parcela 5/3", amount: 10, type: "despesa" as const };
    expect(expandInstallmentRow(row)).toEqual([row]);
  });
});
