/**
 * Só aceita caminhos internos em `next` (evita redirecionar para outro site).
 * Resolve o valor como o navegador faria — que trata `\` como `/` e ignora
 * tabs e quebras de linha — e confere que continua no mesmo site. Assim
 * "/\evil.com" ou "/\t/evil.com" não viram "//evil.com".
 * Ex: safeNext("/metas?x=1") → "/metas?x=1"; safeNext("/\\evil.com") → "/"
 */
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  const base = "http://organizai.invalid";
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
