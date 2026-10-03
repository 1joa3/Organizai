/**
 * Mês/ano selecionados no PeriodSelector são salvos num cookie para que
 * navegar entre as abas (Dashboard/Transações) mantenha o último período
 * escolhido, em vez de voltar para o mês atual a cada navegação sem
 * query string.
 */
export const PERIOD_COOKIE = "lc_period";

export function formatPeriodCookie(month: number, year: number): string {
  return `${year}-${month}`;
}

export function parsePeriodCookie(value: string | undefined): { month: number; year: number } | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { month, year };
}
