"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { firstError, formToObject, goalContributionSchema, goalSchema } from "@/lib/validation";

function revalidate() {
  revalidatePath("/metas");
  revalidatePath("/");
}

export async function createGoal(formData: FormData) {
  const { id: userId } = await requireUser();
  const parsed = goalSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  await prisma.goal.create({ data: { ...parsed.data, userId } });

  revalidate();
  return { success: true };
}

export async function updateGoal(id: string, formData: FormData) {
  const { id: userId } = await requireUser();
  const parsed = goalSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    const result = await prisma.goal.updateMany({ where: { id, userId }, data: parsed.data });
    if (result.count === 0) return { error: "Meta não encontrada." };
  } catch (error) {
    console.error("Error updating goal:", error);
    return { error: "Erro interno ao salvar a meta." };
  }

  revalidate();
  return { success: true };
}

export async function deleteGoal(id: string) {
  const { id: userId } = await requireUser();
  try {
    const result = await prisma.goal.deleteMany({ where: { id, userId } });
    if (result.count === 0) return { error: "Meta não encontrada." };
  } catch (error) {
    console.error("Error deleting goal:", error);
    return { error: "Meta não encontrada." };
  }
  revalidate();
  return { success: true };
}

export async function addAmountToGoal(id: string, formData: FormData) {
  const { id: userId } = await requireUser();
  const parsed = goalContributionSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    const result = await prisma.goal.updateMany({
      where: { id, userId },
      data: { currentAmount: { increment: parsed.data.amount } },
    });
    if (result.count === 0) return { error: "Meta não encontrada." };
  } catch (error) {
    console.error("Error adding to goal:", error);
    return { error: "Meta não encontrada." };
  }

  revalidate();
  return { success: true };
}

export async function getGoals() {
  const { id: userId } = await requireUser();
  return prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
