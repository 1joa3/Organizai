/**
 * Período selecionado no Dashboard e em Transações.
 *
 * Fica na URL (`?period=...`) e num cookie, para que navegar entre as abas
 * mantenha o último período escolhido. Formatos:
 *   "2026-10"                  mês
 *   "last-3" | "last-6" | "last-12"   últimos N meses, incluindo o atual (relativo a hoje)
 *   "2026"                     ano inteiro
 *   "2026-07-01_2026-10-13"    intervalo personalizado, datas inclusivas
 */
export const PERIOD_COOKIE = "lc_period";

export const LAST_MONTHS_OPTIONS = [3, 6, 12] as const;
export type LastMonths = (typeof LAST_MONTHS_OPTIONS)[number];

export type Period =
  | { kind: "month"; year: number; month: number }
  | { kind: "last"; months: LastMonths }
  | { kind: "year"; year: number }
  | { kind: "custom"; from: string; to: string };

export interface DateRange {
  start: Date; // inclusivo
  end: Date; // exclusivo
}

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-13" → Date local à meia-noite; null se inválida. */
export function parseISODate(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (date.getMonth() !== Number(m[2]) - 1 || date.getDate() !== Number(m[3])) return null;
  return date;
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function currentMonthPeriod(now = new Date()): Period {
  return { kind: "month", year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function parsePeriod(value: string | undefined | null): Period | null {
  if (!value) return null;

  let m = value.match(/^(\d{4})-(\d{1,2})$/);
  if (m) {
    const month = Number(m[2]);
    return month >= 1 && month <= 12 ? { kind: "month", year: Number(m[1]), month } : null;
  }

  m = value.match(/^last-(\d+)$/);
  if (m) {
    const months = Number(m[1]) as LastMonths;
    return LAST_MONTHS_OPTIONS.includes(months) ? { kind: "last", months } : null;
  }

  if (/^\d{4}$/.test(value)) return { kind: "year", year: Number(value) };

  m = value.match(/^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/);
  if (m) {
    const from = parseISODate(m[1]);
    const to = parseISODate(m[2]);
    return from && to && from <= to ? { kind: "custom", from: m[1], to: m[2] } : null;
  }

  return null;
}

export function formatPeriod(period: Period): string {
  switch (period.kind) {
    case "month":
      return `${period.year}-${pad(period.month)}`;
    case "last":
      return `last-${period.months}`;
    case "year":
      return String(period.year);
    case "custom":
      return `${period.from}_${period.to}`;
  }
}

/**
 * Período da página: `?period=` na URL, depois o formato antigo
 * `?month=&year=`, depois o cookie e, por fim, o mês atual.
 */
export function resolvePeriod(
  params: { period?: string; month?: string; year?: string },
  cookieValue: string | undefined,
  now = new Date()
): Period {
  const fromUrl = parsePeriod(params.period);
  if (fromUrl) return fromUrl;
  if (params.month && params.year) {
    const legacy = parsePeriod(`${params.year}-${params.month}`);
    if (legacy) return legacy;
  }
  return parsePeriod(cookieValue) ?? currentMonthPeriod(now);
}

export function periodRange(period: Period, now = new Date()): DateRange {
  switch (period.kind) {
    case "month":
      return {
        start: new Date(period.year, period.month - 1, 1),
        end: new Date(period.year, period.month, 1),
      };
    case "last":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - (period.months - 1), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      };
    case "year":
      return { start: new Date(period.year, 0, 1), end: new Date(period.year + 1, 0, 1) };
    case "custom": {
      const start = parseISODate(period.from)!;
      const to = parseISODate(period.to)!;
      return { start, end: new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1) };
    }
  }
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function periodLabel(period: Period): string {
  switch (period.kind) {
    case "month":
      return `${MONTH_NAMES[period.month - 1]} de ${period.year}`;
    case "last":
      return `Últimos ${period.months} meses`;
    case "year":
      return `Ano de ${period.year}`;
    case "custom":
      return `${formatShortDate(parseISODate(period.from)!)} – ${formatShortDate(parseISODate(period.to)!)}`;
  }
}

/**
 * Período vizinho para as setas ‹ ›: mês anterior/seguinte ou ano
 * anterior/seguinte. Períodos relativos e personalizados não têm vizinho.
 */
export function shiftPeriod(period: Period, delta: number): Period | null {
  switch (period.kind) {
    case "month": {
      const date = new Date(period.year, period.month - 1 + delta, 1);
      return { kind: "month", year: date.getFullYear(), month: date.getMonth() + 1 };
    }
    case "year":
      return { kind: "year", year: period.year + delta };
    default:
      return null;
  }
}

/** Salva o período no cookie (só no navegador). */
export function savePeriodCookie(period: Period) {
  document.cookie = `${PERIOD_COOKIE}=${formatPeriod(period)}; path=/; max-age=31536000; samesite=lax`;
}

export function isSamePeriod(a: Period, b: Period): boolean {
  return formatPeriod(a) === formatPeriod(b);
}

/**
 * Intervalo imediatamente anterior, do mesmo tamanho, para comparar
 * (outubro → setembro, últimos 3 meses → os 3 antes deles). Intervalos que
 * começam e terminam no dia 1 andam em meses; os demais, em dias.
 */
export function previousRange({ start, end }: DateRange): DateRange {
  if (start.getDate() === 1 && end.getDate() === 1) {
    const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
    return { start: new Date(start.getFullYear(), start.getMonth() - months, 1), end: start };
  }
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return { start: new Date(start.getFullYear(), start.getMonth(), start.getDate() - days), end: start };
}
