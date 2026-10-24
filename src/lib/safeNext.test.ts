import { describe, it, expect } from "vitest";
import { safeNext } from "./safeNext";

describe("safeNext", () => {
  it("mantém caminhos internos", () => {
    expect(safeNext("/")).toBe("/");
    expect(safeNext("/nova-senha")).toBe("/nova-senha");
    expect(safeNext("/transacoes?period=2026-10#topo")).toBe("/transacoes?period=2026-10#topo");
  });

  it("rejeita URLs absolutas e protocol-relative", () => {
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
  });

  it("rejeita truques com barra invertida e caracteres ignorados pelo navegador", () => {
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("/\\/evil.com")).toBe("/");
    expect(safeNext("/\t/evil.com")).toBe("/");
    expect(safeNext("/\n/evil.com")).toBe("/");
  });

  it("rejeita valores ausentes ou que não são texto", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext("")).toBe("/");
    expect(safeNext(new Blob())).toBe("/");
  });
});
