"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { splitInstallmentAmounts, addMonthsClamped, importInstallmentKey } from "@/lib/installments";
import type { DateRange } from "@/lib/period";
import {
  categorySchema,
  firstError,
  formToObject,
  idListSchema,
  importSchema,
  transactionSchema,
} from "@/lib/validation";

function revalidate() {
  revalidatePath("/transacoes");
  revalidatePath("/");
}

/** Confere se a conta e a categoria existem e se a categoria é do mesmo tipo da transação. */
async function checkReferences(accountId: string, categoryId: string, type: string) {
  const [account, category] = await Promise.all([
    prisma.account.findUnique({ where: { id: accountId }, select: { id: true } }),
    prisma.category.findUnique({ where: { id: categoryId }, select: { type: true } }),
  ]);
  if (!account) return "Conta não encontrada";
  if (!category) return "Categoria não encontrada";
  if (category.type !== type) return "A categoria não é do mesmo tipo da transação";
  return null;
}

export async function createTransaction(formData: FormData) {
  const parsed = transactionSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { description, amount, type, date, accountId, categoryId, installments } = parsed.data;

  const refError = await checkReferences(accountId, categoryId, type);
  if (refError) return { error: refError };

  try {
    if (type === "despesa" && installments > 1) {
      // Todas as parcelas compartilham o mesmo grupo; a descrição leva "(n/N)" só para exibição
      const installmentGroupId = randomUUID();
      const installmentAmounts = splitInstallmentAmounts(amount, installments);
      await prisma.transaction.createMany({
        data: installmentAmounts.map((value, i) => ({
          description: `${description} (${i + 1}/${installments})`,
          amount: value,
          type,
          date: addMonthsClamped(date, i),
          accountId,
          categoryId,
          installmentGroupId,
          installmentNumber: i + 1,
          installmentTotal: installments,
        })),
      });
    } else {
      await prisma.transaction.create({
        data: { description, amount, type, date, accountId, categoryId },
      });
    }
  } catch (error) {
    console.error("Error creating transaction:", error);
    return { error: "Erro interno ao salvar a transação." };
  }

  revalidate();
  return { success: true };
}

export async function updateTransaction(id: string, formData: FormData) {
  const parsed = transactionSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { description, amount, type, date, accountId, categoryId } = parsed.data;

  const refError = await checkReferences(accountId, categoryId, type);
  if (refError) return { error: refError };

  try {
    // Os campos de parcela não mudam: editar a descrição não tira a parcela da compra
    await prisma.transaction.update({
      where: { id },
      data: { description, amount, type, date, accountId, categoryId },
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return { error: "Transação não encontrada ou erro ao salvar." };
  }

  revalidate();
  return { success: true };
}

export async function deleteTransaction(id: string) {
  try {
    await prisma.transaction.delete({ where: { id } });
    revalidate();
    return { success: true };
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return { error: "Erro interno ao tentar excluir." };
  }
}

/** Exclui todas as parcelas da mesma compra (mesmo installmentGroupId), não só a linha clicada. */
export async function deleteTransactionGroup(id: string) {
  try {
    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) {
      return { error: "Transação não encontrada" };
    }

    if (!tx.installmentGroupId) {
      // não é uma parcela — comportamento igual ao excluir normal
      await prisma.transaction.delete({ where: { id } });
      revalidate();
      return { success: true, count: 1 };
    }

    const result = await prisma.transaction.deleteMany({
      where: { installmentGroupId: tx.installmentGroupId },
    });

    revalidate();
    return { success: true, count: result.count };
  } catch (error) {
    console.error("Error deleting transaction group:", error);
    return { error: "Erro interno ao tentar excluir o grupo de parcelas." };
  }
}

export async function getTransactions(filters?: {
  range?: DateRange;
  categoryId?: string;
  type?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.range) {
    where.date = { gte: filters.range.start, lt: filters.range.end };
  }

  if (filters?.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters?.type) {
    where.type = filters.type;
  }

  return prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      category: { select: { name: true, color: true, icon: true } },
      account: { select: { name: true } },
    },
  });
}

export async function getAccounts() {
  return prisma.account.findMany({ orderBy: { name: "asc" } });
}

export async function getCategories(type?: string) {
  return prisma.category.findMany({
    where: type ? { type } : undefined,
    orderBy: { name: "asc" },
  });
}

export async function createCategory(formData: FormData) {
  const parsed = categorySchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const category = await prisma.category.create({ data: parsed.data });

  revalidate();
  return { success: true, category };
}

/**
 * Importa transações em lote (ex: fatura/extrato exportado em CSV).
 * Cada linha já vem com sua própria categoria (editável por linha na
 * pré-visualização). Ignora linhas que já existem (mesma conta + data +
 * descrição + valor) para permitir reimportar um arquivo sem duplicar.
 * Linhas "Loja (n/N)" da mesma compra ganham o mesmo grupo de parcelas —
 * reaproveitando o grupo de uma importação anterior, se já existir.
 */
export async function importTransactions(input: unknown) {
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { accountId, rows } = parsed.data;

  const account = await prisma.account.findUnique({ where: { id: accountId }, select: { id: true } });
  if (!account) return { error: "Conta não encontrada" };

  const categoryIds = [...new Set(rows.map((r) => r.categoryId))];
  const foundCategories = await prisma.category.count({ where: { id: { in: categoryIds } } });
  if (foundCategories !== categoryIds.length) return { error: "Alguma categoria não foi encontrada" };

  const timestamps = rows.map((r) => r.date.getTime());
  const minDate = new Date(Math.min(...timestamps));
  const maxDate = new Date(Math.max(...timestamps));

  const existing = await prisma.transaction.findMany({
    where: { accountId, date: { gte: minDate, lte: maxDate } },
    select: { date: true, description: true, amount: true },
  });
  const existingKeys = new Set(
    existing.map((e) => `${e.date.getTime()}|${e.description}|${Number(e.amount).toFixed(2)}`)
  );

  const groupIds = new Map<string, string>();
  async function groupIdFor(key: string, baseName: string, total: number, type: string, categoryId: string) {
    let groupId = groupIds.get(key);
    if (!groupId) {
      const previous = await prisma.transaction.findFirst({
        where: {
          accountId,
          type,
          categoryId,
          installmentTotal: total,
          installmentGroupId: { not: null },
          description: { startsWith: `${baseName} (` },
        },
        select: { installmentGroupId: true },
      });
      groupId = previous?.installmentGroupId ?? randomUUID();
      groupIds.set(key, groupId);
    }
    return groupId;
  }

  const toCreate = [];
  let skipped = 0;

  for (const row of rows) {
    const key = `${row.date.getTime()}|${row.description}|${row.amount.toFixed(2)}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }
    existingKeys.add(key); // evita duplicar dentro do próprio arquivo

    const installment = importInstallmentKey(row);
    toCreate.push({
      description: row.description,
      amount: row.amount,
      type: row.type,
      date: row.date,
      accountId,
      categoryId: row.categoryId,
      ...(installment && {
        installmentGroupId: await groupIdFor(installment.key, installment.baseName, installment.total, row.type, row.categoryId),
        installmentNumber: installment.current,
        installmentTotal: installment.total,
      }),
    });
  }

  if (toCreate.length > 0) {
    await prisma.transaction.createMany({ data: toCreate });
  }

  revalidate();
  return { success: true, imported: toCreate.length, skipped };
}

/** Exclui várias transações selecionadas de uma vez (seleção múltipla na tabela). */
export async function deleteTransactions(ids: unknown) {
  const parsed = idListSchema.safeParse(ids);
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    const result = await prisma.transaction.deleteMany({ where: { id: { in: parsed.data } } });
    revalidate();
    return { success: true, count: result.count };
  } catch (error) {
    console.error("Error deleting transactions:", error);
    return { error: "Erro interno ao tentar excluir." };
  }
}

/** Muda a categoria de várias transações selecionadas de uma vez. */
export async function updateTransactionsCategory(ids: unknown, categoryId: unknown) {
  const parsed = idListSchema.safeParse(ids);
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (typeof categoryId !== "string" || !categoryId) {
    return { error: "Selecione uma categoria" };
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { type: true } });
  if (!category) return { error: "Categoria não encontrada" };

  try {
    // Só muda transações do mesmo tipo da categoria (não põe "Salário" numa despesa)
    const result = await prisma.transaction.updateMany({
      where: { id: { in: parsed.data }, type: category.type },
      data: { categoryId },
    });
    revalidate();
    return { success: true, count: result.count };
  } catch (error) {
    console.error("Error updating transactions category:", error);
    return { error: "Erro interno ao tentar atualizar a categoria." };
  }
}
