/**
 * Apoio à lista de transações: resumo do período, busca e agrupamento por
 * dia (no celular a lista vem em seções "Hoje", "Ontem", "seg., 10 de nov.").
 */

interface ListedTransaction {
  type: string;
  amount: number;
  date: string;
  description: string;
  category: { name: string };
  account: { name: string };
}

export interface DayGroup<T> {
  key: string;
  date: Date;
  items: T[];
  /** Receitas − despesas do dia */
  total: number;
}

export function summarizeTransactions(transactions: Pick<ListedTransaction, "type" | "amount">[]) {
  let receitas = 0;
  let despesas = 0;
  for (const t of transactions) {
    if (t.type === "receita") receitas += t.amount;
    else if (t.type === "despesa") despesas += t.amount;
  }
  return { receitas: round2(receitas), despesas: round2(despesas), saldo: round2(receitas - despesas) };
}

/** Sem acento e em minúsculas, para a busca ignorar "ç", "ã"... */
function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Busca na descrição, na categoria e na conta; todas as palavras precisam aparecer. */
export function matchesSearch(t: Pick<ListedTransaction, "description" | "category" | "account">, query: string) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(`${t.description} ${t.category.name} ${t.account.name}`);
  return words.every((w) => haystack.includes(w));
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Agrupa por dia (no fuso do navegador), mantendo a ordem em que vieram. */
export function groupByDay<T extends Pick<ListedTransaction, "type" | "amount" | "date">>(transactions: T[]): DayGroup<T>[] {
  const groups = new Map<string, DayGroup<T>>();
  for (const t of transactions) {
    const date = new Date(t.date);
    const key = dayKey(date);
    let group = groups.get(key);
    if (!group) {
      group = { key, date: new Date(date.getFullYear(), date.getMonth(), date.getDate()), items: [], total: 0 };
      groups.set(key, group);
    }
    group.items.push(t);
    group.total = round2(group.total + (t.type === "receita" ? t.amount : t.type === "despesa" ? -t.amount : 0));
  }
  return [...groups.values()];
}

/** "Hoje", "Ontem" ou "seg., 10 de nov." (com o ano quando não é o atual). */
export function dayLabel(date: Date, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((today.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  }).format(date);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
