/**
 * Plano de cada meta: quanto falta, quanto guardar por mês para chegar no
 * prazo e se o andamento está adiantado ou atrasado. Sem histórico de
 * aportes, o "esperado até hoje" é a reta entre a criação da meta (zero) e
 * o prazo (o valor alvo).
 */

export type GoalStatus = "done" | "overdue" | "ahead" | "on-track" | "behind" | "open";

export interface GoalLike {
  targetAmount: number;
  currentAmount: number;
  deadline: Date | null;
  createdAt: Date;
}

export interface GoalPlan {
  status: GoalStatus;
  /** 0 a 100 */
  percent: number;
  remaining: number;
  /** Dias até o prazo (negativo se já passou); null sem prazo */
  daysLeft: number | null;
  /** Meses de aporte até o prazo (no mínimo 1); null sem prazo, concluída ou vencida */
  monthsLeft: number | null;
  /** Quanto guardar por mês para chegar no prazo */
  monthlyNeeded: number | null;
  /** Quanto deveria haver hoje, no ritmo da reta até o prazo (0 a 100%) */
  expectedPercent: number | null;
}

/** Margem (em % do alvo) para "no ritmo" */
const TOLERANCE = 0.05;
const DAY = 86_400_000;

function dayStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Meses de calendário em que ainda dá para guardar: o atual conta, o do prazo também */
function monthsUntil(today: Date, deadline: Date) {
  const months = (deadline.getFullYear() - today.getFullYear()) * 12 + deadline.getMonth() - today.getMonth();
  return Math.max(1, months + 1);
}

export function goalPlan(goal: GoalLike, today: Date): GoalPlan {
  const { targetAmount: target, currentAmount: current, deadline } = goal;
  const remaining = round2(Math.max(0, target - current));
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100;
  const done = remaining === 0;

  const base = { percent, remaining, daysLeft: null, monthsLeft: null, monthlyNeeded: null, expectedPercent: null };
  if (done) {
    return { ...base, status: "done", percent: 100, daysLeft: deadline ? Math.round((dayStart(deadline) - dayStart(today)) / DAY) : null };
  }
  if (!deadline) return { ...base, status: "open" };

  const daysLeft = Math.round((dayStart(deadline) - dayStart(today)) / DAY);
  if (daysLeft < 0) return { ...base, status: "overdue", daysLeft };

  const monthsLeft = monthsUntil(today, deadline);
  const total = dayStart(deadline) - dayStart(goal.createdAt);
  const elapsed = dayStart(today) - dayStart(goal.createdAt);
  const expectedRatio = total > 0 ? Math.min(1, Math.max(0, elapsed / total)) : 1;
  const diff = current / target - expectedRatio;
  const status: GoalStatus = diff > TOLERANCE ? "ahead" : diff < -TOLERANCE ? "behind" : "on-track";

  return {
    ...base,
    status,
    daysLeft,
    monthsLeft,
    monthlyNeeded: round2(remaining / monthsLeft),
    expectedPercent: Math.round(expectedRatio * 100),
  };
}

/** Ordem da tela: em andamento primeiro (prazo mais perto antes, sem prazo por último), concluídas no fim */
export function compareGoals(a: { plan: GoalPlan; deadline: Date | null }, b: { plan: GoalPlan; deadline: Date | null }) {
  const doneA = a.plan.status === "done" ? 1 : 0;
  const doneB = b.plan.status === "done" ? 1 : 0;
  if (doneA !== doneB) return doneA - doneB;
  const ta = a.deadline?.getTime() ?? Infinity;
  const tb = b.deadline?.getTime() ?? Infinity;
  return ta === tb ? 0 : ta < tb ? -1 : 1;
}
