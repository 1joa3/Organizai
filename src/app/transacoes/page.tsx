import { getAccounts, getCategories } from "./actions";
import TransactionsClient from "./TransactionsClient";
import { cookies } from "next/headers";
import { PERIOD_COOKIE, resolvePeriod, periodRange, formatPeriod } from "@/lib/period";
import { requireUser } from "@/lib/dal";
import { getTransactionsInRange } from "@/lib/aggregations";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ period?: string; month?: string; year?: string }>;
}

export default async function TransacoesPage({ searchParams }: PageProps) {
  const { id: userId } = await requireUser();
  const params = await searchParams;
  const cookieStore = await cookies();
  const period = resolvePeriod(params, cookieStore.get(PERIOD_COOKIE)?.value);

  const [transactions, accounts, categories] = await Promise.all([
    getTransactionsInRange(userId, periodRange(period)),
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
      period={formatPeriod(period)}
    />
  );
}
