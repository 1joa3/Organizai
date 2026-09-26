import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Contas ───
  const nubank = await prisma.account.upsert({
    where: { id: "acc-nubank" },
    update: {},
    create: { id: "acc-nubank", name: "Nubank", type: "corrente" },
  });

  const bradesco = await prisma.account.upsert({
    where: { id: "acc-bradesco" },
    update: {},
    create: { id: "acc-bradesco", name: "Bradesco", type: "corrente" },
  });

  const carteira = await prisma.account.upsert({
    where: { id: "acc-carteira" },
    update: {},
    create: { id: "acc-carteira", name: "Carteira", type: "carteira" },
  });

  // ─── Categorias de Despesa ───
  const despesaCategories = [
    { id: "cat-moradia",      name: "Moradia",       color: "#F87171", icon: "🏠" },
    { id: "cat-alimentacao",  name: "Alimentação",   color: "#FB923C", icon: "🍔" },
    { id: "cat-transporte",   name: "Transporte",    color: "#FBBF24", icon: "🚗" },
    { id: "cat-saude",        name: "Saúde",         color: "#34D399", icon: "💊" },
    { id: "cat-educacao",     name: "Educação",      color: "#60A5FA", icon: "📚" },
    { id: "cat-lazer",        name: "Lazer",         color: "#A78BFA", icon: "🎮" },
    { id: "cat-vestuario",    name: "Vestuário",     color: "#F472B6", icon: "👕" },
    { id: "cat-servicos",     name: "Serviços",      color: "#818CF8", icon: "📱" },
    { id: "cat-outros-desp",  name: "Outros",        color: "#6B7280", icon: "📦" },
  ];

  for (const cat of despesaCategories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: { ...cat, type: "despesa" },
    });
  }

  // ─── Categorias de Receita ───
  const receitaCategories = [
    { id: "cat-salario",      name: "Salário",       color: "#34D399", icon: "💰" },
    { id: "cat-freelance",    name: "Freelance",     color: "#60A5FA", icon: "💻" },
    { id: "cat-investimento", name: "Rendimentos",   color: "#FBBF24", icon: "📈" },
    { id: "cat-outros-rec",   name: "Outros",        color: "#6B7280", icon: "💵" },
  ];

  for (const cat of receitaCategories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: { ...cat, type: "receita" },
    });
  }

  // ─── Transações de exemplo ───
  const now = new Date();
  const thisMonth = (day: number) =>
    new Date(now.getFullYear(), now.getMonth(), day);
  const lastMonth = (day: number) =>
    new Date(now.getFullYear(), now.getMonth() - 1, day);

  const sampleTransactions = [
    // Receitas
    { description: "Salário mensal",        amount: 8500,   type: "receita", date: thisMonth(5),  accountId: nubank.id,   categoryId: "cat-salario" },
    { description: "Projeto freelance",     amount: 2200,   type: "receita", date: thisMonth(12), accountId: nubank.id,   categoryId: "cat-freelance" },
    { description: "Salário mensal",        amount: 8500,   type: "receita", date: lastMonth(5),  accountId: nubank.id,   categoryId: "cat-salario" },

    // Despesas
    { description: "Aluguel",               amount: 2200,   type: "despesa", date: thisMonth(1),  accountId: nubank.id,   categoryId: "cat-moradia" },
    { description: "Supermercado",          amount: 850,    type: "despesa", date: thisMonth(3),  accountId: bradesco.id, categoryId: "cat-alimentacao" },
    { description: "Uber + Gasolina",       amount: 420,    type: "despesa", date: thisMonth(7),  accountId: nubank.id,   categoryId: "cat-transporte" },
    { description: "Plano de saúde",        amount: 590,    type: "despesa", date: thisMonth(10), accountId: nubank.id,   categoryId: "cat-saude" },
    { description: "Curso Udemy",           amount: 39.90,  type: "despesa", date: thisMonth(8),  accountId: nubank.id,   categoryId: "cat-educacao" },
    { description: "Cinema + Jantar",       amount: 180,    type: "despesa", date: thisMonth(14), accountId: carteira.id, categoryId: "cat-lazer" },
    { description: "Celular + Internet",    amount: 169,    type: "despesa", date: thisMonth(15), accountId: nubank.id,   categoryId: "cat-servicos" },
    { description: "Restaurante",           amount: 95,     type: "despesa", date: thisMonth(11), accountId: carteira.id, categoryId: "cat-alimentacao" },

    // Despesas mês anterior
    { description: "Aluguel",               amount: 2200,   type: "despesa", date: lastMonth(1),  accountId: nubank.id,   categoryId: "cat-moradia" },
    { description: "Supermercado",          amount: 780,    type: "despesa", date: lastMonth(4),  accountId: bradesco.id, categoryId: "cat-alimentacao" },
    { description: "Farmácia",             amount: 125,    type: "despesa", date: lastMonth(9),  accountId: nubank.id,   categoryId: "cat-saude" },
  ];

  for (const tx of sampleTransactions) {
    await prisma.transaction.create({ data: tx });
  }

  // ─── Investimentos ───
  const sampleInvestments = [
    { asset: "Tesouro Selic 2029",    assetType: "renda_fixa",      investedAmount: 15000, currentAmount: 16234.50, date: lastMonth(10), notes: "Reserva de emergência" },
    { asset: "IVVB11",                assetType: "renda_variavel",  investedAmount: 5000,  currentAmount: 5430.20,  date: lastMonth(15), notes: "ETF S&P 500" },
    { asset: "Bitcoin",               assetType: "cripto",          investedAmount: 2000,  currentAmount: 2340.80,  date: thisMonth(2),  notes: "DCA mensal" },
    { asset: "XP Macro FIC FIM",      assetType: "fundo",           investedAmount: 8000,  currentAmount: 8290.15,  date: lastMonth(20), notes: "Fundo multimercado" },
  ];

  for (const inv of sampleInvestments) {
    await prisma.investment.create({ data: inv });
  }

  // ─── Metas ───
  const sampleGoals = [
    { name: "Reserva de emergência",  targetAmount: 50000,  currentAmount: 16234.50, deadline: new Date(2025, 11, 31), color: "#34D399" },
    { name: "Viagem Europa",          targetAmount: 25000,  currentAmount: 8500,     deadline: new Date(2025, 5, 1),   color: "#60A5FA" },
    { name: "Notebook novo",          targetAmount: 8000,   currentAmount: 3200,     deadline: new Date(2025, 2, 1),   color: "#FBBF24" },
  ];

  for (const goal of sampleGoals) {
    await prisma.goal.create({ data: goal });
  }

  console.log("✅ Seed complete!");
  console.log(`   ${despesaCategories.length + receitaCategories.length} categorias`);
  console.log(`   3 contas`);
  console.log(`   ${sampleTransactions.length} transações`);
  console.log(`   ${sampleInvestments.length} investimentos`);
  console.log(`   ${sampleGoals.length} metas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
