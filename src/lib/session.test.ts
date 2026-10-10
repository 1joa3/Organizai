import { describe, it, expect } from "vitest";
import { createSessionValue, verifySessionValue, safeEqual, SESSION_MAX_AGE_SECONDS } from "./session";

const SECRET = "segredo-de-teste";

describe("safeEqual", () => {
  it("compara strings iguais e diferentes, inclusive de tamanhos diferentes", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("sessão assinada", () => {
  const now = 1_800_000_000_000;

  it("aceita uma sessão recém-criada", () => {
    expect(verifySessionValue(createSessionValue(SECRET, now), SECRET, now)).toBe(true);
  });

  it("não carrega o segredo no valor do cookie", () => {
    expect(createSessionValue(SECRET, now)).not.toContain(SECRET);
  });

  it("rejeita sessão assinada com outro segredo (AUTH_TOKEN trocado)", () => {
    expect(verifySessionValue(createSessionValue("outro", now), SECRET, now)).toBe(false);
  });

  it("rejeita assinatura adulterada ou data alterada", () => {
    const [issuedAt, sig] = createSessionValue(SECRET, now).split(".");
    expect(verifySessionValue(`${issuedAt}.${sig}x`, SECRET, now)).toBe(false);
    expect(verifySessionValue(`${Number(issuedAt) + 1}.${sig}`, SECRET, now)).toBe(false);
  });

  it("rejeita sessão expirada ou com data no futuro", () => {
    const value = createSessionValue(SECRET, now);
    expect(verifySessionValue(value, SECRET, now + SESSION_MAX_AGE_SECONDS * 1000 + 1)).toBe(false);
    expect(verifySessionValue(value, SECRET, now - 1)).toBe(false);
  });

  it("rejeita o formato antigo (cookie com o token puro) e lixo", () => {
    expect(verifySessionValue(SECRET, SECRET, now)).toBe(false);
    expect(verifySessionValue("", SECRET, now)).toBe(false);
    expect(verifySessionValue("abc.def", SECRET, now)).toBe(false);
  });
});
