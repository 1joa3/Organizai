"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { saveBudgets } from "@/lib/budgetActions";
import type { BudgetCategory, BudgetItem, BudgetStatus, BudgetSummary } from "@/lib/budget";
import { formatCurrency } from "@/lib/formatters";
import { moneyDisplay, moneyFromTyping, moneyValue } from "@/lib/moneyInput";

interface BudgetCardProps {
  summary: BudgetSummary;
  /** Todas as categorias de despesa, para a janela de limites */
  categories: BudgetCategory[];
  /** Gasto do período por categoria (dica na janela de limites) */
  spentByCategory: Record<string, number>;
  /** "mês" quando o período é um mês; "período" nos demais */
  periodWord: string;
}

const STATUS: Record<BudgetStatus, { label: (ongoing: boolean) => string; text: string; bar: string | null }> = {
  over: { label: () => "Estourou", text: "text-coral", bar: "var(--coral)" },
  warning: { label: (ongoing) => (ongoing ? "Acima do ritmo" : "Perto do limite"), text: "text-amber", bar: "var(--amber)" },
  ok: { label: (ongoing) => (ongoing ? "No ritmo" : "Dentro"), text: "text-text-dim", bar: null },
};

function parseAmount(value: string) {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Barra de uso do limite, com a marca de quanto "deveria" ter ido até hoje */
function BudgetBar({ ratio, color, expected }: { ratio: number; color: string; expected: number | null }) {
  return (
    <div className="relative h-2 rounded-full bg-fg/10">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
        style={{ width: `${Math.min(100, ratio * 100)}%`, backgroundColor: color }}
      />
      {expected !== null && expected > 0 && expected < 1 && (
        <div
          className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-fg/60"
          style={{ left: `calc(${expected * 100}% - 1px)` }}
          title={`Esperado até hoje: ${Math.round(expected * 100)}%`}
        />
      )}
    </div>
  );
}

function BudgetRow({ item, summary }: { item: BudgetItem; summary: BudgetSummary }) {
  const status = STATUS[item.status];
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
          <span className="text-sm font-medium text-fg truncate">{item.name}</span>
        </span>
        <span className={`text-[11px] font-medium uppercase tracking-wider shrink-0 ${status.text}`}>
          {status.label(summary.ongoing)}
        </span>
      </div>
      <BudgetBar ratio={item.ratio} color={status.bar ?? item.color} expected={summary.ongoing ? summary.expected : null} />
      <div className="flex flex-wrap justify-between gap-x-3 mt-1.5 text-xs text-text-dim">
        <span>
          <span className="font-mono-value text-fg">{formatCurrency(item.spent)}</span> de {formatCurrency(item.limit)}
        </span>
        <span>
          {item.remaining < 0 ? (
            <span className="text-coral">{formatCurrency(-item.remaining)} acima</span>
          ) : item.perDay !== null ? (
            <>
              {formatCurrency(item.perDay)}/dia até o fim
            </>
          ) : (
            <>sobraram {formatCurrency(item.remaining)}</>
          )}
        </span>
      </div>
    </li>
  );
}

/** Bloco do Dashboard: quanto de cada limite mensal já foi usado. */
export default function BudgetCard({ summary, categories, spentByCategory, periodWord }: BudgetCardProps) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  function openEditor() {
    setValues(
      Object.fromEntries(categories.map((c) => [c.id, moneyValue(c.monthlyBudget)]))
    );
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await saveBudgets(
      categories.map((c) => ({ categoryId: c.id, monthlyBudget: values[c.id] ?? "" }))
    );
    setSaving(false);
    if (result?.error) {
      toast.error("Não foi possível salvar o orçamento", result.error);
      return;
    }
    toast.success("Orçamento salvo");
    setOpen(false);
  }

  const monthlyTotal = categories.reduce((s, c) => s + parseAmount(values[c.id] ?? ""), 0);
  const overall = summary.limit > 0 ? summary.spent / summary.limit : 0;
  const overallStatus: BudgetStatus =
    summary.spent > summary.limit ? "over" : summary.items.some((i) => i.status !== "ok") ? "warning" : "ok";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="h-full glass-card p-6 flex flex-col"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-6">
        <div>
          <h2 className="font-display text-lg text-fg">Orçamento</h2>
          {summary.items.length > 0 && (
            <p className="text-xs text-text-dim mt-1">
              <span className="font-mono-value text-fg">{formatCurrency(summary.spent)}</span> de{" "}
              {formatCurrency(summary.limit)} planejados
              {summary.ongoing && <> · faltam {summary.daysLeft} {summary.daysLeft === 1 ? "dia" : "dias"}</>}
            </p>
          )}
        </div>
        <Button size="sm" variant="glass" onClick={openEditor}>
          Definir limites
        </Button>
      </div>

      {summary.items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-text-muted border border-dashed border-fg/10 rounded-lg">
          <p className="max-w-sm">
            Defina quanto quer gastar por mês em cada categoria e acompanhe aqui se o {periodWord} está no ritmo.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <BudgetBar
              ratio={overall}
              color={STATUS[overallStatus].bar ?? "var(--blue)"}
              expected={summary.ongoing ? summary.expected : null}
            />
            {summary.ongoing && (
              <p className="text-[11px] text-text-muted mt-1.5 flex items-center gap-1.5">
                <span className="inline-block w-0.5 h-2.5 rounded-full bg-fg/60" aria-hidden />
                esperado até hoje ({Math.round(summary.expected * 100)}% do {periodWord})
              </p>
            )}
          </div>
          <ul className="grid gap-x-8 gap-y-5 @xl:grid-cols-2 @4xl:grid-cols-3">
            {summary.items.map((item) => (
              <BudgetRow key={item.categoryId} item={item} summary={summary} />
            ))}
          </ul>
          {summary.unbudgeted > 0 && (
            <p className="text-xs text-text-muted mt-6">
              Mais {formatCurrency(summary.unbudgeted)} em categorias sem limite.
            </p>
          )}
        </>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Limites por mês" eyebrow="Orçamento" accent="blue">
        <form onSubmit={handleSave} className="space-y-5">
          <p className="text-sm text-text-dim">
            Quanto você quer gastar por mês em cada categoria. Deixe em branco para não limitar. Em períodos maiores,
            o limite é multiplicado pelos meses.
          </p>
          {categories.length === 0 ? (
            <p className="text-sm text-text-muted">Nenhuma categoria de despesa ainda.</p>
          ) : (
            <ul className="space-y-2 max-h-[50vh] overflow-y-auto -mx-1 px-1">
              {categories.map((c) => {
                const spent = spentByCategory[c.id] ?? 0;
                return (
                  <li key={c.id} className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <label htmlFor={`budget-${c.id}`} className="flex-1 min-w-0">
                      <span className="block text-sm text-fg truncate">{c.name}</span>
                      {spent > 0 && (
                        <span className="block text-[11px] text-text-muted">
                          {formatCurrency(spent)} neste {periodWord}
                        </span>
                      )}
                    </label>
                    <div className="relative w-36 shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted pointer-events-none">
                        R$
                      </span>
                      <input
                        id={`budget-${c.id}`}
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="Sem limite"
                        value={moneyDisplay(values[c.id])}
                        onChange={(e) => setValues((v) => ({ ...v, [c.id]: moneyFromTyping(e.target.value) }))}
                        className="w-full pl-9 pr-3 py-2 text-sm font-mono-value bg-fg/5 text-fg border border-fg/10 rounded-lg placeholder:text-text-muted placeholder:font-sans hover:border-fg/20 focus:border-blue focus:outline-none focus:ring-4 focus:ring-blue/10 transition-colors"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="pt-4 border-t border-fg/10 flex flex-wrap items-center gap-3">
            <p className="text-xs text-text-dim">
              Total por mês: <span className="font-mono-value text-fg">{formatCurrency(monthlyTotal)}</span>
            </p>
            <div className="ml-auto flex gap-3">
              <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Salvar
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
