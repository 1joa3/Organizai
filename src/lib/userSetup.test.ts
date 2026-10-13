import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "./prisma";
import { ensureUserSetup } from "./userSetup";
import { DEFAULT_CATEGORIES } from "./defaults";

const OWNER_EMAIL = "dono@exemplo.com";

async function clean() {
  await prisma.transaction.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.category.deleteMany();
  await prisma.account.deleteMany();
}

beforeEach(clean);
afterAll(async () => {
  await clean();
  await prisma.$disconnect();
});

/** Dados de antes do multiusuário: sem dono. */
async function createLegacyData() {
  const account = await prisma.account.create({ data: { name: "Nubank", type: "corrente" } });
  const category = await prisma.category.create({ data: { name: "Mercado", type: "despesa", color: "#FFFFFF" } });
  await prisma.transaction.create({
    data: { description: "Compra antiga", amount: 50, type: "despesa", date: new Date(), accountId: account.id, categoryId: category.id },
  });
  await prisma.goal.create({ data: { name: "Meta antiga", targetAmount: 100, currentAmount: 0 } });
}

describe("ensureUserSetup", () => {
  it("o dono original recebe os dados antigos e não ganha padrões duplicados", async () => {
    await createLegacyData();

    await ensureUserSetup("owner-id", "Dono@Exemplo.com", OWNER_EMAIL);

    expect(await prisma.transaction.count({ where: { userId: "owner-id" } })).toBe(1);
    expect(await prisma.goal.count({ where: { userId: "owner-id" } })).toBe(1);
    expect(await prisma.account.findMany({ where: { userId: "owner-id" }, select: { name: true } })).toEqual([{ name: "Nubank" }]);
    expect(await prisma.category.count({ where: { userId: "owner-id" } })).toBe(1);
    expect(await prisma.transaction.count({ where: { userId: null } })).toBe(0);
  });

  it("outro usuário não recebe os dados antigos: começa com conta e categorias padrão", async () => {
    await createLegacyData();

    await ensureUserSetup("new-id", "outra@pessoa.com", OWNER_EMAIL);

    expect(await prisma.transaction.count({ where: { userId: "new-id" } })).toBe(0);
    expect(await prisma.account.count({ where: { userId: "new-id" } })).toBe(1);
    expect(await prisma.category.count({ where: { userId: "new-id" } })).toBe(DEFAULT_CATEGORIES.length);
    // os dados antigos continuam esperando o dono
    expect(await prisma.transaction.count({ where: { userId: null } })).toBe(1);
  });

  it("é idempotente: rodar de novo não cria nada a mais", async () => {
    await ensureUserSetup("new-id", "outra@pessoa.com", OWNER_EMAIL);
    await ensureUserSetup("new-id", "outra@pessoa.com", OWNER_EMAIL);

    expect(await prisma.account.count({ where: { userId: "new-id" } })).toBe(1);
    expect(await prisma.category.count({ where: { userId: "new-id" } })).toBe(DEFAULT_CATEGORIES.length);
  });

  it("sem LEGACY_OWNER_EMAIL configurado, ninguém reivindica os dados antigos", async () => {
    await createLegacyData();

    await ensureUserSetup("owner-id", OWNER_EMAIL, undefined);

    expect(await prisma.transaction.count({ where: { userId: null } })).toBe(1);
  });
});
