import { describe, it, expect } from "vitest";
import {
  transactionSchema,
  importSchema,
  investmentSchema,
  goalSchema,
  idListSchema,
  formToObject,
  firstError,
  calendarDate,
} from "./validation";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return formToObject(fd);
}

const validTransaction = {
  description: "Mercado",
  amount: "123.45",
  type: "despesa",
  date: "2026-10-13",
  accountId: "acc-1",
  categoryId: "cat-1",
};

describe("transactionSchema", () => {
  it("aceita um formulário válido e converte valor, data e parcelas", () => {
    const r = transactionSchema.parse(form(validTransaction));
    expect(r.amount).toBe(123.45);
    expect(r.date).toEqual(new Date(Date.UTC(2026, 9, 13, 12)));
    expect(r.installments).toBe(1);
  });

  it("aceita vírgula como separador decimal", () => {
    expect(transactionSchema.parse(form({ ...validTransaction, amount: "10,5" })).amount).toBe(10.5);
  });

  it.each([
    [{ amount: "0" }, "maior que zero"],
    [{ amount: "abc" }, "Informe o valor"],
    [{ type: "transferencia" }, "Tipo inválido"],
    [{ date: "13/10/2026" }, "Data inválida"],
    [{ date: "2026-02-30" }, "Data inválida"],
    [{ description: "   " }, "Informe a descrição"],
    [{ accountId: "" }, "Selecione a conta"],
    [{ installments: "500" }, "No máximo 120 parcelas"],
    [{ installments: "2.5" }, "Número de parcelas inválido"],
  ])("rejeita %j", (override, message) => {
    const r = transactionSchema.safeParse(form({ ...validTransaction, ...override }));
    expect(r.success).toBe(false);
    if (!r.success) expect(firstError(r.error)).toContain(message);
  });
});

describe("calendarDate", () => {
  it("guarda ao meio-dia UTC para não mudar de dia em nenhum fuso do Brasil", () => {
    const d = calendarDate("2026-10-31")!;
    expect(d.toISOString()).toBe("2026-10-31T12:00:00.000Z");
    expect(d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })).toBe("31/10/2026");
    expect(d.toLocaleDateString("pt-BR", { timeZone: "America/Rio_Branco" })).toBe("31/10/2026");
    expect(d.toLocaleDateString("pt-BR", { timeZone: "UTC" })).toBe("31/10/2026");
  });

  it("rejeita datas inexistentes e formatos inesperados", () => {
    expect(calendarDate("2026-02-29")).toBeNull();
    expect(calendarDate("2026-10-01T03:00:00.000Z")).toBeNull();
    expect(calendarDate("31/10/2026")).toBeNull();
  });
});

describe("importSchema", () => {
  const row = { date: "2026-10-01", description: "Loja", amount: 10, type: "despesa", categoryId: "c1" };

  it("aceita linhas válidas e usa despesa como tipo padrão", () => {
    const r = importSchema.parse({ accountId: "a1", rows: [{ ...row, type: "???" }] });
    expect(r.rows[0].type).toBe("despesa");
  });

  it("diz qual linha está inválida", () => {
    const r = importSchema.safeParse({ accountId: "a1", rows: [row, { ...row, amount: -5 }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstError(r.error)).toMatch(/^Linha 2:/);
  });

  it("rejeita importação vazia", () => {
    expect(importSchema.safeParse({ accountId: "a1", rows: [] }).success).toBe(false);
  });
});

describe("investmentSchema", () => {
  it("sem valor atual devolve null (a action usa o valor investido)", () => {
    const r = investmentSchema.parse(form({ asset: "IVVB11", assetType: "renda_variavel", investedAmount: "1000", date: "2026-10-01" }));
    expect(r.currentAmount).toBeNull();
    expect(r.notes).toBeNull();
  });

  it("rejeita tipo de ativo desconhecido", () => {
    expect(investmentSchema.safeParse(form({ asset: "X", assetType: "imovel", investedAmount: "1", date: "2026-10-01" })).success).toBe(false);
  });
});

describe("goalSchema", () => {
  it("valor atual vazio vira 0 e prazo vazio vira null", () => {
    const r = goalSchema.parse(form({ name: "Viagem", targetAmount: "5000" }));
    expect(r.currentAmount).toBe(0);
    expect(r.deadline).toBeNull();
    expect(r.color).toBe("#FBBF24");
  });

  it("rejeita cor fora do formato #RRGGBB", () => {
    expect(goalSchema.safeParse(form({ name: "Viagem", targetAmount: "5000", color: "red" })).success).toBe(false);
  });
});

describe("idListSchema", () => {
  it("exige ao menos um id", () => {
    expect(idListSchema.safeParse([]).success).toBe(false);
    expect(idListSchema.safeParse("abc").success).toBe(false);
    expect(idListSchema.parse(["a", "b"])).toEqual(["a", "b"]);
  });
});
