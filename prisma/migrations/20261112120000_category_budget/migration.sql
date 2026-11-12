-- Orçamento por categoria: limite de gasto mensal (null = sem limite)
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "monthlyBudget" DECIMAL(12,2);
