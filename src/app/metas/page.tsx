import { getGoals } from "./actions";
import GoalsClient from "./GoalsClient";

export const dynamic = "force-dynamic";

export default async function MetasPage() {
  const goals = await getGoals();

  const serialized = goals.map((g) => ({
    ...g,
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    deadline: g.deadline?.toISOString() || null,
    createdAt: g.createdAt.toISOString(),
  }));

  return <GoalsClient goals={serialized} />;
}
