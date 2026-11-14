"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import MoneyInput from "@/components/ui/MoneyInput";
import AmountField from "@/components/ui/AmountField";
import { useToast } from "@/components/ui/Toast";
import { createGoal, updateGoal } from "./actions";
import { formatCurrency, formatDateInput } from "@/lib/formatters";
import { moneyValue } from "@/lib/moneyInput";
import { goalPlan } from "@/lib/goalPlan";
import type { SerializedGoal } from "@/lib/types";
import { monthYear } from "./GoalCard";

const COLORS = ["#00E5FF", "#CCFF00", "#FFB800", "#FF0055", "#A78BFA", "#34D399", "#F472B6", "#60A5FA"];

const label = "text-xs font-medium text-text-dim uppercase tracking-wider";

/** Atalhos de prazo, em meses a partir de hoje */
const DEADLINE_SHORTCUTS: [string, number][] = [
  ["6 meses", 6],
  ["1 ano", 12],
  ["2 anos", 24],
];

function monthsFromToday(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return formatDateInput(d);
}

/**
 * Janela de nova/editar meta: o valor alvo em destaque, quanto já tem, o
 * prazo com atalhos e, embaixo, a prévia do plano (quanto guardar por mês),
 * que muda enquanto digita.
 */
export default function GoalForm({
  goal,
  onDone,
  onDelete,
}: {
  /** Ausente = nova meta */
  goal?: SerializedGoal;
  onDone: () => void;
  onDelete: (goal: SerializedGoal) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState(() => moneyValue(goal?.targetAmount));
  const [current, setCurrent] = useState(() => moneyValue(goal?.currentAmount));
  const [deadline, setDeadline] = useState(goal?.deadline?.slice(0, 10) ?? "");
  const [color, setColor] = useState(goal?.color ?? COLORS[0]);
  const colorOptions = goal && !COLORS.some((c) => c.toUpperCase() === goal.color.toUpperCase()) ? [...COLORS, goal.color] : COLORS;

  // Prévia do plano com o que está digitado
  const targetNumber = Number(target) || 0;
  const plan =
    targetNumber > 0
      ? goalPlan(
          {
            targetAmount: targetNumber,
            currentAmount: Number(current) || 0,
            deadline: deadline ? new Date(`${deadline}T12:00:00`) : null,
            createdAt: goal ? new Date(goal.createdAt) : new Date(),
          },
          new Date()
        )
      : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const result = goal ? await updateGoal(goal.id, formData) : await createGoal(formData);
    setSaving(false);
    if (result?.error) {
      toast.error(goal ? "Não foi possível salvar a meta" : "Não foi possível criar a meta", result.error);
      return;
    }
    toast.success(goal ? "Meta atualizada" : "Meta criada");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input name="name" label="Nome da meta" required placeholder="Ex: Reserva de emergência" defaultValue={goal?.name} autoComplete="off" autoFocus={!goal} />

      <AmountField label="Quanto quer juntar" name="targetAmount" required value={target} onChange={setTarget} />

      <MoneyInput
        name="currentAmount"
        label={goal ? "Guardado até agora" : "Já tenho guardado (opcional)"}
        value={current}
        onValueChange={setCurrent}
      />

      {/* Prazo com atalhos */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <label htmlFor="goal-deadline" className={label}>
            Prazo
          </label>
          <div className="flex flex-wrap gap-1">
            {DEADLINE_SHORTCUTS.map(([text, months]) => {
              const value = monthsFromToday(months);
              return (
                <button
                  key={text}
                  type="button"
                  onClick={() => setDeadline(value)}
                  aria-pressed={deadline === value}
                  className={`h-6 px-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    deadline === value ? "bg-blue/15 text-blue" : "text-text-dim hover:text-fg hover:bg-fg/5"
                  }`}
                >
                  {text}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setDeadline("")}
              aria-pressed={deadline === ""}
              className={`h-6 px-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                deadline === "" ? "bg-blue/15 text-blue" : "text-text-dim hover:text-fg hover:bg-fg/5"
              }`}
            >
              Sem prazo
            </button>
          </div>
        </div>
        <Input id="goal-deadline" name="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>

      {/* Prévia do plano */}
      <div className="rounded-xl bg-blue/[0.07] border border-blue/15 px-4 py-3 text-sm text-text-dim" aria-live="polite">
        {!plan ? (
          "Digite quanto quer juntar para ver o plano."
        ) : plan.status === "done" ? (
          <span className="text-emerald">Você já tem o valor da meta.</span>
        ) : plan.status === "open" ? (
          <>
            Faltam <span className="font-mono-value text-fg">{formatCurrency(plan.remaining)}</span>. Com um prazo, o app calcula quanto guardar por mês.
          </>
        ) : plan.status === "overdue" ? (
          "Esse prazo já passou. Escolha uma data futura."
        ) : (
          <>
            Guarde <span className="font-mono-value text-fg">{formatCurrency(plan.monthlyNeeded!)}/mês</span>
            {plan.monthsLeft! > 1 ? ` por ${plan.monthsLeft} meses` : " neste mês"} para chegar em{" "}
            <span className="text-fg">{monthYear(`${deadline}T12:00:00Z`)}</span>.
          </>
        )}
      </div>

      <fieldset>
        <legend className={`${label} mb-2`}>Cor</legend>
        <div className="flex flex-wrap gap-2.5">
          {colorOptions.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="color" value={c} checked={color.toUpperCase() === c.toUpperCase()} onChange={() => setColor(c)} className="peer sr-only" />
              <span
                className="block w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-fg peer-checked:scale-110 peer-focus-visible:outline-2 peer-focus-visible:outline-blue transition-transform hover:scale-110"
                style={{ backgroundColor: c }}
                title={c}
              />
            </label>
          ))}
        </div>
      </fieldset>

      {/* Rodapé preso embaixo da janela */}
      <div className="sticky -bottom-5 sm:-bottom-6 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-4 bg-panel border-t border-fg/10 flex items-center justify-end gap-3">
        {goal && (
          <Button variant="ghost" type="button" onClick={() => onDelete(goal)} className="mr-auto text-coral! hover:bg-coral/10!">
            Excluir
          </Button>
        )}
        <Button variant="ghost" type="button" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {goal ? "Salvar" : "Criar meta"}
        </Button>
      </div>
    </form>
  );
}
