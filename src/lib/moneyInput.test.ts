import { describe, expect, it } from "vitest";
import { moneyDisplay, moneyFromTyping, moneyValue } from "./moneyInput";

describe("moneyFromTyping", () => {
  it("dígitos entram pelos centavos", () => {
    expect(moneyFromTyping("1")).toBe("0.01");
    expect(moneyFromTyping("12")).toBe("0.12");
    expect(moneyFromTyping("123456")).toBe("1234.56");
  });

  it("ignora a formatação já exibida e zeros à esquerda", () => {
    expect(moneyFromTyping("1.234,567")).toBe("12345.67"); // digitou 7 depois de 1.234,56
    expect(moneyFromTyping("1.234,5")).toBe("123.45"); // apagou o último dígito
    expect(moneyFromTyping("0,005")).toBe("0.05");
    expect(moneyFromTyping("R$ 50,00")).toBe("50.00");
  });

  it("vazio e só zeros viram vazio", () => {
    expect(moneyFromTyping("")).toBe("");
    expect(moneyFromTyping("0,00")).toBe("");
    expect(moneyFromTyping("abc")).toBe("");
  });

  it("não passa do máximo", () => {
    expect(moneyFromTyping("999999999999999")).toBe("999999999.99");
  });
});

describe("moneyDisplay / moneyValue", () => {
  it("formata em reais sem o símbolo", () => {
    expect(moneyDisplay("1234.56")).toBe("1.234,56");
    expect(moneyDisplay(1200)).toBe("1.200,00");
    expect(moneyDisplay("")).toBe("");
    expect(moneyDisplay(0)).toBe("");
  });

  it("valor do banco vira o formato do formulário", () => {
    expect(moneyValue(1200)).toBe("1200.00");
    expect(moneyValue(19.9)).toBe("19.90");
    expect(moneyValue(null)).toBe("");
    expect(moneyValue(0)).toBe("");
  });
});
