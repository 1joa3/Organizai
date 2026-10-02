"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
