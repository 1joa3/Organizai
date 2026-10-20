/**
 * Cálculos da página de gastos por categoria. Funções puras: recebem as
 * despesas já buscadas no banco, para dar para testar sem banco.
 */

export interface ExpenseLike {
  amount: number;
  date: Date;
  categoryId: string;
  category: { name: string; color: string };
}

export interface CategoryRow {
  categoryId: string;
  name: string;
  color: string;
  total: number;
  count: number;
  /** Valor médio por transação */
  average: number;
  /** Fatia do total do período, de 0 a 1 */
  share: number;
  previousTotal: number;
  /** Variação contra o período anterior (0.25 = +25%); null se antes não houve gasto */
  change: number | null;
}

/**
 * Uma linha por categoria com gasto no período atual ou no anterior —
 * categorias que zeraram também aparecem, com total 0. Ordem: maior gasto
 * primeiro; empates (inclusive as zeradas) pelo gasto anterior.
 */
export function summarizeByCategory(current: ExpenseLike[], previous: ExpenseLike[]): CategoryRow[] {
  const rows = new Map<string, CategoryRow>();

  function row(t: ExpenseLike) {
    let r = rows.get(t.categoryId);
    if (!r) {
      r = { categoryId: t.categoryId, name: t.category.name, color: t.category.color, total: 0, count: 0, average: 0, share: 0, previousTotal: 0, change: null };
      rows.set(t.categoryId, r);
    }
    return r;
  }

  current.forEach((t) => {
    const r = row(t);
    r.total += t.amount;
    r.count += 1;
  });
  previous.forEach((t) => {
    row(t).previousTotal += t.amount;
  });

  const grandTotal = current.reduce((sum, t) => sum + t.amount, 0);

  return Array.from(rows.values())
    .map((r) => ({
      ...r,
      average: r.count > 0 ? r.total / r.count : 0,
      share: grandTotal > 0 ? r.total / grandTotal : 0,
      change: r.previousTotal > 0 ? (r.total - r.previousTotal) / r.previousTotal : null,
    }))
    .sort((a, b) => b.total - a.total || b.previousTotal - a.previousTotal);
}

/** Quantos meses de calendário um intervalo toca (fim exclusivo). */
export function monthsSpanned(start: Date, end: Date): number {
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
  return (last.getFullYear() - start.getFullYear()) * 12 + last.getMonth() - start.getMonth() + 1;
}

export interface MonthlyTrend {
  /** Primeiro dia de cada mês, do mais antigo ao mais recente */
  months: Date[];
  series: { categoryId: string; name: string; color: string; values: number[] }[];
}

/**
 * Gasto de cada categoria mês a mês, nos `count` meses que terminam no mês
 * de `lastMonth`. Transações fora da janela são ignoradas. Séries na ordem
 * do gasto total na janela, maior primeiro.
 */
export function buildMonthlyTrend(transactions: ExpenseLike[], lastMonth: Date, count: number): MonthlyTrend {
  const months = Array.from(
    { length: count },
    (_, i) => new Date(lastMonth.getFullYear(), lastMonth.getMonth() - (count - 1) + i, 1)
  );
  const first = months[0];
  const series = new Map<string, MonthlyTrend["series"][number]>();

  transactions.forEach((t) => {
    const index = (t.date.getFullYear() - first.getFullYear()) * 12 + t.date.getMonth() - first.getMonth();
    if (index < 0 || index >= count) return;
    let s = series.get(t.categoryId);
    if (!s) {
      s = { categoryId: t.categoryId, name: t.category.name, color: t.category.color, values: Array(count).fill(0) };
      series.set(t.categoryId, s);
    }
    s.values[index] += t.amount;
  });

  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
  return { months, series: Array.from(series.values()).sort((a, b) => sum(b.values) - sum(a.values)) };
}
