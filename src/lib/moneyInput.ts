/**
 * Campo de dinheiro que formata enquanto digita, como nos apps de banco:
 * os dígitos entram pela direita, nos centavos ("1", "12", "123" →
 * 0,01 · 0,12 · 1,23). O valor "de verdade" fica no formato que as server
 * actions esperam: "1234.56", ou "" quando vazio.
 */

/** Até 999.999.999,99 — o máximo que a validação aceita */
const MAX_DIGITS = 11;

/** Texto digitado (com pontos, vírgula, "R$"...) → valor "1234.56" ou "" */
export function moneyFromTyping(text: string): string {
  const digits = text.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DIGITS);
  if (!digits) return "";
  return (Number(digits) / 100).toFixed(2);
}

/** Valor ("1234.56", 1234.56) → "1.234,56"; vazio ou inválido → "" */
export function moneyDisplay(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/** Valor inicial vindo do banco (número) → "1234.56" ou "" */
export function moneyValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : "";
}
