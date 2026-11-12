/**
 * Orçamento por categoria: cada categoria de despesa pode ter um limite
 * mensal. Em períodos maiores que um mês o limite é multiplicado pelos
 * meses; em intervalos que não fecham meses inteiros, proporcional aos dias.
 * Funções puras, para dar para testar sem banco.
 */

import type { DateRange } from "./period";
import { monthsSpanned } from "./categoryBreakdown";

export type BudgetStatus = "over" | "warning" | "ok";

export interface BudgetCategory {
  id: string;
  name: string;
  color: string;
  monthlyBudget: number | null;
}

export interface BudgetItem {
  categoryId: string;
  name: string;
  color: string;
  /** Limite no período (o mensal vezes os meses) */
  limit: number;
  /** Gasto no período, inclusive o já lançado para depois de hoje */
  spent: number;
  /** Quanto ainda cabe (negativo se passou) */
  remaining: number;
  /** spent / limit (pode passar de 1) */
  ratio: number;
  status: BudgetStatus;
  /** Quanto dá para gastar por dia até o fim do período em andamento; null fora dele */
  perDay: number | null;
}

export interface BudgetSummary {
  items: BudgetItem[];
  limit: number;
  spent: number;
  /** Fração do período já passada (0 a 1): a marca de "esperado até hoje" */
  expected: number;
  ongoing: boolean;
  /** Dias que faltam, contando hoje (só no período em andamento) */
  daysLeft: number;
  /** Gasto em categorias sem limite definido */
  unbudgeted: number;
}

/** Acima do ritmo: gastou 10 pontos a mais do que o tempo que passou */
const PACE_MARGIN = 0.1;
/** Perto do limite */
const NEAR_LIMIT = 0.9;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Quantos "meses de limite" cabem no período */
export function budgetMonths(range: DateRange): number {
  const wholeMonths = range.start.getDate() === 1 && range.end.getDate() === 1;
  if (wholeMonths) return monthsSpanned(range.start, range.end);
  const days = Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000);
  return (days * 12) / 365;
}

export function buildBudgets(
  categories: BudgetCategory[],
  spentByCategory: Record<string, number>,
  range: DateRange,
  pace: { days: number; elapsed: number; ongoing: boolean }
): BudgetSummary {
  const months = budgetMonths(range);
  const expected = pace.days > 0 ? Math.min(1, pace.elapsed / pace.days) : 1;
  // Hoje ainda conta como dia para gastar
  const daysLeft = pace.ongoing ? pace.days - pace.elapsed + 1 : 0;

  const items: BudgetItem[] = categories
    .filter((c) => c.monthlyBudget !== null && c.monthlyBudget > 0)
    .map((c) => {
      const limit = round2(c.monthlyBudget! * months);
      const spent = round2(spentByCategory[c.id] ?? 0);
      const remaining = round2(limit - spent);
      const ratio = limit > 0 ? spent / limit : 0;
      const status: BudgetStatus =
        spent > limit
          ? "over"
          : ratio >= NEAR_LIMIT || (pace.ongoing && ratio > expected + PACE_MARGIN)
            ? "warning"
            : "ok";
      return {
        categoryId: c.id,
        name: c.name,
        color: c.color,
        limit,
        spent,
        remaining,
        ratio,
        status,
        perDay: pace.ongoing && remaining > 0 ? round2(remaining / daysLeft) : null,
      };
    });

  const order: Record<BudgetStatus, number> = { over: 0, warning: 1, ok: 2 };
  items.sort((a, b) => order[a.status] - order[b.status] || b.ratio - a.ratio);

  const budgeted = new Set(items.map((i) => i.categoryId));
  const unbudgeted = Object.entries(spentByCategory)
    .filter(([id]) => !budgeted.has(id))
    .reduce((sum, [, v]) => sum + v, 0);

  return {
    items,
    limit: round2(items.reduce((s, i) => s + i.limit, 0)),
    spent: round2(items.reduce((s, i) => s + i.spent, 0)),
    expected,
    ongoing: pace.ongoing,
    daysLeft,
    unbudgeted: round2(unbudgeted),
  };
}
