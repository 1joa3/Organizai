import { detectInstallment } from "./csvImport";

/** Quantos dias de diferença ainda contam como "provavelmente a mesma compra". */
export const DUPLICATE_DAY_TOLERANCE = 2;

const DAY_MS = 86_400_000;

export interface DuplicateCandidate {
  date: Date;
  description: string;
  amount: number;
  type: string;
}

export interface ExistingTransaction extends DuplicateCandidate {
  id: string;
}

export type DuplicateMatch = {
  /**
   * exact = mesma data, descrição e valor;
   * probable = mesmo valor, até ±2 dias e descrição parecida;
   * possible = mesmo valor e mesmo dia, mas descrição diferente.
   */
  kind: "exact" | "probable" | "possible";
  existing: ExistingTransaction;
};

/** Minúsculas, sem acentos, sem pontuação, espaços normalizados. */
export function normalizeDescription(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Palavras que aparecem em toda fatura e não ajudam a dizer se é a mesma loja
const STOPWORDS = new Set(["ltda", "eireli", "com", "br", "pag", "pagamento", "compra", "debito", "credito", "pix", "loja"]);

function tokens(s: string): Set<string> {
  return new Set(
    normalizeDescription(s)
      .split(" ")
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
  );
}

/**
 * Descrições "parecidas": iguais depois de normalizar, uma contida na outra
 * ("Mercado" × "Supermercado XYZ Ltda") ou com metade das palavras em comum.
 * Parcelas só batem com a mesma parcela (2/6 × 2/6) da mesma loja.
 */
export function descriptionsSimilar(a: string, b: string): boolean {
  const ia = detectInstallment(a);
  const ib = detectInstallment(b);
  if (ia && ib) {
    if (ia.current !== ib.current || ia.total !== ib.total) return false;
    return descriptionsSimilar(ia.baseName, ib.baseName);
  }
  if (ia) a = ia.baseName;
  if (ib) b = ib.baseName;

  const na = normalizeDescription(a);
  const nb = normalizeDescription(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na];
  if (short.length >= 4 && long.includes(short)) return true;

  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return false;
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return common / Math.min(ta.size, tb.size) >= 0.5;
}

const cents = (n: number) => Math.round(n * 100);
const dayDiff = (a: Date, b: Date) => Math.round(Math.abs(a.getTime() - b.getTime()) / DAY_MS);

/**
 * Para cada linha da importação, procura uma transação já cadastrada que
 * pareça ser a mesma. Cada transação existente só "absorve" uma linha — duas
 * compras iguais no arquivo com uma só no banco deixam a segunda livre.
 *
 * Primeiro casa as exatas (mesmo dia, descrição e valor), depois as
 * prováveis: mesmo valor e tipo, até ±2 dias e descrição parecida. Por fim,
 * as possíveis: mesmo valor e mesmo dia, descrição diferente (acontece quando
 * a compra foi lançada à mão com outro nome).
 */
export function findDuplicates(
  rows: (DuplicateCandidate | null)[],
  existing: ExistingTransaction[],
  dayTolerance = DUPLICATE_DAY_TOLERANCE
): (DuplicateMatch | null)[] {
  const result: (DuplicateMatch | null)[] = rows.map(() => null);
  const used = new Set<string>();

  // Agrupa por valor para não comparar tudo com tudo
  const byAmount = new Map<number, ExistingTransaction[]>();
  for (const e of existing) {
    const k = cents(e.amount);
    const list = byAmount.get(k);
    if (list) list.push(e);
    else byAmount.set(k, [e]);
  }
  const candidatesFor = (r: DuplicateCandidate) =>
    (byAmount.get(cents(r.amount)) ?? []).filter((e) => !used.has(e.id) && e.type === r.type);

  rows.forEach((r, i) => {
    if (!r) return;
    const norm = normalizeDescription(r.description);
    const match = candidatesFor(r).find((e) => dayDiff(e.date, r.date) === 0 && normalizeDescription(e.description) === norm);
    if (match) {
      used.add(match.id);
      result[i] = { kind: "exact", existing: match };
    }
  });

  rows.forEach((r, i) => {
    if (!r || result[i]) return;
    let best: { e: ExistingTransaction; score: number } | null = null;
    for (const e of candidatesFor(r)) {
      const days = dayDiff(e.date, r.date);
      if (days > dayTolerance) continue;
      const similar = descriptionsSimilar(e.description, r.description);
      if (!similar && days !== 0) continue;
      // Preferimos descrição parecida, depois a data mais próxima
      const score = (similar ? 0 : 10) + days;
      if (!best || score < best.score) best = { e, score };
    }
    if (best) {
      used.add(best.e.id);
      result[i] = { kind: best.score < 10 ? "probable" : "possible", existing: best.e };
    }
  });

  return result;
}

/**
 * Chave usada pelo servidor como rede de segurança: só barra cópias exatas.
 * Conta ocorrências (não é um Set) para não descartar compras iguais
 * legítimas dentro do mesmo arquivo.
 */
export function exactKey(r: { date: Date; description: string; amount: number }) {
  return `${r.date.getTime()}|${r.description}|${r.amount.toFixed(2)}`;
}
