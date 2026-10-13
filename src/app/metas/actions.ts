"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { firstError, formToObject, goalContributionSchema, goalSchema } from "@/lib/validation";

function revalidate() {
  revalidatePath("/metas");
  revalidatePath("/");
}

export async function createGoal(formData: FormData) {
  const parsed = goalSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  await prisma.goal.create({ data: parsed.data });

  revalidate();
  return { success: true };
}

export async function updateGoal(id: string, formData: FormData) {
  const parsed = goalSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    await prisma.goal.update({ where: { id }, data: parsed.data });
  } catch (error) {
    console.error("Error updating goal:", error);
    return { error: "Meta não encontrada ou erro ao salvar." };
  }

  revalidate();
  return { success: true };
}

export async function deleteGoal(id: string) {
  try {
    await prisma.goal.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting goal:", error);
    return { error: "Meta não encontrada." };
  }
  revalidate();
  return { success: true };
}

export async function addAmountToGoal(id: string, formData: FormData) {
  const parsed = goalContributionSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    await prisma.goal.update({
      where: { id },
      data: { currentAmount: { increment: parsed.data.amount } },
    });
  } catch (error) {
    console.error("Error adding to goal:", error);
    return { error: "Meta não encontrada." };
  }

  revalidate();
  return { success: true };
}

export async function getGoals() {
  return prisma.goal.findMany({
    orderBy: { createdAt: "desc" },
  });
}
