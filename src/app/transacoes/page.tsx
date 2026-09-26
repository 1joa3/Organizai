import { getTransactions, getAccounts, getCategories } from "./actions";
import TransactionsClient from "./TransactionsClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function TransacoesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const now = new Date();
  const month = params.month ? Number(params.month) : now.getMonth() + 1;
  const year = params.year ? Number(params.year) : now.getFullYear();

  const [transactions, accounts, categories] = await Promise.all([
    getTransactions({ month, year }),
    getAccounts(),
    getCategories(),
  ]);

  // Serializar Decimal para number
  const serializedTransactions = transactions.map((t) => ({
    ...t,
    amount: Number(t.amount),
    date: t.date.toISOString(),
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <TransactionsClient
      transactions={serializedTransactions}
      accounts={accounts}
      categories={categories}
      month={month}
      year={year}
    />
  );
}
