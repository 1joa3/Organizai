/**
 * O "resumo" do Dashboard: em vez de só mostrar números, diz o que eles
 * significam — o ritmo de gastos comparado ao período anterior e algumas
 * observações automáticas. Funções puras (recebem as despesas já buscadas
 * e o dia de hoje), para dar para testar sem banco.
 */

import type { DateRange } from "./period";

export interface StoryExpense {
  amount: number;
  date: Date;
  description: string;
  categoryId: string;
  category: { name: string; color: string };
}

/** Meia-noite do dia (fuso local), para contar dias sem erro de horário de verão */
function dayStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Dias entre o início do intervalo e a data (0 = primeiro dia) */
function dayIndex(date: Date, start: Date) {
  return Math.round((dayStart(date).getTime() - dayStart(start).getTime()) / 86_400_000);
}

function rangeDays({ start, end }: DateRange) {
  return dayIndex(end, start);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Soma acumulada das despesas, dia a dia, com `days` posições */
function cumulative(expenses: StoryExpense[], start: Date, days: number) {
  const daily = Array<number>(days).fill(0);
  for (const e of expenses) {
    const i = dayIndex(e.date, start);
    if (i >= 0 && i < days) daily[i] += e.amount;
  }
  let sum = 0;
  return daily.map((v) => (sum = round2(sum + v)));
}

export interface Pace {
  /** Dias do período */
  days: number;
  /** Dias já passados, contando hoje: 0 (período futuro) até `days` (já acabou) */
  elapsed: number;
  /** Período em andamento (hoje está dentro dele) */
  ongoing: boolean;
  /** Gasto acumulado dia a dia no período (inclui o que já está lançado para depois de hoje) */
  current: number[];
  /** Gasto acumulado dia a dia no período anterior */
  previous: number[];
  /** Gasto até hoje (ou o total, se o período já acabou) */
  spentToDate: number;
  /** Gasto do período anterior até o mesmo ponto */
  previousToDate: number;
  previousTotal: number;
  /** Lançado para os próximos dias do período (parcelas, contas agendadas) */
  scheduled: number;
  /**
   * Quanto o período deve fechar de gastos se o resto dele for como o
   * período anterior — ou, se for mais, o que já está lançado. Só no período
   * em andamento e com histórico para comparar.
   */
  projection: number | null;
}

export function buildPace(
  current: StoryExpense[],
  previous: StoryExpense[],
  range: DateRange,
  previousRange: DateRange,
  today: Date
): Pace {
  const days = rangeDays(range);
  const previousDays = rangeDays(previousRange);
  const elapsed = Math.min(days, Math.max(0, dayIndex(today, range.start) + 1));
  const ongoing = elapsed > 0 && elapsed < days;

  const currentCum = cumulative(current, range.start, days);
  const previousCum = cumulative(previous, previousRange.start, previousDays);
  const total = currentCum[days - 1] ?? 0;
  const previousTotal = previousCum[previousDays - 1] ?? 0;

  const spentToDate = elapsed > 0 ? currentCum[elapsed - 1] : 0;
  const previousToDate = elapsed > 0 ? (previousCum[Math.min(elapsed, previousDays) - 1] ?? 0) : 0;
  const scheduled = round2(total - spentToDate);

  const projection =
    ongoing && previousTotal > 0
      ? round2(spentToDate + Math.max(scheduled, previousTotal - previousToDate))
      : null;

  return {
    days,
    elapsed,
    ongoing,
    current: currentCum,
    previous: previousCum,
    spentToDate,
    previousToDate,
    previousTotal,
    scheduled,
    projection,
  };
}

export type InsightTone = "good" | "bad" | "neutral";

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
}

export interface InsightInput {
  current: StoryExpense[];
  previous: StoryExpense[];
  range: DateRange;
  previousRange: DateRange;
  pace: Pace;
  receitas: number;
  despesas: number;
  /** "outubro" quando o período é um mês; null nos demais ("período anterior") */
  previousName: string | null;
  installments: { name: string; currentInstallment: number; totalInstallments: number }[];
  goals: { name: string; currentAmount: number; targetAmount: number }[];
}

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${Math.round(Math.abs(n) * 100)}%`;

/** "que em outubro", "que no mesmo ponto de outubro", "que no período anterior"... */
export function comparisonPhrase(previousName: string | null, samePoint: boolean) {
  if (samePoint) return previousName ? `que no mesmo ponto de ${previousName}` : "que no mesmo ponto do período anterior";
  return previousName ? `que em ${previousName}` : "que no período anterior";
}

/** Quanto mudou para a observação de categoria valer a pena */
const MIN_CATEGORY_DIFF = 50;
const MIN_CATEGORY_CHANGE = 0.2;

export function buildInsights(input: InsightInput): Insight[] {
  const { pace, receitas, despesas, previousName } = input;
  const insights: Insight[] = [];

  // Taxa de poupança
  if (receitas > 0) {
    const rate = (receitas - despesas) / receitas;
    if (rate >= 0) {
      insights.push({
        id: "poupanca",
        tone: rate >= 0.2 ? "good" : "neutral",
        title: `Você guardou ${pct(rate)} do que entrou`,
        detail: rate >= 0.2 ? `${brl(receitas - despesas)} de ${brl(receitas)}` : `${brl(receitas - despesas)} de ${brl(receitas)} — o ideal é passar de 20%`,
      });
    } else {
      insights.push({
        id: "poupanca",
        tone: "bad",
        title: `Saiu ${pct(rate)} a mais do que entrou`,
        detail: `${brl(despesas - receitas)} acima das receitas`,
      });
    }
  }

  // Categorias: no período em andamento, compara até o mesmo dia
  const cutoff = pace.ongoing ? pace.elapsed : Infinity;
  const byCategory = new Map<string, { name: string; now: number; before: number }>();
  const add = (e: StoryExpense, start: Date, key: "now" | "before") => {
    if (dayIndex(e.date, start) >= cutoff) return;
    const row = byCategory.get(e.categoryId) ?? { name: e.category.name, now: 0, before: 0 };
    row[key] += e.amount;
    byCategory.set(e.categoryId, row);
  };
  input.current.forEach((e) => add(e, input.range.start, "now"));
  input.previous.forEach((e) => add(e, input.previousRange.start, "before"));

  const changes = [...byCategory.values()]
    .filter((c) => c.before > 0)
    .map((c) => ({ ...c, diff: c.now - c.before, change: (c.now - c.before) / c.before }));
  const compared = comparisonPhrase(previousName, pace.ongoing);

  const up = changes
    .filter((c) => c.diff >= MIN_CATEGORY_DIFF && c.change >= MIN_CATEGORY_CHANGE)
    .sort((a, b) => b.diff - a.diff)[0];
  if (up) {
    insights.push({
      id: "categoria-subiu",
      tone: "bad",
      title: `${up.name} subiu ${pct(up.change)}`,
      detail: `${brl(up.diff)} a mais ${compared}`,
    });
  }

  const down = changes
    .filter((c) => -c.diff >= MIN_CATEGORY_DIFF && c.change <= -MIN_CATEGORY_CHANGE)
    .sort((a, b) => a.diff - b.diff)[0];
  if (down) {
    insights.push({
      id: "categoria-caiu",
      tone: "good",
      title: `${down.name} caiu ${pct(down.change)}`,
      detail: `${brl(-down.diff)} a menos ${compared}`,
    });
  }

  // Parcelamentos que terminam no período
  const ending = input.installments.filter((i) => i.totalInstallments > 1 && i.currentInstallment === i.totalInstallments);
  if (ending.length > 0) {
    const names = ending.map((i) => i.name);
    insights.push({
      id: "parcelas-fim",
      tone: "good",
      title: ending.length === 1 ? "Um parcelamento termina agora" : `${ending.length} parcelamentos terminam agora`,
      detail: names.length <= 2 ? names.join(" e ") : `${names.slice(0, 2).join(", ")} e mais ${names.length - 2}`,
    });
  }

  // Meta perto de ser alcançada
  const goal = input.goals
    .filter((g) => g.targetAmount > 0 && g.currentAmount < g.targetAmount && g.currentAmount / g.targetAmount >= 0.8)
    .sort((a, b) => b.currentAmount / b.targetAmount - a.currentAmount / a.targetAmount)[0];
  if (goal) {
    insights.push({
      id: "meta",
      tone: "good",
      title: `Falta pouco para a meta ${goal.name}`,
      detail: `${brl(goal.targetAmount - goal.currentAmount)} para chegar em ${brl(goal.targetAmount)}`,
    });
  }

  // Maior gasto (até hoje, no período em andamento)
  const biggest = input.current
    .filter((e) => dayIndex(e.date, input.range.start) < cutoff)
    .sort((a, b) => b.amount - a.amount)[0];
  if (biggest) {
    insights.push({
      id: "maior-gasto",
      tone: "neutral",
      title: `Maior gasto: ${biggest.description}`,
      detail: `${brl(biggest.amount)} em ${biggest.category.name}, dia ${biggest.date.getDate()}`,
    });
  }

  // Dias sem gastar (só em períodos curtos, para a conta fazer sentido)
  const counted = Math.min(pace.elapsed, pace.days);
  if (counted >= 7 && pace.days <= 31) {
    const spentDays = new Set(
      input.current.map((e) => dayIndex(e.date, input.range.start)).filter((i) => i >= 0 && i < counted)
    );
    const free = counted - spentDays.size;
    if (free >= 3) {
      insights.push({
        id: "dias-sem-gastar",
        tone: "neutral",
        title: `${free} dias sem gastar`,
        detail: pace.ongoing ? `de ${counted} dias até hoje` : `de ${counted} dias no período`,
      });
    }
  }

  return insights.slice(0, 5);
}
