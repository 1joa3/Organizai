/** Detecta se uma descrição é de uma parcela, ex: "Notebook (3/10)". */
export function parseInstallmentDescription(description: string) {
  const match = description.match(/^(.*)\s\((\d+)\/(\d+)\)$/);
  if (!match) return null;
  return { baseName: match[1], current: parseInt(match[2]), total: parseInt(match[3]) };
}

export function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Soma `months` meses a uma data mantendo o dia, mas limitado ao último dia
 * do mês de destino — `setMonth` puro transborda (31/01 + 1 mês = 03/03).
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const target = new Date(date);
  target.setDate(1);
  target.setMonth(target.getMonth() + months);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

/**
 * Divide um valor em `count` parcelas em centavos inteiros; a última parcela
 * absorve o arredondamento para a soma bater com o total
 * (R$ 100 em 3x = 33,33 + 33,33 + 33,34).
 */
export function splitInstallmentAmounts(total: number, count: number): number[] {
  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / count);
  const amounts = Array.from({ length: count }, () => baseCents / 100);
  amounts[count - 1] = (totalCents - baseCents * (count - 1)) / 100;
  return amounts;
}

/** Remove o sufixo "(n/N)" da descrição. */
export function stripInstallmentSuffix(description: string): string {
  return description.replace(/\s*\(\d+\/\d+\)$/, "").trim();
}

/**
 * Dados de parcela de uma transação. Usa os campos próprios
 * (installmentNumber/Total); a descrição só serve como fallback para
 * transações antigas que ainda não têm esses campos.
 */
export function getInstallmentInfo(t: {
  description: string;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
}): { baseName: string; current: number; total: number } | null {
  if (t.installmentNumber && t.installmentTotal) {
    return { baseName: stripInstallmentSuffix(t.description), current: t.installmentNumber, total: t.installmentTotal };
  }
  return parseInstallmentDescription(t.description);
}

/**
 * Chave que identifica a mesma compra parcelada numa importação: linhas
 * "Loja (2/6)", "Loja (3/6)"... da mesma categoria e tipo. Retorna null para
 * linhas que não são parcela.
 */
export function importInstallmentKey(row: { description: string; type: string; categoryId: string }) {
  const info = parseInstallmentDescription(row.description);
  if (!info) return null;
  return {
    key: `${row.type}|${row.categoryId}|${info.baseName}|${info.total}`,
    baseName: info.baseName,
    current: info.current,
    total: info.total,
  };
}
