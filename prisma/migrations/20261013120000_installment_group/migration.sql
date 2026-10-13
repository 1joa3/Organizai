-- Parcelas passam a ser agrupadas por campos próprios em vez do texto
-- "(n/N)" da descrição (que quebrava o agrupamento ao editar a descrição).
ALTER TABLE "Transaction" ADD COLUMN "installmentGroupId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "installmentNumber" INTEGER;
ALTER TABLE "Transaction" ADD COLUMN "installmentTotal" INTEGER;

CREATE INDEX "Transaction_installmentGroupId_idx" ON "Transaction"("installmentGroupId");

-- Preenche as parcelas já existentes a partir da descrição. Mesma compra =
-- mesma conta + categoria + tipo + nome base + total de parcelas (o mesmo
-- critério que "excluir a compra toda" usava até aqui).
UPDATE "Transaction" AS t
SET
  "installmentNumber" = (m.parts)[2]::INTEGER,
  "installmentTotal" = (m.parts)[3]::INTEGER,
  "installmentGroupId" = md5(t."accountId" || '|' || t."categoryId" || '|' || t."type" || '|' || (m.parts)[1] || '|' || (m.parts)[3])
FROM (
  SELECT "id", regexp_match("description", '^(.*) \((\d+)/(\d+)\)$') AS parts
  FROM "Transaction"
) AS m
WHERE t."id" = m."id" AND m.parts IS NOT NULL;
