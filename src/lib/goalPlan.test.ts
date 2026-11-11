import { describe, expect, it } from "vitest";
import { compareGoals, goalPlan } from "./goalPlan";

const today = new Date(2026, 10, 11);
const goal = (current: number, deadline: Date | null, createdAt = new Date(2026, 0, 1)) => ({
  targetAmount: 1200,
  currentAmount: current,
  deadline,
  createdAt,
});

describe("goalPlan", () => {
  it("divide o que falta pelos meses até o prazo, contando o atual e o do prazo", () => {
    // nov, dez, jan, fev → 4 meses
    const plan = goalPlan(goal(400, new Date(2027, 1, 15), new Date(2026, 10, 1)), today);
    expect(plan.monthsLeft).toBe(4);
    expect(plan.remaining).toBe(800);
    expect(plan.monthlyNeeded).toBe(200);
    expect(plan.percent).toBe(33);
  });

  it("compara com a reta entre a criação e o prazo", () => {
    // Criada em 1/jan, prazo 31/dez: em 11/nov deveria estar em ~86%
    const deadline = new Date(2026, 11, 31);
    expect(goalPlan(goal(1100, deadline), today).status).toBe("ahead");
    expect(goalPlan(goal(1030, deadline), today).status).toBe("on-track");
    expect(goalPlan(goal(500, deadline), today).status).toBe("behind");
    expect(goalPlan(goal(500, deadline), today).expectedPercent).toBe(86);
  });

  it("concluída, vencida e sem prazo", () => {
    expect(goalPlan(goal(1300, new Date(2027, 0, 1)), today)).toMatchObject({ status: "done", percent: 100, remaining: 0, monthlyNeeded: null });
    expect(goalPlan(goal(100, new Date(2026, 9, 1)), today)).toMatchObject({ status: "overdue", remaining: 1100, monthlyNeeded: null });
    expect(goalPlan(goal(100, null), today)).toMatchObject({ status: "open", remaining: 1100, daysLeft: null });
  });

  it("prazo neste mês ainda dá um mês de aporte", () => {
    const plan = goalPlan(goal(200, new Date(2026, 10, 30)), today);
    expect(plan.monthsLeft).toBe(1);
    expect(plan.monthlyNeeded).toBe(1000);
    expect(plan.daysLeft).toBe(19);
  });
});

describe("compareGoals", () => {
  it("prazo mais perto primeiro, sem prazo depois e concluídas no fim", () => {
    const items = [
      { name: "sem prazo", deadline: null },
      { name: "concluída", deadline: new Date(2026, 11, 1), current: 1200 },
      { name: "longe", deadline: new Date(2027, 5, 1) },
      { name: "perto", deadline: new Date(2026, 11, 1) },
    ].map((g) => ({ ...g, plan: goalPlan(goal(g.current ?? 0, g.deadline), today) }));
    expect(items.sort(compareGoals).map((g) => g.name)).toEqual(["perto", "longe", "sem prazo", "concluída"]);
  });
});
