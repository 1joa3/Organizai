"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { firstError, formToObject, investmentSchema } from "@/lib/validation";

function revalidate() {
  revalidatePath("/investimentos");
  revalidatePath("/");
}

function parseInvestment(formData: FormData) {
  const parsed = investmentSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) } as const;
  const { currentAmount, ...rest } = parsed.data;
  // Sem valor atual informado, assume o valor investido
  return { data: { ...rest, currentAmount: currentAmount ?? rest.investedAmount } } as const;
}

export async function createInvestment(formData: FormData) {
  const result = parseInvestment(formData);
  if ("error" in result) return { error: result.error };

  await prisma.investment.create({ data: result.data });

  revalidate();
  return { success: true };
}

export async function updateInvestment(id: string, formData: FormData) {
  const result = parseInvestment(formData);
  if ("error" in result) return { error: result.error };

  try {
    await prisma.investment.update({ where: { id }, data: result.data });
  } catch (error) {
    console.error("Error updating investment:", error);
    return { error: "Investimento não encontrado ou erro ao salvar." };
  }

  revalidate();
  return { success: true };
}

export async function deleteInvestment(id: string) {
  try {
    await prisma.investment.delete({ where: { id } });
  } catch (error) {
    console.error("Error deleting investment:", error);
    return { error: "Investimento não encontrado." };
  }
  revalidate();
  return { success: true };
}

export async function getInvestments() {
  return prisma.investment.findMany({
    orderBy: { date: "desc" },
  });
}
