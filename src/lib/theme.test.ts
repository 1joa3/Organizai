import { describe, expect, it } from "vitest";
import { coverRadius, parseThemeCookie } from "./theme";

describe("coverRadius", () => {
  it("alcança o canto mais distante a partir do ponto", () => {
    // Canto superior esquerdo: o mais distante é o inferior direito
    expect(coverRadius({ x: 0, y: 0 }, 300, 400)).toBe(500);
    // Do centro, metade da diagonal
    expect(coverRadius({ x: 150, y: 200 }, 300, 400)).toBe(250);
    // Perto da direita, o canto da esquerda manda
    expect(coverRadius({ x: 300, y: 400 }, 300, 400)).toBe(500);
  });
});

describe("parseThemeCookie", () => {
  it("só aceita claro ou escuro", () => {
    expect(parseThemeCookie("light")).toBe("light");
    expect(parseThemeCookie("dark")).toBe("dark");
    expect(parseThemeCookie("blue")).toBeNull();
    expect(parseThemeCookie(undefined)).toBeNull();
  });
});
