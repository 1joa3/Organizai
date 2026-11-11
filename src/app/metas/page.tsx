import { getGoals } from "./actions";
import GoalsClient from "./GoalsClient";
import { compareGoals, goalPlan } from "@/lib/goalPlan";
import { todayInBrazil } from "@/lib/period";

export const dynamic = "force-dynamic";

export default async function MetasPage() {
  const goals = await getGoals();
  const today = todayInBrazil();

  // O plano é calculado aqui, com o dia de hoje no Brasil, para o servidor
  // e o navegador mostrarem o mesmo
  const items = goals
    .map((g) => {
      const targetAmount = Number(g.targetAmount);
      const currentAmount = Number(g.currentAmount);
      return {
        goal: {
          ...g,
          targetAmount,
          currentAmount,
          deadline: g.deadline?.toISOString() || null,
          createdAt: g.createdAt.toISOString(),
        },
        deadline: g.deadline,
        plan: goalPlan({ targetAmount, currentAmount, deadline: g.deadline, createdAt: g.createdAt }, today),
      };
    })
    .sort(compareGoals)
    .map(({ goal, plan }) => ({ goal, plan }));

  return <GoalsClient items={items} />;
}
