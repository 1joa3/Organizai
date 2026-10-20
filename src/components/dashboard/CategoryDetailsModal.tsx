"use client";

import Modal from "@/components/ui/Modal";
import ChangeBadge from "@/components/ui/ChangeBadge";
import type { CategoryRow } from "@/lib/categoryBreakdown";
import { formatCurrency, formatDateShort } from "@/lib/formatters";

export interface CategoryExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryId: string;
  account: string;
}

interface CategoryDetailsModalProps {
  isOpen: boolean;
  /** Continua preenchido enquanto o modal anima ao fechar */
  category: CategoryRow | null;
  /** Despesas do período; o modal filtra as da categoria */
  expenses: CategoryExpense[];
  periodLabel: string;
  onClose: () => void;
}

export default function CategoryDetailsModal({ isOpen, category, expenses, periodLabel, onClose }: CategoryDetailsModalProps) {
  const items = category
    ? expenses.filter((t) => t.categoryId === category.categoryId).sort((a, b) => b.amount - a.amount)
    : [];

  const stats = category
    ? [
        { label: "No período", value: formatCurrency(category.total) },
        { label: "Período anterior", value: formatCurrency(category.previousTotal), extra: <ChangeBadge change={category.change} /> },
        { label: "Transações", value: String(category.count) },
        { label: "Média", value: formatCurrency(category.average) },
      ]
    : [];

  return (
    <Modal isOpen={isOpen && category !== null} onClose={onClose} title={category?.name ?? ""} eyebrow={periodLabel} accent="coral">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-fg/10 bg-fg/[0.03] px-3 py-2.5">
              <p className="text-[10px] font-medium text-text-dim uppercase tracking-wider">{s.label}</p>
              <p className="font-mono-value text-sm text-fg mt-1 flex items-center gap-2">
                {s.value}
                {s.extra}
              </p>
            </div>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-muted border border-dashed border-fg/10 rounded-lg">
            Nenhuma despesa nesta categoria no período
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-medium text-text-dim uppercase tracking-wider mb-1">Maiores despesas</p>
            <div className="divide-y divide-fg/5 max-h-80 overflow-y-auto -mx-1 px-1">
              {items.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-fg truncate">{t.description}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      <span className="font-mono-value">{formatDateShort(t.date)}</span> · {t.account}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono-value text-sm text-coral">−{formatCurrency(t.amount)}</p>
                    <p className="font-mono-value text-[10px] text-text-muted mt-0.5">
                      {category && category.total > 0 ? `${((t.amount / category.total) * 100).toFixed(1)}%` : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
