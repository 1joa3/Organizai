import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed enxuto para o primeiro deploy: apenas categorias padrão e uma conta
 * inicial, sem transações/investimentos/metas de exemplo (que são só para
 * o ambiente de desenvolvimento, ver seed.ts).
 */
async function main() {
  console.log("🌱 Seeding production database...");

  await prisma.account.upsert({
    where: { id: "acc-principal" },
    update: {},
    create: { id: "acc-principal", name: "Conta Principal", type: "corrente" },
  });

  const despesaCategories = [
    { id: "cat-moradia", name: "Moradia", color: "#F87171" },
    { id: "cat-alimentacao", name: "Alimentação", color: "#FB923C" },
    { id: "cat-transporte", name: "Transporte", color: "#FBBF24" },
    { id: "cat-saude", name: "Saúde", color: "#34D399" },
    { id: "cat-educacao", name: "Educação", color: "#60A5FA" },
    { id: "cat-lazer", name: "Lazer", color: "#A78BFA" },
    { id: "cat-vestuario", name: "Vestuário", color: "#F472B6" },
    { id: "cat-servicos", name: "Serviços", color: "#818CF8" },
    { id: "cat-outros-desp", name: "Outros", color: "#6B7280" },
  ];

  for (const cat of despesaCategories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: { ...cat, type: "despesa" },
    });
  }

  const receitaCategories = [
    { id: "cat-salario", name: "Salário", color: "#34D399" },
    { id: "cat-freelance", name: "Freelance", color: "#60A5FA" },
    { id: "cat-investimento", name: "Rendimentos", color: "#FBBF24" },
    { id: "cat-outros-rec", name: "Outros", color: "#6B7280" },
  ];

  for (const cat of receitaCategories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: { ...cat, type: "receita" },
    });
  }

  console.log("✅ Seed de produção completo!");
  console.log(`   1 conta`);
  console.log(`   ${despesaCategories.length + receitaCategories.length} categorias`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
