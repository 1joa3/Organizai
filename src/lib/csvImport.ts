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

/**
 * Detecta se a linha da fatura é uma parcela (ex: "Loja - Parcela 2/6",
 * ou já no formato interno "Loja (2/6)") — bancos só listam a parcela do
 * mês corrente, então expandimos para as parcelas futuras (current..total),
 * uma por mês, mesmo valor. Parcelas passadas (1..current-1) não são
 * recriadas, pois já são histórico e não afetam o saldo devedor futuro.
 * Se não for parcelada, retorna a própria linha sem alterações.
 */
export function expandInstallmentRow(row: ImportRow): ImportRow[] {
  const match =
    row.description.match(/^(.*?)\s*-?\s*parcela\s+(\d+)\s*\/\s*(\d+)\s*$/i) ??
    row.description.match(/^(.*?)\s*\((\d+)\s*\/\s*(\d+)\)\s*$/);

  if (!match) return [row];

  const baseName = match[1].trim();
  const current = parseInt(match[2]);
  const total = parseInt(match[3]);
  if (!baseName || current < 1 || total < current) return [row];

  const expanded: ImportRow[] = [];
  for (let n = current; n <= total; n++) {
    const date = new Date(row.date);
    date.setMonth(date.getMonth() + (n - current));
    expanded.push({
      date,
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
