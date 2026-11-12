"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireUser } from "./dal";
import { budgetsSchema, firstError } from "./validation";

/** Salva os limites mensais do orçamento (só nas categorias de despesa do usuário). */
export async function saveBudgets(entries: unknown) {
  const { id: userId } = await requireUser();
  const parsed = budgetsSchema.safeParse(entries);
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    await prisma.$transaction(
      parsed.data.map(({ categoryId, monthlyBudget }) =>
        prisma.category.updateMany({
          where: { id: categoryId, userId, type: "despesa" },
          data: { monthlyBudget: monthlyBudget && monthlyBudget > 0 ? monthlyBudget : null },
        })
      )
    );
  } catch (error) {
    console.error("Error saving budgets:", error);
    return { error: "Erro interno ao salvar o orçamento." };
  }

  revalidatePath("/");
  return { success: true };
}
