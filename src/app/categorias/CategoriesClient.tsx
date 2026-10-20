"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import DonutCategories from "@/components/charts/DonutCategories";
import CategoryTrendChart from "@/components/charts/CategoryTrendChart";
import CategoryIcon from "@/components/ui/CategoryIcon";
import PeriodSelector from "@/components/ui/PeriodSelector";
import type { CategoryRow } from "@/lib/categoryBreakdown";
import { formatCurrency, formatDateShort } from "@/lib/formatters";

interface Props {
  total: number;
  previousTotal: number;
  days: number;
  categories: CategoryRow[];
  trend: {
    months: string[];
    series: { categoryId: string; name: string; color: string; values: number[] }[];
  };
  transactions: {
    id: string;
    description: string;
    amount: number;
    date: string;
    categoryId: string;
    account: string;
  }[];
  periodLabel: string;
  period: string;
}

function formatShare(share: number) {
  return `${(share * 100).toFixed(1).replace(".", ",")}%`;
}

/** Variação de gasto: subir é ruim (coral), cair é bom (verde). */
function ChangeBadge({ change }: { change: number | null }) {
  if (change === null) return <span className="text-[11px] text-text-muted">novo</span>;
  const rounded = Math.round(change * 100);
  if (rounded === 0) return <span className="font-mono-value text-[11px] text-text-muted">0%</span>;
  const up = rounded > 0;
  return (
    <span className={`font-mono-value text-[11px] ${up ? "text-coral" : "text-emerald"}`}>
      {up ? "▲" : "▼"} {Math.abs(rounded)}%
    </span>
  );
}

const cardMotion = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
});

export default function CategoriesClient({
  total,
  previousTotal,
  days,
  categories,
  trend,
  transactions,
  periodLabel,
  period,
}: Props) {
  // Categoria aberta no detalhe; começa pela de maior gasto
  const [selectedId, setSelectedId] = useState<string | null>(categories[0]?.total ? categories[0].categoryId : null);
  const [prevPeriod, setPrevPeriod] = useState(period);
  if (period !== prevPeriod) {
    // Trocou de período: volta para a maior categoria do novo período
    setPrevPeriod(period);
    setSelectedId(categories[0]?.total ? categories[0].categoryId : null);
  }

  const withSpending = categories.filter((c) => c.total > 0);
  const selected = categories.find((c) => c.categoryId === selectedId) ?? null;
  const selectedTransactions = transactions
    .filter((t) => t.categoryId === selectedId)
    .sort((a, b) => b.amount - a.amount);
  const totalChange = previousTotal > 0 ? (total - previousTotal) / previousTotal : null;
  const top = withSpending[0];

  const kpis = [
    {
      label: "Total gasto",
      value: formatCurrency(total),
      extra: (
        <span className="flex items-center gap-1.5">
          <ChangeBadge change={totalChange} />
          <span className="text-[11px] text-text-muted">vs. período anterior</span>
        </span>
      ),
      color: "text-coral",
    },
    {
      label: "Média por dia",
      value: formatCurrency(days > 0 ? total / days : 0),
      extra: <span className="text-[11px] text-text-muted">{days} dias no período</span>,
      color: "text-fg",
    },
    {
      label: "Maior categoria",
      value: top ? top.name : "—",
      extra: top ? <span className="font-mono-value text-[11px] text-text-muted">{formatShare(top.share)} do total</span> : null,
      color: "text-amber",
    },
    {
      label: "Transações",
      value: String(transactions.length),
      extra: (
        <span className="text-[11px] text-text-muted">
          em {withSpending.length} {withSpending.length === 1 ? "categoria" : "categorias"}
        </span>
      ),
      color: "text-fg",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-baseline gap-4">
          <h1 className="font-display text-4xl text-fg tracking-tight">Categorias</h1>
          <p className="text-sm text-blue uppercase tracking-widest font-medium">{periodLabel}</p>
        </div>
        <PeriodSelector period={period} />
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} {...cardMotion(0.1 + i * 0.05)} className="glass-card p-5 min-w-0">
            <p className="text-xs font-medium text-text-dim uppercase tracking-wider truncate">{kpi.label}</p>
            <p className={`font-mono-value text-xl font-medium mt-2 truncate ${kpi.color}`}>{kpi.value}</p>
            <div className="mt-1.5 min-h-4">{kpi.extra}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Distribuição */}
        <motion.div {...cardMotion(0.2)} className="lg:col-span-5 glass-card p-6 @container">
          <h2 className="font-display text-lg text-fg mb-6">Distribuição</h2>
          <DonutCategories data={withSpending} />
        </motion.div>

        {/* Ranking */}
        <motion.div {...cardMotion(0.25)} className="lg:col-span-7 glass-card p-6 flex flex-col min-w-0">
          <h2 className="font-display text-lg text-fg mb-1 flex items-center justify-between">
            Ranking
            <span className="text-xs font-sans text-text-muted uppercase tracking-widest">vs. período anterior</span>
          </h2>
          <p className="text-xs text-text-muted mb-4">Clique numa categoria para ver as despesas dela.</p>
          {categories.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12 text-sm text-text-muted border border-dashed border-fg/10 rounded-lg">
              Nenhuma despesa no período
            </div>
          ) : (
            <div className="space-y-1 max-h-[420px] overflow-y-auto -mx-2 px-2">
              {categories.map((c) => {
                const isSelected = c.categoryId === selectedId;
                return (
                  <button
                    key={c.categoryId}
                    type="button"
                    onClick={() => setSelectedId(isSelected ? null : c.categoryId)}
                    aria-pressed={isSelected}
                    className={`w-full text-left p-3 rounded-xl border transition-colors duration-200 cursor-pointer ${
                      isSelected ? "bg-fg/[0.06] border-fg/15" : "border-transparent hover:bg-fg/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${c.color}15`, border: `1px solid ${c.color}30`, color: c.color }}
                      >
                        <CategoryIcon name={c.name} size={15} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-medium text-fg truncate">{c.name}</span>
                          <span className="font-mono-value text-sm text-fg shrink-0">{formatCurrency(c.total)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-fg/5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{ width: `${c.share * 100}%`, backgroundColor: c.color }}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] text-text-muted">
                          <span className="font-mono-value truncate">
                            {formatShare(c.share)} · {c.count} {c.count === 1 ? "transação" : "transações"}
                            {c.count > 0 && <> · média {formatCurrency(c.average)}</>}
                          </span>
                          <ChangeBadge change={c.change} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Evolução mensal */}
        <motion.div {...cardMotion(0.3)} className="lg:col-span-12 glass-card p-6 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="font-display text-lg text-fg">Evolução mensal</h2>
            {selected ? (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="flex items-center gap-2 text-xs font-medium text-text-dim hover:text-fg cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selected.color }} />
                {selected.name}
                <span className="text-blue">· ver todas</span>
              </button>
            ) : (
              <span className="text-xs text-text-muted">Todas as categorias</span>
            )}
          </div>
          <CategoryTrendChart months={trend.months} series={trend.series} highlightId={selectedId} />
        </motion.div>

        {/* Despesas da categoria selecionada */}
        {selected && (
          <motion.div {...cardMotion(0.1)} key={selected.categoryId} className="lg:col-span-12 glass-card p-6 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <h2 className="font-display text-lg text-fg flex items-center gap-2">
                <span style={{ color: selected.color }}>
                  <CategoryIcon name={selected.name} size={18} />
                </span>
                {selected.name}
              </h2>
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-[10px] font-medium text-text-dim uppercase tracking-wider mb-1">No período</p>
                  <p className="font-mono-value text-base text-fg">{formatCurrency(selected.total)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-text-dim uppercase tracking-wider mb-1">Período anterior</p>
                  <p className="font-mono-value text-base text-text-dim">{formatCurrency(selected.previousTotal)}</p>
                </div>
              </div>
            </div>
            {selectedTransactions.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-muted border border-dashed border-fg/10 rounded-lg">
                Nenhuma despesa nesta categoria no período
              </div>
            ) : (
              <div className="divide-y divide-fg/5 max-h-96 overflow-y-auto">
                {selectedTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm text-fg truncate">{t.description}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        <span className="font-mono-value">{formatDateShort(t.date)}</span> · {t.account}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono-value text-sm text-coral">−{formatCurrency(t.amount)}</p>
                      <p className="font-mono-value text-[11px] text-text-muted mt-0.5">
                        {formatShare(selected.total > 0 ? t.amount / selected.total : 0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
