import { cookies } from "next/headers";
import { getCategoryReport } from "@/lib/aggregations";
import { requireUser } from "@/lib/dal";
import { PERIOD_COOKIE, resolvePeriod, periodRange, periodLabel, formatPeriod } from "@/lib/period";
import CategoriesClient from "./CategoriesClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ period?: string; month?: string; year?: string }>;
}

export default async function CategoriasPage({ searchParams }: PageProps) {
  const { id: userId } = await requireUser();
  const params = await searchParams;
  const cookieStore = await cookies();
  const period = resolvePeriod(params, cookieStore.get(PERIOD_COOKIE)?.value);

  const report = await getCategoryReport(userId, periodRange(period));

  return (
    <CategoriesClient
      total={report.total}
      previousTotal={report.previousTotal}
      days={report.days}
      categories={report.categories}
      trend={{
        months: report.trend.months.map((m) => m.toISOString()),
        series: report.trend.series,
      }}
      transactions={report.transactions.map((t) => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        date: t.date.toISOString(),
        categoryId: t.categoryId,
        account: t.account.name,
      }))}
      periodLabel={periodLabel(period)}
      period={formatPeriod(period)}
    />
  );
}
