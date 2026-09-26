import { getInvestments } from "./actions";
import InvestmentsClient from "./InvestmentsClient";

export const dynamic = "force-dynamic";

export default async function InvestimentosPage() {
  const investments = await getInvestments();

  const serialized = investments.map((inv) => ({
    ...inv,
    investedAmount: Number(inv.investedAmount),
    currentAmount: Number(inv.currentAmount),
    date: inv.date.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  }));

  return <InvestmentsClient investments={serialized} />;
}
