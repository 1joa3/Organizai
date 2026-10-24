import { z } from "zod";

/**
 * Validação dos dados que chegam nas server actions. Os formulários do app
 * já limitam os campos no navegador, mas uma server action pode ser chamada
 * com qualquer payload — tudo é conferido de novo aqui.
 */

export const TRANSACTION_TYPES = ["receita", "despesa"] as const;
export const ACCOUNT_TYPES = ["corrente", "poupança", "carteira"] as const;
export const ASSET_TYPES = ["renda_fixa", "renda_variavel", "cripto", "fundo"] as const;
export const MAX_INSTALLMENTS = 120;
const MAX_AMOUNT = 1_000_000_000;

const text = (label: string, max: number) =>
  z.string({ error: `Informe ${label}` }).trim().min(1, `Informe ${label}`).max(max, `${label} muito longo(a)`);

/** Valor em reais: aceita "1234.56" ou "1234,56"; precisa ser > 0. */
const amount = (label = "o valor") =>
  z.coerce
    .string()
    .transform((s) => Number(s.replace(",", ".")))
    .pipe(
      z
        .number({ error: `Informe ${label}` })
        .finite(`Informe ${label}`)
        .positive(`${label[0].toUpperCase()}${label.slice(1)} precisa ser maior que zero`)
        .max(MAX_AMOUNT, "Valor alto demais")
    );

/** Igual a `amount`, mas aceita zero e campo vazio (vira `fallback`). */
const optionalAmount = <T extends number | null>(fallback: T) =>
  z
    .string()
    .optional()
    .transform((s, ctx): number | T => {
      if (s === undefined || s.trim() === "") return fallback;
      const n = Number(s.replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) {
        ctx.addIssue({ code: "custom", message: "Valor inválido" });
        return z.NEVER;
      }
      return n;
    });

/**
 * Data de calendário "AAAA-MM-DD" (input type=date) → Date ao meio-dia UTC.
 * Guardar ao meio-dia faz a data cair no mesmo dia em qualquer fuso de
 * UTC−11 a UTC+11 — à meia-noite UTC, no Brasil ela aparecia como o dia
 * anterior.
 */
export function calendarDate(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d, 12));
  if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  if (y < 1900 || y > 2200) return null;
  return date;
}

const date = (label = "a data") =>
  z
    .string({ error: `Informe ${label}` })
    .transform((s, ctx) => {
      const d = calendarDate(s);
      if (!d) {
        ctx.addIssue({ code: "custom", message: "Data inválida" });
        return z.NEVER;
      }
      return d;
    });

const optionalDate = z
  .string()
  .optional()
  .transform((s, ctx) => {
    if (!s) return null;
    const d = calendarDate(s);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Data inválida" });
      return z.NEVER;
    }
    return d;
  });

const id = (label: string) => z.string({ error: `Selecione ${label}` }).trim().min(1, `Selecione ${label}`).max(64);
const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida")
  .optional();

export const transactionSchema = z.object({
  description: text("a descrição", 200),
  amount: amount(),
  type: z.enum(TRANSACTION_TYPES, { error: "Tipo inválido" }),
  date: date(),
  accountId: id("a conta"),
  categoryId: id("a categoria"),
  installments: z.coerce
    .number()
    .int("Número de parcelas inválido")
    .min(1, "Número de parcelas inválido")
    .max(MAX_INSTALLMENTS, `No máximo ${MAX_INSTALLMENTS} parcelas`)
    .default(1),
});

export const categorySchema = z.object({
  name: text("um nome para a categoria", 60),
  type: z.enum(TRANSACTION_TYPES, { error: "Tipo de categoria inválido" }),
  color: color.default("#00E5FF"),
});

export const accountSchema = z.object({
  name: text("um nome para a conta", 60),
  type: z.enum(ACCOUNT_TYPES, { error: "Tipo de conta inválido" }),
});

export const importSchema = z.object({
  accountId: id("a conta"),
  rows: z
    .array(
      z.object({
        date: date(),
        description: text("a descrição", 200),
        amount: amount(),
        type: z.enum(TRANSACTION_TYPES).catch("despesa"),
        categoryId: id("a categoria"),
      })
    )
    .min(1, "Nenhuma linha válida para importar")
    .max(5000, "Arquivo grande demais (máximo de 5000 linhas)"),
});

export const idListSchema = z.array(id("uma transação")).min(1, "Nenhuma transação selecionada").max(5000);

export const investmentSchema = z.object({
  asset: text("o ativo", 120),
  assetType: z.enum(ASSET_TYPES, { error: "Tipo de ativo inválido" }),
  investedAmount: amount("o valor investido"),
  currentAmount: optionalAmount(null),
  date: date(),
  notes: z.string().trim().max(500, "Observação muito longa").optional().transform((s) => s || null),
});

export const goalSchema = z.object({
  name: text("o nome da meta", 120),
  targetAmount: amount("o valor alvo"),
  currentAmount: optionalAmount(0),
  deadline: optionalDate,
  color: color.default("#FBBF24"),
});

export const goalContributionSchema = z.object({ amount: amount() });

/** FormData → objeto simples (campos vazios viram undefined). */
export function formToObject(formData: FormData): Record<string, string | undefined> {
  const obj: Record<string, string | undefined> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") obj[key] = value === "" ? undefined : value;
  });
  return obj;
}

/** Primeira mensagem de erro, para mostrar no toast. */
export function firstError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Dados inválidos";
  // Erros dentro de listas (ex: linhas da importação) dizem qual linha falhou
  const index = issue.path.find((p) => typeof p === "number");
  return typeof index === "number" ? `Linha ${index + 1}: ${issue.message}` : issue.message;
}
