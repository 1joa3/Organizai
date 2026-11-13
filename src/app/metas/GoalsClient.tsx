"use client";

import CardSpotlight from "@/components/ui/CardSpotlight";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import PageTitle from "@/components/ui/PageTitle";
import { useState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import MoneyInput from "@/components/ui/MoneyInput";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { createGoal, updateGoal, deleteGoal, addAmountToGoal, withdrawFromGoal } from "./actions";
import { formatCurrency } from "@/lib/formatters";
import { useToast } from "@/components/ui/Toast";
import type { SerializedGoal } from "@/lib/types";
import type { GoalPlan, GoalStatus } from "@/lib/goalPlan";

interface Item {
  goal: SerializedGoal;
  plan: GoalPlan;
}

const STATUS: Record<GoalStatus, { label: string; className: string }> = {
  done: { label: "Concluída", className: "text-emerald bg-emerald/10 border-emerald/25" },
  ahead: { label: "Adiantada", className: "text-emerald bg-emerald/10 border-emerald/25" },
  "on-track": { label: "No ritmo", className: "text-blue bg-blue/10 border-blue/25" },
  behind: { label: "Atrasada", className: "text-amber bg-amber/10 border-amber/25" },
  overdue: { label: "Prazo vencido", className: "text-coral bg-coral/10 border-coral/25" },
  open: { label: "Sem prazo", className: "text-text-dim bg-fg/5 border-fg/10" },
};

const COLORS = ["#00E5FF", "#CCFF00", "#FFB800", "#FF0055", "#A78BFA", "#34D399", "#F472B6", "#60A5FA"];

/** "mar/2027" */
const monthYear = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" }).replace(".", "").replace(" de ", "/");
const fullDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });

function parseAmount(value: string) {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

type Movement = { item: Item; kind: "add" | "withdraw" };

export default function GoalsClient({ items }: { items: Item[] }) {
  // null = fechado; goal ausente = criar
  const [form, setForm] = useState<{ goal?: SerializedGoal } | null>(null);
  const [movement, setMovement] = useState<Movement | null>(null);
  const [amount, setAmount] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SerializedGoal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const active = items.filter((i) => i.plan.status !== "done");
  const totalSaved = items.reduce((s, i) => s + i.goal.currentAmount, 0);
  const totalTarget = items.reduce((s, i) => s + i.goal.targetAmount, 0);
  const monthly = active.reduce((s, i) => s + (i.plan.monthlyNeeded ?? 0), 0);
  const doneCount = items.length - active.length;

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = form.goal ? await updateGoal(form.goal.id, formData) : await createGoal(formData);
    setIsLoading(false);
    if (result?.error) {
      toast.error(form.goal ? "Não foi possível salvar a meta" : "Não foi possível criar a meta", result.error);
      return;
    }
    toast.success(form.goal ? "Meta atualizada" : "Meta criada");
    setForm(null);
  }

  function openMovement(item: Item, kind: Movement["kind"]) {
    setMovement({ item, kind });
    setAmount("");
  }

  async function handleMovement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!movement) return;
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const action = movement.kind === "add" ? addAmountToGoal : withdrawFromGoal;
    const result = await action(movement.item.goal.id, formData);
    setIsLoading(false);
    if (result?.error) {
      toast.error(movement.kind === "add" ? "Não foi possível registrar o aporte" : "Não foi possível registrar a retirada", result.error);
      return;
    }
    toast.success(movement.kind === "add" ? "Aporte registrado" : "Retirada registrada");
    setMovement(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const result = await deleteGoal(target.id);
    if (result?.error) {
      toast.error("Não foi possível excluir a meta", result.error);
      return;
    }
    toast.success("Meta excluída");
  }

  // Prévia do movimento: como a meta fica depois
  const preview = (() => {
    if (!movement) return null;
    const value = parseAmount(amount);
    const { currentAmount, targetAmount } = movement.item.goal;
    const after = movement.kind === "add" ? currentAmount + value : currentAmount - value;
    return {
      value,
      after,
      invalid: movement.kind === "withdraw" && value > currentAmount,
      percent: targetAmount > 0 ? Math.min(100, Math.max(0, Math.round((after / targetAmount) * 100))) : 0,
    };
  })();

  const editing = form?.goal;
  const colorOptions = editing && !COLORS.includes(editing.color.toUpperCase()) ? [...COLORS, editing.color] : COLORS;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <PageTitle text="Metas" />
          <p className="text-sm text-text-dim mt-1">Planeje e acompanhe seus objetivos</p>
        </div>
        <Button onClick={() => setForm({})}>Nova Meta</Button>
      </motion.div>

      {/* Resumo de todas as metas */}
      {items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative glass-card p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6"
        >
          <CardSpotlight />
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-dim uppercase tracking-wider">Guardado</p>
            <p className="font-mono-value text-2xl text-fg mt-1.5 whitespace-nowrap"><AnimatedNumber value={totalSaved} /></p>
            <p className="text-xs text-text-muted mt-1">de {formatCurrency(totalTarget)} no total</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-dim uppercase tracking-wider">Para cumprir os prazos</p>
            <p className="font-mono-value text-2xl text-blue mt-1.5 whitespace-nowrap">
              {monthly > 0 ? <><AnimatedNumber value={monthly} />/mês</> : "—"}
            </p>
            <p className="text-xs text-text-muted mt-1">somando as metas com prazo</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-dim uppercase tracking-wider">Andamento</p>
            <p className="font-mono-value text-2xl text-fg mt-1.5">
              {doneCount}
              <span className="text-text-muted">/{items.length}</span>
            </p>
            <p className="text-xs text-text-muted mt-1">{doneCount === 1 ? "meta concluída" : "metas concluídas"}</p>
          </div>
        </motion.div>
      )}

      {/* Grid de Metas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map(({ goal, plan }, i) => {
          const status = STATUS[plan.status];
          const done = plan.status === "done";
          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={`relative glass-card p-6 flex flex-col ${done ? "border-emerald/25" : ""}`}
            >
              <CardSpotlight />
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: goal.color, boxShadow: `0 0 8px ${goal.color}` }} />
                  <h3 className="font-display text-xl text-fg min-w-0 break-words">{goal.name}</h3>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${status.className}`}>
                  {status.label}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-3 mb-2.5">
                <p className="text-sm text-text-dim min-w-0">
                  <AnimatedNumber value={goal.currentAmount} className="font-mono-value text-2xl text-fg" />
                  <span className="whitespace-nowrap"> de {formatCurrency(goal.targetAmount)}</span>
                </p>
                <span className="font-mono-value text-sm font-semibold" style={{ color: goal.color }}>
                  <AnimatedNumber value={plan.percent} format="percent" />
                </span>
              </div>

              {/* Barra com a marca de onde deveria estar hoje */}
              <div className="relative">
                <div className="h-2.5 w-full bg-fg/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${plan.percent}%` }}
                    transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: goal.color, boxShadow: `0 0 10px ${goal.color}60` }}
                  />
                </div>
                {plan.expectedPercent !== null && plan.expectedPercent > 0 && plan.expectedPercent < 100 && (
                  <span
                    className="absolute -top-1 -bottom-1 w-0.5 -ml-px rounded-full bg-fg/60"
                    style={{ left: `${plan.expectedPercent}%` }}
                    title={`Esperado até hoje: ${plan.expectedPercent}%`}
                  />
                )}
              </div>

              <GoalPlanText goal={goal} plan={plan} />

              <div className="mt-auto pt-5 flex items-center gap-2">
                {!done && (
                  <Button size="sm" onClick={() => openMovement({ goal, plan }, "add")}>
                    + Aportar
                  </Button>
                )}
                {goal.currentAmount > 0 && (
                  <Button size="sm" variant="glass" onClick={() => openMovement({ goal, plan }, "withdraw")}>
                    − Retirar
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setForm({ goal })}
                  className="ml-auto flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium text-text-dim hover:text-fg hover:bg-fg/5 transition-colors cursor-pointer"
                  aria-label={`Editar ${goal.name}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                  Editar
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center text-text-muted border border-dashed border-fg/10 rounded-xl glass-panel">
          <p>Nenhuma meta cadastrada</p>
          <p className="text-xs max-w-xs">
            Crie uma meta com valor e prazo e o app calcula quanto guardar por mês para chegar lá.
          </p>
          <Button size="sm" variant="glass" onClick={() => setForm({})}>
            Criar a primeira meta
          </Button>
        </div>
      )}

      {/* Modal Nova/Editar Meta */}
      <Modal
        isOpen={form !== null}
        onClose={() => setForm(null)}
        title={editing ? "Editar Meta" : "Nova Meta"}
        eyebrow="Meta"
        accent="amber"
      >
        {form && (
          <form key={editing?.id ?? "new"} onSubmit={handleSave} className="space-y-5">
            <Input name="name" label="Nome da Meta" required placeholder="Ex: Reserva de Emergência" defaultValue={editing?.name} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MoneyInput name="targetAmount" label="Valor Alvo" required defaultValue={editing?.targetAmount} />
              <MoneyInput
                name="currentAmount"
                label={editing ? "Valor Guardado" : "Valor Atual (Opcional)"}
                defaultValue={editing?.currentAmount}
              />
            </div>

            <Input
              name="deadline"
              label="Prazo (Opcional)"
              type="date"
              defaultValue={editing?.deadline?.slice(0, 10)}
              hint="Com prazo, o app calcula quanto guardar por mês."
            />

            <fieldset>
              <legend className="text-xs font-medium text-text-dim uppercase tracking-wider mb-2">Cor</legend>
              <div className="flex flex-wrap gap-2.5">
                {colorOptions.map((color, idx) => (
                  <label key={color} className="cursor-pointer">
                    <input
                      type="radio"
                      name="color"
                      value={color}
                      defaultChecked={editing ? editing.color.toUpperCase() === color.toUpperCase() : idx === 0}
                      className="peer sr-only"
                    />
                    <span
                      className="block w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-fg peer-focus-visible:outline-2 peer-focus-visible:outline-blue transition-transform hover:scale-110"
                      style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}50` }}
                      title={color}
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="pt-4 border-t border-fg/10 flex items-center gap-3">
              {editing && (
                <Button
                  variant="danger"
                  type="button"
                  onClick={() => {
                    setForm(null);
                    setDeleteTarget(editing);
                  }}
                >
                  Excluir
                </Button>
              )}
              <div className="ml-auto flex gap-3">
                <Button variant="ghost" type="button" onClick={() => setForm(null)}>Cancelar</Button>
                <Button type="submit" loading={isLoading}>{editing ? "Salvar" : "Criar Meta"}</Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Aporte / Retirada */}
      <Modal
        isOpen={movement !== null}
        onClose={() => setMovement(null)}
        title={movement?.item.goal.name ?? ""}
        eyebrow={movement?.kind === "withdraw" ? "Retirada" : "Aporte"}
        accent={movement?.kind === "withdraw" ? "coral" : "emerald"}
      >
        {movement && preview && (
          <form onSubmit={handleMovement} className="space-y-5">
            <div className="flex gap-1 p-1 bg-fg/5 rounded-lg border border-fg/10" role="radiogroup" aria-label="Tipo">
              {([
                ["add", "Aportar"],
                ["withdraw", "Retirar"],
              ] as const).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={movement.kind === kind}
                  disabled={kind === "withdraw" && movement.item.goal.currentAmount <= 0}
                  onClick={() => setMovement({ ...movement, kind })}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    movement.kind === kind ? "bg-fg/10 text-fg" : "text-text-muted hover:text-fg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <MoneyInput
              name="amount"
              label={movement.kind === "add" ? "Valor do Aporte" : "Valor da Retirada"}
              required
              autoFocus
              value={amount}
              onValueChange={setAmount}
              hint={
                movement.kind === "withdraw"
                  ? `Guardado na meta: ${formatCurrency(movement.item.goal.currentAmount)}`
                  : undefined
              }
            />

            {/* Atalhos de valor */}
            {movement.kind === "add" && (movement.item.plan.monthlyNeeded || movement.item.plan.remaining > 0) && (
              <div className="flex flex-wrap gap-2">
                {movement.item.plan.monthlyNeeded !== null && movement.item.plan.monthlyNeeded < movement.item.plan.remaining && (
                  <button
                    type="button"
                    onClick={() => setAmount(movement.item.plan.monthlyNeeded!.toFixed(2))}
                    className="h-8 px-3 rounded-md border border-fg/15 bg-fg/5 text-xs text-text-dim hover:text-fg hover:border-blue/50 transition-colors cursor-pointer"
                  >
                    Parcela do mês · {formatCurrency(movement.item.plan.monthlyNeeded)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAmount(movement.item.plan.remaining.toFixed(2))}
                  className="h-8 px-3 rounded-md border border-fg/15 bg-fg/5 text-xs text-text-dim hover:text-fg hover:border-blue/50 transition-colors cursor-pointer"
                >
                  Completar · {formatCurrency(movement.item.plan.remaining)}
                </button>
              </div>
            )}

            {preview.value > 0 && (
              <p className={`text-sm ${preview.invalid ? "text-coral" : "text-text-dim"}`}>
                {preview.invalid ? (
                  "O valor é maior do que o guardado na meta."
                ) : (
                  <>
                    A meta fica em <span className="font-mono-value text-fg">{formatCurrency(preview.after)}</span>{" "}
                    ({preview.percent}% de {formatCurrency(movement.item.goal.targetAmount)}).
                  </>
                )}
              </p>
            )}

            <div className="pt-4 border-t border-fg/10 flex justify-end gap-3">
              <Button variant="ghost" type="button" onClick={() => setMovement(null)}>Cancelar</Button>
              <Button type="submit" loading={isLoading} disabled={preview.invalid}>
                {movement.kind === "add" ? "Registrar Aporte" : "Registrar Retirada"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Excluir meta"
        message={deleteTarget ? `Excluir a meta "${deleteTarget.name}"? Esta ação é irreversível.` : ""}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </div>
  );
}

/** A frase do plano: quanto guardar por mês, quanto falta, o que fazer */
function GoalPlanText({ goal, plan }: Item) {
  const remaining = formatCurrency(plan.remaining);
  let main: React.ReactNode;
  let sub: React.ReactNode = null;

  switch (plan.status) {
    case "done":
      main = <span className="text-emerald">Meta alcançada</span>;
      if (goal.deadline && plan.daysLeft !== null && plan.daysLeft >= 0) sub = `Antes do prazo de ${fullDate(goal.deadline)}`;
      break;
    case "overdue":
      main = (
        <>
          O prazo era <span className="text-fg">{fullDate(goal.deadline!)}</span> e faltam{" "}
          <span className="font-mono-value text-fg">{remaining}</span>.
        </>
      );
      sub = "Edite o prazo para recalcular o plano.";
      break;
    case "open":
      main = (
        <>
          Faltam <span className="font-mono-value text-fg">{remaining}</span>.
        </>
      );
      sub = "Defina um prazo para saber quanto guardar por mês.";
      break;
    default: {
      const months = plan.monthsLeft!;
      main = (
        <>
          Guarde <span className="font-mono-value text-fg">{formatCurrency(plan.monthlyNeeded!)}/mês</span>
          {months > 1 ? ` por ${months} meses` : " neste mês"} para chegar em{" "}
          <span className="text-fg">{monthYear(goal.deadline!)}</span>.
        </>
      );
      const days = plan.daysLeft!;
      sub = `Faltam ${remaining} · ${days === 0 ? "o prazo é hoje" : `${days} ${days === 1 ? "dia" : "dias"} até o prazo`}`;
      if (plan.status === "behind" && plan.expectedPercent !== null) {
        sub += ` · no ritmo, estaria em ${plan.expectedPercent}%`;
      }
    }
  }

  return (
    <div className="mt-4 text-sm text-text-dim leading-relaxed">
      <p>{main}</p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  );
}
