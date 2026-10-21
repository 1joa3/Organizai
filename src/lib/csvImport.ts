import { addMonthsClamped } from "./installments";

/**
 * Parser de CSV sem dependências externas (evita as vulnerabilidades
 * conhecidas de libs como `xlsx`/SheetJS para um caso de uso simples).
 * Detecta o delimitador (`,` ou `;` — bancos brasileiros costumam usar `;`
 * já que `,` é separador decimal) e lida com campos entre aspas.
 */
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // remove BOM

  const firstLine = text.split(/\r\n|\n|\r/)[0] ?? "";
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semiCount = (firstLine.match(/;/g) ?? []).length;
  const delimiter = semiCount > commaCount ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    if (row.some((f) => f.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      pushField();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") i++;
      pushRow();
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) pushRow();

  const [headers, ...dataRows] = rows;
  return { headers: headers ?? [], rows: dataRows };
}

/** Converte "15/03/2024", "2024-03-15", "15-03-2024" etc. em Date. */
export function coerceDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  let m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (m) {
    const date = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return isNaN(date.getTime()) ? null : date;
  }

  m = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
  if (m) {
    const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/** Converte "R$ 1.234,56", "(123,45)", "-45.90", "1234,5" etc. em number. */
export function coerceAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;

  s = s.replace(/R\$\s?/gi, "").trim();
  const isParenNegative = /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, "");

  if (/,\d{1,2}$/.test(s)) {
    // formato brasileiro: 1.234,56
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }

  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return isParenNegative ? -Math.abs(n) : n;
}

interface ImportRow {
  date: Date;
  description: string;
  amount: number;
  type: "despesa" | "receita";
}

export interface InstallmentMatch {
  baseName: string;
  current: number;
  total: number;
}

// "parcela", "parc", "parc." seguido de "2/6", "02/06" ou "2 de 6"
const PARCELA = String.raw`(?:parcela|parc)\.?\s*(\d{1,3})\s*(?:\/|de)\s*(\d{1,3})`;
const SEPARATORS = String.raw`[\s\-–—:|,.]*`;

const INSTALLMENT_PATTERNS: { regex: RegExp; name: number; current: number; total: number }[] = [
  // "Loja - Parcela 2/6", "Loja Parc 02/06", "Loja – Parcela 2 de 6 "
  { regex: new RegExp(String.raw`^(.*?)${SEPARATORS}\b${PARCELA}[\s.)]*$`, "i"), name: 1, current: 2, total: 3 },
  // "Parcela 2/6 - Loja"
  { regex: new RegExp(String.raw`^${PARCELA}${SEPARATORS}(.+)$`, "i"), name: 3, current: 1, total: 2 },
  // "Loja (2/6)" — formato interno, e o que o app exporta
  { regex: /^(.*?)\s*\(\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*\)\s*$/, name: 1, current: 2, total: 3 },
];

/**
 * Detecta se a descrição da fatura é de uma parcela. Aceita as variações
 * que aparecem nas exportações dos bancos ("Loja - Parcela 2/6",
 * "Loja Parc 02/06", "Parcela 2 de 6 - Loja", "Loja (2/6)"). Retorna null se
 * não for parcela ou se os números forem inconsistentes.
 */
export function detectInstallment(description: string): InstallmentMatch | null {
  const text = description.trim();
  for (const p of INSTALLMENT_PATTERNS) {
    const m = text.match(p.regex);
    if (!m) continue;
    const baseName = m[p.name].replace(/^[\s\-–—:|,.]+|[\s\-–—:|,]+$/g, "").trim();
    const current = parseInt(m[p.current]);
    const total = parseInt(m[p.total]);
    if (baseName && total >= 2 && current >= 1 && current <= total) {
      return { baseName, current, total };
    }
  }
  return null;
}

/**
 * Expande uma linha de parcela (detectada pela descrição, ou informada em
 * `installment` quando o usuário marca na mão) — bancos só listam a parcela
 * do mês corrente, então geramos as parcelas futuras (current..total), uma
 * por mês, mesmo valor. Parcelas passadas (1..current-1) não são recriadas,
 * pois já são histórico e não afetam o saldo devedor futuro.
 * Se não for parcelada, retorna a própria linha sem alterações.
 */
export function expandInstallmentRow(row: ImportRow, installment?: InstallmentMatch | null): ImportRow[] {
  const info = installment ?? detectInstallment(row.description);
  if (!info) return [row];
  const { baseName, current, total } = info;

  const expanded: ImportRow[] = [];
  for (let n = current; n <= total; n++) {
    expanded.push({
      date: addMonthsClamped(row.date, n - current),
      description: `${baseName} (${n}/${total})`,
      amount: row.amount,
      type: row.type,
    });
  }
  return expanded;
}

export function guessColumn(headers: string[], keywords: string[]): number {
  const normalize = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return headers.findIndex((h) => keywords.some((k) => normalize(h).includes(k)));
}
