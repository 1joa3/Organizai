"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
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
  const { id: userId } = await requireUser();
  const result = parseInvestment(formData);
  if ("error" in result) return { error: result.error };

  await prisma.investment.create({ data: { ...result.data, userId } });

  revalidate();
  return { success: true };
}

export async function updateInvestment(id: string, formData: FormData) {
  const { id: userId } = await requireUser();
  const result = parseInvestment(formData);
  if ("error" in result) return { error: result.error };

  try {
    const updated = await prisma.investment.updateMany({ where: { id, userId }, data: result.data });
    if (updated.count === 0) return { error: "Investimento não encontrado." };
  } catch (error) {
    console.error("Error updating investment:", error);
    return { error: "Erro interno ao salvar o investimento." };
  }

  revalidate();
  return { success: true };
}

export async function deleteInvestment(id: string) {
  const { id: userId } = await requireUser();
  try {
    const result = await prisma.investment.deleteMany({ where: { id, userId } });
    if (result.count === 0) return { error: "Investimento não encontrado." };
  } catch (error) {
    console.error("Error deleting investment:", error);
    return { error: "Investimento não encontrado." };
  }
  revalidate();
  return { success: true };
}

export async function getInvestments() {
  const { id: userId } = await requireUser();
  return prisma.investment.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
}
