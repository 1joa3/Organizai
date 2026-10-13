import { prisma } from "./prisma";
import { DEFAULT_ACCOUNT, DEFAULT_CATEGORIES } from "./defaults";

/**
 * Deixa o usuário pronto para usar o app:
 * - o dono original (LEGACY_OWNER_EMAIL) recebe os dados de antes do
 *   multiusuário, que estão sem dono (userId nulo);
 * - quem não tem conta nem categoria ganha as padrão.
 * Idempotente: depois da primeira vez, só faz duas contagens.
 */
export async function ensureUserSetup(userId: string, email: string | null, legacyOwnerEmail = process.env.LEGACY_OWNER_EMAIL) {
  const [accounts, categories] = await Promise.all([
    prisma.account.count({ where: { userId } }),
    prisma.category.count({ where: { userId } }),
  ]);
  if (accounts > 0 && categories > 0) return;

  if (email && legacyOwnerEmail && email.toLowerCase() === legacyOwnerEmail.trim().toLowerCase()) {
    const unclaimed = { where: { userId: null }, data: { userId } };
    await prisma.$transaction([
      prisma.account.updateMany(unclaimed),
      prisma.category.updateMany(unclaimed),
      prisma.transaction.updateMany(unclaimed),
      prisma.investment.updateMany(unclaimed),
      prisma.goal.updateMany(unclaimed),
    ]);
  }

  const [accountsNow, categoriesNow] = await Promise.all([
    prisma.account.count({ where: { userId } }),
    prisma.category.count({ where: { userId } }),
  ]);
  if (accountsNow === 0) {
    await prisma.account.create({ data: { ...DEFAULT_ACCOUNT, userId } });
  }
  if (categoriesNow === 0) {
    await prisma.category.createMany({ data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })) });
  }
}
