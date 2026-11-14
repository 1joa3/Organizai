"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import PageTitle from "@/components/ui/PageTitle";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { deleteGoal } from "./actions";
import { formatCurrency } from "@/lib/formatters";
import type { SerializedGoal } from "@/lib/types";
import GoalCard, { DoneGoalRow, type GoalItem } from "./GoalCard";
import GoalForm from "./GoalForm";
import GoalMovementForm, { type MovementKind } from "./GoalMovementForm";

/**
 * Tela de Metas: resumo numa faixa, as metas em andamento em cartões (anel
 * de progresso e o plano) e, no fim, as concluídas numa seção recolhível.
 */
export default function GoalsClient({ items }: { items: GoalItem[] }) {
  const toast = useToast();
  // null = fechado; goal ausente = criar
  const [form, setForm] = useState<{ goal?: SerializedGoal } | null>(null);
  const [movement, setMovement] = useState<{ item: GoalItem; kind: MovementKind } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SerializedGoal | null>(null);

  const active = items.filter((i) => i.plan.status !== "done");
  const done = items.filter((i) => i.plan.status === "done");
  // Sem metas em andamento, as concluídas já aparecem abertas
  const [showDone, setShowDone] = useState(active.length === 0);

  const totalSaved = items.reduce((s, i) => s + i.goal.currentAmount, 0);
  const totalTarget = items.reduce((s, i) => s + i.goal.targetAmount, 0);
  const monthly = active.reduce((s, i) => s + (i.plan.monthlyNeeded ?? 0), 0);

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

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <PageTitle text="Metas" />
          <p className="text-sm text-text-dim mt-1">Planeje e acompanhe seus objetivos</p>
        </div>
        <Button onClick={() => setForm({})}>Nova meta</Button>
      </div>

      {/* Resumo numa faixa. No celular, o guardado em cima, na largura toda */}
      {items.length > 0 && (
        <dl className="glass-card grid grid-cols-2 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1 px-4 sm:px-5 py-3 sm:py-4 min-w-0">
            <dt className="text-xs text-text-dim">Guardado</dt>
            <dd className="font-mono-value text-xl text-fg mt-1 truncate">
              <AnimatedNumber value={totalSaved} />
            </dd>
            <dd className="text-xs text-text-muted mt-0.5 truncate">de {formatCurrency(totalTarget)} no total</dd>
          </div>
          <div className="px-4 sm:px-5 py-3 sm:py-4 min-w-0 border-t sm:border-t-0 sm:border-l border-r sm:border-r-0 border-fg/[0.08]">
            <dt className="text-xs text-text-dim truncate">Por mês, para os prazos</dt>
            <dd className="font-mono-value text-base sm:text-xl text-blue mt-1 truncate">
              {monthly > 0 ? <AnimatedNumber value={monthly} /> : "—"}
            </dd>
          </div>
          <div className="px-4 sm:px-5 py-3 sm:py-4 min-w-0 border-t sm:border-t-0 sm:border-l border-fg/[0.08]">
            <dt className="text-xs text-text-dim">Concluídas</dt>
            <dd className="font-mono-value text-base sm:text-xl text-fg mt-1">
              {done.length}
              <span className="text-text-muted"> de {items.length}</span>
            </dd>
          </div>
        </dl>
      )}

      {/* Em andamento */}
      {active.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {active.map((item) => (
            <GoalCard
              key={item.goal.id}
              item={item}
              onAdd={() => setMovement({ item, kind: "add" })}
              onWithdraw={() => setMovement({ item, kind: "withdraw" })}
              onEdit={() => setForm({ goal: item.goal })}
            />
          ))}
        </div>
      )}

      {active.length === 0 && items.length > 0 && (
        <div className="glass-card px-5 py-8 text-center text-sm text-text-dim">
          Todas as metas foram alcançadas. Que tal criar a próxima?
        </div>
      )}

      {/* Concluídas: recolhíveis, em linhas compactas */}
      {done.length > 0 && (
        <section className="glass-card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDone(!showDone)}
            aria-expanded={showDone}
            className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-fg/[0.03] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="font-display text-base text-fg">Concluídas</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald/10 text-emerald text-xs font-medium">{done.length}</span>
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-text-muted transition-transform duration-200 ${showDone ? "rotate-180" : ""}`}
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <AnimatePresence initial={false}>
            {showDone && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden border-t border-fg/[0.06] divide-y divide-fg/[0.06]"
              >
                {done.map((item) => (
                  <DoneGoalRow
                    key={item.goal.id}
                    item={item}
                    onWithdraw={() => setMovement({ item, kind: "withdraw" })}
                    onEdit={() => setForm({ goal: item.goal })}
                  />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </section>
      )}

      {items.length === 0 && (
        <div className="glass-card flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
          <span className="w-12 h-12 rounded-full bg-blue/10 text-blue flex items-center justify-center" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </span>
          <p className="text-fg font-medium">Nenhuma meta ainda</p>
          <p className="text-sm text-text-dim max-w-xs">
            Crie uma meta com valor e prazo e o app calcula quanto guardar por mês para chegar lá.
          </p>
          <Button size="sm" onClick={() => setForm({})} className="mt-1">
            Criar a primeira meta
          </Button>
        </div>
      )}

      {/* Nova / editar meta */}
      <Modal isOpen={form !== null} onClose={() => setForm(null)} title={form?.goal ? "Editar meta" : "Nova meta"}>
        {form && (
          <GoalForm
            key={form.goal?.id ?? "new"}
            goal={form.goal}
            onDone={() => setForm(null)}
            onDelete={(goal) => {
              setForm(null);
              setDeleteTarget(goal);
            }}
          />
        )}
      </Modal>

      {/* Aportar / retirar */}
      <Modal isOpen={movement !== null} onClose={() => setMovement(null)} title={movement?.item.goal.name ?? ""}>
        {movement && (
          <GoalMovementForm
            key={`${movement.item.goal.id}-${movement.kind}`}
            item={movement.item}
            initialKind={movement.kind}
            onDone={() => setMovement(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Excluir meta"
        message={deleteTarget ? `Excluir a meta "${deleteTarget.name}"? Esta ação não pode ser desfeita.` : ""}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </div>
  );
}
