"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import SegmentedTabs from "@/components/ui/SegmentedTabs";
import AmountField from "@/components/ui/AmountField";
import { useToast } from "@/components/ui/Toast";
import { addAmountToGoal, withdrawFromGoal } from "./actions";
import { formatCurrency } from "@/lib/formatters";
import type { GoalItem } from "./GoalCard";

export type MovementKind = "add" | "withdraw";

/**
 * Janela de aportar/retirar: o valor em destaque, atalhos (parcela do mês,
 * completar, retirar tudo) e uma barra com o antes e o depois da meta.
 */
export default function GoalMovementForm({
  item,
  initialKind,
  onDone,
}: {
  item: GoalItem;
  initialKind: MovementKind;
  onDone: () => void;
}) {
  const toast = useToast();
  const { goal, plan } = item;
  const [kind, setKind] = useState<MovementKind>(initialKind);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const value = Number(amount) || 0;
  const after = kind === "add" ? goal.currentAmount + value : goal.currentAmount - value;
  const invalid = kind === "withdraw" && value > goal.currentAmount;
  const pct = (n: number) => (goal.targetAmount > 0 ? Math.min(100, Math.max(0, (n / goal.targetAmount) * 100)) : 0);
  const beforePct = pct(goal.currentAmount);
  const afterPct = pct(after);

  // Atalhos do valor
  const shortcuts: { label: string; value: number }[] = [];
  if (kind === "add") {
    if (plan.monthlyNeeded !== null && plan.monthlyNeeded < plan.remaining) shortcuts.push({ label: "Parcela do mês", value: plan.monthlyNeeded });
    if (plan.remaining > 0) shortcuts.push({ label: "Completar", value: plan.remaining });
  } else if (goal.currentAmount > 0) {
    shortcuts.push({ label: "Retirar tudo", value: goal.currentAmount });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (invalid) return;
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const result = kind === "add" ? await addAmountToGoal(goal.id, formData) : await withdrawFromGoal(goal.id, formData);
    setSaving(false);
    if (result?.error) {
      toast.error(kind === "add" ? "Não foi possível registrar o aporte" : "Não foi possível registrar a retirada", result.error);
      return;
    }
    toast.success(kind === "add" ? "Aporte registrado" : "Retirada registrada");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <SegmentedTabs
        full
        ariaLabel="Tipo"
        value={kind}
        onChange={(k) => {
          setKind(k);
          setAmount("");
        }}
        tabClassName="text-sm font-semibold h-10!"
        options={[
          { value: "add", label: "+ Aportar", tone: "var(--emerald)" },
          { value: "withdraw", label: "− Retirar", tone: "var(--coral)", disabled: goal.currentAmount <= 0 },
        ]}
      />

      <AmountField
        key={kind}
        label={kind === "add" ? "Quanto vai guardar" : "Quanto vai retirar"}
        name="amount"
        required
        autoFocus
        value={amount}
        onChange={setAmount}
        prefix={kind === "add" ? "+ R$" : "− R$"}
        prefixClassName={kind === "add" ? "text-emerald" : "text-coral"}
        invalid={invalid}
        hint={invalid ? "É mais do que está guardado na meta." : `Guardado na meta: ${formatCurrency(goal.currentAmount)}`}
      />

      {shortcuts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {shortcuts.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setAmount(s.value.toFixed(2))}
              className="h-9 px-3 rounded-lg border border-fg/10 bg-fg/[0.03] text-sm text-text-dim hover:text-fg hover:border-fg/20 transition-colors cursor-pointer"
            >
              {s.label} · <span className="font-mono-value">{formatCurrency(s.value)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Antes e depois: a parte que muda aparece clara (aporte) ou some (retirada) */}
      <div className="rounded-xl bg-fg/[0.03] border border-fg/10 px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-text-dim">{value > 0 && !invalid ? "A meta fica em" : "Hoje a meta está em"}</span>
          <span className="font-mono-value text-fg">
            {formatCurrency(value > 0 && !invalid ? after : goal.currentAmount)}
            <span className="text-text-muted"> · {Math.round(value > 0 && !invalid ? afterPct : beforePct)}%</span>
          </span>
        </div>
        <div className="relative mt-2.5 h-2 rounded-full bg-fg/[0.08] overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
            style={{ width: `${kind === "add" ? beforePct : invalid ? beforePct : afterPct}%`, backgroundColor: goal.color }}
          />
          {value > 0 && !invalid && (
            <div
              className="absolute inset-y-0 rounded-full transition-[left,width] duration-300"
              style={
                kind === "add"
                  ? { left: `${beforePct}%`, width: `${afterPct - beforePct}%`, backgroundColor: goal.color, opacity: 0.45 }
                  : { left: `${afterPct}%`, width: `${beforePct - afterPct}%`, backgroundColor: "var(--coral)", opacity: 0.45 }
              }
            />
          )}
        </div>
        <p className="mt-1.5 text-xs text-text-muted">Meta: {formatCurrency(goal.targetAmount)}</p>
      </div>

      {/* Rodapé preso embaixo da janela */}
      <div className="sticky -bottom-5 sm:-bottom-6 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-4 bg-panel border-t border-fg/10 flex items-center justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving} disabled={invalid}>
          {kind === "add" ? "Guardar" : "Retirar"}
        </Button>
      </div>
    </form>
  );
}
