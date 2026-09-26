"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createInvestment(formData: FormData) {
  const asset = formData.get("asset") as string;
  const assetType = formData.get("assetType") as string;
  const investedAmount = parseFloat(formData.get("investedAmount") as string);
  const currentAmount = parseFloat(formData.get("currentAmount") as string);
  const date = new Date(formData.get("date") as string);
  const notes = (formData.get("notes") as string) || null;

  if (!asset || isNaN(investedAmount) || investedAmount <= 0) {
    return { error: "Dados inválidos" };
  }

  await prisma.investment.create({
    data: {
      asset,
      assetType,
      investedAmount,
      currentAmount: isNaN(currentAmount) ? investedAmount : currentAmount,
      date,
      notes,
    },
  });

  revalidatePath("/investimentos");
  revalidatePath("/");
  return { success: true };
}

export async function updateInvestment(id: string, formData: FormData) {
  const asset = formData.get("asset") as string;
  const assetType = formData.get("assetType") as string;
  const investedAmount = parseFloat(formData.get("investedAmount") as string);
  const currentAmount = parseFloat(formData.get("currentAmount") as string);
  const date = new Date(formData.get("date") as string);
  const notes = (formData.get("notes") as string) || null;

  if (!asset || isNaN(investedAmount) || investedAmount <= 0) {
    return { error: "Dados inválidos" };
  }

  await prisma.investment.update({
    where: { id },
    data: {
      asset,
      assetType,
      investedAmount,
      currentAmount: isNaN(currentAmount) ? investedAmount : currentAmount,
      date,
      notes,
    },
  });

  revalidatePath("/investimentos");
  revalidatePath("/");
  return { success: true };
}

export async function deleteInvestment(id: string) {
  await prisma.investment.delete({ where: { id } });
  revalidatePath("/investimentos");
  revalidatePath("/");
  return { success: true };
}

export async function getInvestments() {
  return prisma.investment.findMany({
    orderBy: { date: "desc" },
  });
}
