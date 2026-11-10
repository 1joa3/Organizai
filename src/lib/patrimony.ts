export interface PatrimonyMonth {
  label: string;
  saldo: number;
  investido: number;
}

interface Movement {
  type: string;
  amount: number;
  date: Date;
}

interface InvestmentPoint {
  currentAmount: number;
  date: Date;
}

/** Início do mês 11 meses atrás: tudo antes disso entra só como saldo inicial. */
export function patrimonyWindow(now: Date) {
  return {
    start: new Date(now.getFullYear(), now.getMonth() - 11, 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

/**
 * Saldo acumulado (receitas − despesas) e valor investido ao fim de cada um
 * dos últimos 12 meses. `baseSaldo` é o saldo de tudo que veio antes da
 * janela; `movements` são as transações dentro dela; `investments` são todos
 * os investimentos até o fim da janela.
 */
export function buildPatrimonyEvolution(
  now: Date,
  baseSaldo: number,
  movements: Movement[],
  investments: InvestmentPoint[]
): PatrimonyMonth[] {
  const months: PatrimonyMonth[] = [];

  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endDate = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

    let saldo = baseSaldo;
    for (const m of movements) {
      if (m.date < endDate) saldo += m.type === "receita" ? m.amount : m.type === "despesa" ? -m.amount : 0;
    }
    let investido = 0;
    for (const inv of investments) {
      if (inv.date < endDate) investido += inv.currentAmount;
    }

    months.push({
      label: monthStart.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      saldo: round2(saldo),
      investido: round2(investido),
    });
  }

  return months;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
