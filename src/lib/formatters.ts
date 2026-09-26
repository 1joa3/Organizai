/**
 * Formata valor em Real brasileiro (BRL)
 * Ex: formatCurrency(1234.56) → "R$ 1.234,56"
 */
export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

/**
 * Formata valor sem o símbolo da moeda
 * Ex: formatNumber(1234.56) → "1.234,56"
 */
export function formatNumber(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formata data para exibição
 * Ex: formatDate("2024-03-15") → "15 mar 2024"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Formata data compacta (dia/mês), sem o ano
 * Ex: formatDateShort("2024-03-15") → "15/03"
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

/**
 * Formata data para input[type="date"]
 * Ex: formatDateInput(new Date()) → "2024-03-15"
 */
export function formatDateInput(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

/**
 * Formata data com mês/ano
 * Ex: formatMonthYear("2024-03-15") → "Março 2024"
 */
export function formatMonthYear(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Calcula percentual
 * Ex: calcPercent(750, 1000) → 75
 */
export function calcPercent(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

/**
 * Formata percentual de retorno
 * Ex: formatReturn(0.1234) → "+12,34%"
 */
export function formatReturn(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2).replace(".", ",")}%`;
}
