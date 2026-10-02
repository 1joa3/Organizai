import { describe, it, expect } from "vitest";
import { parseCSV, coerceDate, coerceAmount, guessColumn } from "./csvImport";

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
