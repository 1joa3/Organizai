"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { formatCurrency } from "@/lib/formatters";
import type { SerializedGoal } from "@/lib/types";
import type { GoalPlan, GoalStatus } from "@/lib/goalPlan";

export interface GoalItem {
  goal: SerializedGoal;
  plan: GoalPlan;
}

export const GOAL_STATUS: Record<GoalStatus, { label: string; className: string }> = {
  done: { label: "Concluída", className: "text-emerald bg-emerald/10" },
  ahead: { label: "Adiantada", className: "text-emerald bg-emerald/10" },
  "on-track": { label: "No ritmo", className: "text-blue bg-blue/10" },
  behind: { label: "Atrasada", className: "text-amber bg-amber/10" },
  overdue: { label: "Prazo vencido", className: "text-coral bg-coral/10" },
  open: { label: "Sem prazo", className: "text-text-dim bg-fg/5" },
};

/** "mar/2027" */
export const monthYear = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" }).replace(".", "").replace(" de ", "/");
export const fullDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });

const RING = 30; // raio
const STROKE = 6;
const CIRC = 2 * Math.PI * RING;

/**
 * Anel de progresso: o arco na cor da meta e, quando há prazo, um tracinho
 * onde a meta deveria estar hoje. A porcentagem fica no centro.
 */
function ProgressRing({ percent, expected, color, size = 76 }: { percent: number; expected: number | null; color: string; size?: number }) {
  const box = (RING + STROKE) * 2;
  const angle = expected !== null ? (expected / 100) * 2 * Math.PI - Math.PI / 2 : null;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${box} ${box}`} width={size} height={size} className="-rotate-0" aria-hidden>
        <circle cx={box / 2} cy={box / 2} r={RING} fill="none" stroke="currentColor" strokeWidth={STROKE} className="text-fg/[0.08]" />
        <motion.circle
          cx={box / 2}
          cy={box / 2}
          r={RING}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={{ strokeDashoffset: CIRC * (1 - Math.min(100, percent) / 100) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          transform={`rotate(-90 ${box / 2} ${box / 2})`}
        />
        {/* Onde deveria estar hoje */}
        {angle !== null && expected! > 0 && expected! < 100 && (
          <line
            x1={box / 2 + Math.cos(angle) * (RING - STROKE)}
            y1={box / 2 + Math.sin(angle) * (RING - STROKE)}
            x2={box / 2 + Math.cos(angle) * (RING + STROKE)}
            y2={box / 2 + Math.sin(angle) * (RING + STROKE)}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="text-fg/70"
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono-value text-sm font-semibold text-fg">
        <AnimatedNumber value={percent} format="percent" />
      </span>
    </div>
  );
}

/** A frase do plano: quanto guardar por mês, quanto falta, o que fazer */
function planText({ goal, plan }: GoalItem): { main: React.ReactNode; sub: string | null } {
  const remaining = formatCurrency(plan.remaining);
  switch (plan.status) {
    case "done":
      return {
        main: <span className="text-emerald">Meta alcançada</span>,
        sub: goal.deadline && plan.daysLeft !== null && plan.daysLeft >= 0 ? `Antes do prazo de ${fullDate(goal.deadline)}` : null,
      };
    case "overdue":
      return {
        main: (
          <>
            O prazo era <span className="text-fg">{fullDate(goal.deadline!)}</span>; faltam{" "}
            <span className="font-mono-value text-fg">{remaining}</span>.
          </>
        ),
        sub: "Edite o prazo para recalcular o plano.",
      };
    case "open":
      return {
        main: (
          <>
            Faltam <span className="font-mono-value text-fg">{remaining}</span>.
          </>
        ),
        sub: "Defina um prazo para saber quanto guardar por mês.",
      };
    default: {
      const months = plan.monthsLeft!;
      const days = plan.daysLeft!;
      let sub = `Faltam ${remaining} · ${days === 0 ? "o prazo é hoje" : `${days} ${days === 1 ? "dia" : "dias"} até ${monthYear(goal.deadline!)}`}`;
      if (plan.status === "behind" && plan.expectedPercent !== null) sub += ` · no ritmo, estaria em ${plan.expectedPercent}%`;
      return {
        main: (
          <>
            Guarde <span className="font-mono-value text-fg">{formatCurrency(plan.monthlyNeeded!)}/mês</span>
            {months > 1 ? ` por ${months} meses` : " neste mês"}
          </>
        ),
        sub,
      };
    }
  }
}

const iconButton =
  "w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-text-muted hover:text-fg hover:bg-fg/5 transition-colors cursor-pointer";

/** Cartão de uma meta em andamento: anel, valores, o plano e as ações. */
export default function GoalCard({
  item,
  onAdd,
  onWithdraw,
  onEdit,
}: {
  item: GoalItem;
  onAdd: () => void;
  onWithdraw: () => void;
  onEdit: () => void;
}) {
  const { goal, plan } = item;
  const status = GOAL_STATUS[plan.status];
  const text = planText(item);

  return (
    <div className="relative glass-card p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <ProgressRing percent={plan.percent} expected={plan.expectedPercent} color={goal.color} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg text-fg leading-snug break-words min-w-0">{goal.name}</h3>
            <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${status.className}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-dim">
            <AnimatedNumber value={goal.currentAmount} className="font-mono-value text-fg" />
            <span className="whitespace-nowrap"> de {formatCurrency(goal.targetAmount)}</span>
          </p>
          <p className="mt-2 text-sm text-text-dim leading-snug">{text.main}</p>
          {text.sub && <p className="text-xs text-text-muted mt-0.5">{text.sub}</p>}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button size="sm" onClick={onAdd} className="flex-1 sm:flex-none">
          + Aportar
        </Button>
        {goal.currentAmount > 0 && (
          <Button size="sm" variant="glass" onClick={onWithdraw} className="flex-1 sm:flex-none">
            − Retirar
          </Button>
        )}
        <button type="button" onClick={onEdit} className={`${iconButton} ml-auto`} title="Editar meta" aria-label={`Editar ${goal.name}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** Linha compacta de uma meta concluída (na seção "Concluídas"). */
export function DoneGoalRow({ item, onWithdraw, onEdit }: { item: GoalItem; onWithdraw: () => void; onEdit: () => void }) {
  const { goal } = item;
  return (
    <li className="flex items-center gap-3 px-4 sm:px-5 py-3">
      <span
        className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${goal.color}26`, color: goal.color }}
        aria-hidden
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg truncate">{goal.name}</p>
        <p className="text-xs text-text-muted truncate">
          <span className="font-mono-value">{formatCurrency(goal.currentAmount)}</span> guardados
          {goal.deadline && <> · prazo {monthYear(goal.deadline)}</>}
        </p>
      </div>
      {goal.currentAmount > 0 && (
        <button
          type="button"
          onClick={onWithdraw}
          className="h-8 px-3 rounded-lg text-xs font-medium text-text-dim hover:text-fg hover:bg-fg/5 transition-colors cursor-pointer"
        >
          Retirar
        </button>
      )}
      <button type="button" onClick={onEdit} className={iconButton} title="Editar meta" aria-label={`Editar ${goal.name}`}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
    </li>
  );
}
