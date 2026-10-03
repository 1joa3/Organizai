"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseInstallmentDescription, escapeRegExp } from "@/lib/installments";

export async function createTransaction(formData: FormData) {
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const type = formData.get("type") as string;
  const date = new Date(formData.get("date") as string);
  const accountId = formData.get("accountId") as string;
  const categoryId = formData.get("categoryId") as string;
  const installmentsStr = formData.get("installments");
  const installments = installmentsStr ? parseInt(installmentsStr as string) : 1;

  if (!description || isNaN(amount) || amount <= 0) {
    return { error: "Dados inválidos" };
  }

  if (type === "despesa" && installments > 1) {
    const installmentAmount = parseFloat((amount / installments).toFixed(2));
    const dataToCreate = [];
    
    for (let i = 0; i < installments; i++) {
      const installmentDate = new Date(date);
      installmentDate.setMonth(installmentDate.getMonth() + i);
      
      dataToCreate.push({
        description: `${description} (${i + 1}/${installments})`,
        amount: installmentAmount,
        type,
        date: installmentDate,
        accountId,
        categoryId,
      });
    }

    await prisma.transaction.createMany({
      data: dataToCreate,
    });
  } else {
    await prisma.transaction.create({
      data: {
        description,
        amount,
        type,
        date,
        accountId,
        categoryId,
      },
    });
  }

  revalidatePath("/transacoes");
  revalidatePath("/");
  return { success: true };
}

export async function updateTransaction(id: string, formData: FormData) {
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const type = formData.get("type") as string;
  const date = new Date(formData.get("date") as string);
  const accountId = formData.get("accountId") as string;
  const categoryId = formData.get("categoryId") as string;

  if (!description || isNaN(amount) || amount <= 0) {
    return { error: "Dados inválidos" };
  }

  await prisma.transaction.update({
    where: { id },
    data: {
      description,
      amount,
      type,
      date,
      accountId,
      categoryId,
    },
  });

  revalidatePath("/transacoes");
  revalidatePath("/");
  return { success: true };
}

export async function deleteTransaction(id: string) {
  try {
    await prisma.transaction.delete({ where: { id } });
    revalidatePath("/transacoes");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return { error: "Erro interno ao tentar excluir." };
  }
}

/**
 * Exclui todas as parcelas de uma mesma compra (mesma conta + categoria +
 * nome base + total de parcelas), não só a linha clicada. Cada parcela é
 * uma transação independente no banco, então excluir "uma parcela" nunca
 * removia o resto da compra — isso resolve esse problema.
 */
export async function deleteTransactionGroup(id: string) {
  try {
    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) {
      return { error: "Transação não encontrada" };
    }

    const info = parseInstallmentDescription(tx.description);
    if (!info) {
      // não é uma parcela — comportamento igual ao excluir normal
      await prisma.transaction.delete({ where: { id } });
      revalidatePath("/transacoes");
      revalidatePath("/");
      return { success: true, count: 1 };
    }

    const pattern = new RegExp(`^${escapeRegExp(info.baseName)} \\(\\d+/${info.total}\\)$`);
    const candidates = await prisma.transaction.findMany({
      where: { accountId: tx.accountId, categoryId: tx.categoryId, type: tx.type },
      select: { id: true, description: true },
    });
    const groupIds = candidates.filter((c) => pattern.test(c.description)).map((c) => c.id);

    await prisma.transaction.deleteMany({ where: { id: { in: groupIds } } });

    revalidatePath("/transacoes");
    revalidatePath("/");
    return { success: true, count: groupIds.length };
  } catch (error) {
    console.error("Error deleting transaction group:", error);
    return { error: "Erro interno ao tentar excluir o grupo de parcelas." };
  }
}

export async function getTransactions(filters?: {
  month?: number;
  year?: number;
  categoryId?: string;
  type?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.month && filters?.year) {
    const startDate = new Date(filters.year, filters.month - 1, 1);
    const endDate = new Date(filters.year, filters.month, 1);
    where.date = { gte: startDate, lt: endDate };
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
  const name = (formData.get("name") as string)?.trim();
  const type = formData.get("type") as string;
  const color = (formData.get("color") as string) || "#00E5FF";

  if (!name) {
    return { error: "Informe um nome para a categoria" };
  }
  if (type !== "receita" && type !== "despesa") {
    return { error: "Tipo de categoria inválido" };
  }

  const category = await prisma.category.create({
    data: { name, type, color },
  });

  revalidatePath("/transacoes");
  revalidatePath("/");
  return { success: true, category };
}

interface ImportRow {
  date: string;
  description: string;
  amount: number;
  type: string;
}

/**
 * Importa transações em lote (ex: fatura/extrato exportado em CSV).
 * Ignora linhas que já existem (mesma conta + data + descrição + valor)
 * para permitir reimportar um arquivo sem duplicar.
 */
export async function importTransactions(input: {
  accountId: string;
  categoryId: string;
  rows: ImportRow[];
}) {
  const { accountId, categoryId, rows } = input;

  if (!accountId || !categoryId) {
    return { error: "Selecione a conta e a categoria" };
  }
  if (!rows || rows.length === 0) {
    return { error: "Nenhuma linha válida para importar" };
  }

  const parsedRows = rows
    .map((r) => ({ ...r, date: new Date(r.date) }))
    .filter((r) => !isNaN(r.date.getTime()) && r.description && r.amount > 0);

  if (parsedRows.length === 0) {
    return { error: "Nenhuma linha válida para importar" };
  }

  const timestamps = parsedRows.map((r) => r.date.getTime());
  const minDate = new Date(Math.min(...timestamps));
  const maxDate = new Date(Math.max(...timestamps));

  const existing = await prisma.transaction.findMany({
    where: { accountId, date: { gte: minDate, lte: maxDate } },
    select: { date: true, description: true, amount: true },
  });
  const existingKeys = new Set(
    existing.map((e) => `${e.date.getTime()}|${e.description}|${Number(e.amount).toFixed(2)}`)
  );

  const toCreate: {
    description: string;
    amount: number;
    type: string;
    date: Date;
    accountId: string;
    categoryId: string;
  }[] = [];
  let skipped = 0;

  for (const row of parsedRows) {
    const key = `${row.date.getTime()}|${row.description}|${row.amount.toFixed(2)}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }
    existingKeys.add(key); // evita duplicar dentro do próprio arquivo
    toCreate.push({
      description: row.description,
      amount: row.amount,
      type: row.type === "receita" ? "receita" : "despesa",
      date: row.date,
      accountId,
      categoryId,
    });
  }

  if (toCreate.length > 0) {
    await prisma.transaction.createMany({ data: toCreate });
  }

  revalidatePath("/transacoes");
  revalidatePath("/");
  return { success: true, imported: toCreate.length, skipped };
}
