"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createGoal(formData: FormData) {
  const name = formData.get("name") as string;
  const targetAmount = parseFloat(formData.get("targetAmount") as string);
  const currentAmount = parseFloat(formData.get("currentAmount") as string) || 0;
  const deadlineStr = formData.get("deadline") as string;
  const color = (formData.get("color") as string) || "#FBBF24";

  if (!name || isNaN(targetAmount) || targetAmount <= 0) {
    return { error: "Dados inválidos" };
  }

  await prisma.goal.create({
    data: {
      name,
      targetAmount,
      currentAmount,
      deadline: deadlineStr ? new Date(deadlineStr) : null,
      color,
    },
  });

  revalidatePath("/metas");
  revalidatePath("/");
  return { success: true };
}

export async function updateGoal(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const targetAmount = parseFloat(formData.get("targetAmount") as string);
  const currentAmount = parseFloat(formData.get("currentAmount") as string) || 0;
  const deadlineStr = formData.get("deadline") as string;
  const color = (formData.get("color") as string) || "#FBBF24";

  if (!name || isNaN(targetAmount) || targetAmount <= 0) {
    return { error: "Dados inválidos" };
  }

  await prisma.goal.update({
    where: { id },
    data: {
      name,
      targetAmount,
      currentAmount,
      deadline: deadlineStr ? new Date(deadlineStr) : null,
      color,
    },
  });

  revalidatePath("/metas");
  revalidatePath("/");
  return { success: true };
}

export async function deleteGoal(id: string) {
  await prisma.goal.delete({ where: { id } });
  revalidatePath("/metas");
  revalidatePath("/");
  return { success: true };
}

export async function addAmountToGoal(id: string, formData: FormData) {
  const amountStr = formData.get("amount") as string;
  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount <= 0) {
    return { error: "Valor inválido" };
  }

  await prisma.goal.update({
    where: { id },
    data: {
      currentAmount: {
        increment: amount
      }
    },
  });

  revalidatePath("/metas");
  revalidatePath("/");
  return { success: true };
}

export async function getGoals() {
  return prisma.goal.findMany({
    orderBy: { createdAt: "desc" },
  });
}
