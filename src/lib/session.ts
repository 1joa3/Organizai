import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "session-token";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Compara dois segredos em tempo constante. Os dois lados passam por SHA-256
 * antes, então o tamanho do valor esperado também não vaza pelo tempo.
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function sign(issuedAt: number, secret: string): string {
  return createHmac("sha256", secret).update(`session:${issuedAt}`).digest("base64url");
}

/**
 * Valor do cookie de sessão: `<emitidoEm>.<hmac>`. O cookie nunca carrega o
 * AUTH_TOKEN em si, e trocar o AUTH_TOKEN invalida todas as sessões.
 */
export function createSessionValue(secret: string, now = Date.now()): string {
  return `${now}.${sign(now, secret)}`;
}

export function verifySessionValue(value: string, secret: string, now = Date.now()): boolean {
  const [issuedAtStr, signature] = value.split(".");
  const issuedAt = Number(issuedAtStr);
  if (!signature || !Number.isInteger(issuedAt)) return false;
  if (issuedAt > now || now - issuedAt > SESSION_MAX_AGE_SECONDS * 1000) return false;
  return safeEqual(signature, sign(issuedAt, secret));
}
