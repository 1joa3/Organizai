import { describe, it, expect } from "vitest";
import { createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  it("bloqueia após o máximo de falhas e libera quando a janela expira", () => {
    const limiter = createRateLimiter(3, 1000);
    for (let i = 0; i < 3; i++) {
      expect(limiter.isBlocked("ip", 0)).toBe(false);
      limiter.registerFailure("ip", 0);
    }
    expect(limiter.isBlocked("ip", 0)).toBe(true);
    expect(limiter.isBlocked("ip", 1000)).toBe(false);
  });

  it("conta cada chave separadamente e zera no reset", () => {
    const limiter = createRateLimiter(1, 1000);
    limiter.registerFailure("a", 0);
    expect(limiter.isBlocked("a", 0)).toBe(true);
    expect(limiter.isBlocked("b", 0)).toBe(false);
    limiter.reset("a");
    expect(limiter.isBlocked("a", 0)).toBe(false);
  });
});
