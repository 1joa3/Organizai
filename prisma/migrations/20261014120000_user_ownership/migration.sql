-- Multiusuário: cada registro passa a ter um dono (id do usuário no
-- Supabase Auth). Fica nulo nos dados antigos até o dono original entrar
-- pela primeira vez — aí eles são atribuídos a ele (ver src/lib/dal.ts).
ALTER TABLE "Account" ADD COLUMN "userId" TEXT;
ALTER TABLE "Category" ADD COLUMN "userId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "userId" TEXT;
ALTER TABLE "Investment" ADD COLUMN "userId" TEXT;
ALTER TABLE "Goal" ADD COLUMN "userId" TEXT;

CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "Category_userId_idx" ON "Category"("userId");
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");
CREATE INDEX "Investment_userId_idx" ON "Investment"("userId");
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");
