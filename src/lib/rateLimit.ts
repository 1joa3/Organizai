/**
 * Limite de tentativas de login por chave (IP), em memória. Em ambiente
 * serverless cada instância tem o próprio contador, então é uma barreira
 * contra força bruta simples, não uma garantia absoluta.
 */
export function createRateLimiter(maxAttempts: number, windowMs: number) {
  const failures = new Map<string, { count: number; resetAt: number }>();

  return {
    isBlocked(key: string, now = Date.now()): boolean {
      const entry = failures.get(key);
      if (!entry || entry.resetAt <= now) return false;
      return entry.count >= maxAttempts;
    },
    registerFailure(key: string, now = Date.now()): void {
      const entry = failures.get(key);
      if (!entry || entry.resetAt <= now) {
        failures.set(key, { count: 1, resetAt: now + windowMs });
      } else {
        entry.count++;
      }
    },
    reset(key: string): void {
      failures.delete(key);
    },
  };
}
