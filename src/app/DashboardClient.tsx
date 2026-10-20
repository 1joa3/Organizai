"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HeroSaldo from "@/components/dashboard/HeroSaldo";
import KpiStrip from "@/components/dashboard/KpiStrip";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import DonutCategories from "@/components/charts/DonutCategories";
import CategoryTrendChart from "@/components/charts/CategoryTrendChart";
import CategoryDetailsModal, { type CategoryExpense } from "@/components/dashboard/CategoryDetailsModal";
import LinePatrimony from "@/components/charts/LinePatrimony";
import DebtPayoffChart from "@/components/charts/DebtPayoffChart";
import GoalProgressBar from "@/components/charts/GoalProgressBar";
import PeriodSelector from "@/components/ui/PeriodSelector";
import ResizableBlock from "@/components/dashboard/ResizableBlock";
import {
  type DashboardBlockId,
  type DashboardLayout,
  blockLabel,
  defaultLayout,
  isDefaultLayout,
  moveBlock,
  saveLayoutCookie,
  setBlockHidden,
  setBlockSpan,
  visibleBlocks,
} from "@/lib/dashboardLayout";
import type { CategoryRow } from "@/lib/categoryBreakdown";
import { formatCurrency, formatMonthYear, calcPercent } from "@/lib/formatters";

interface Props {
  monthlyTotals: { receitas: number; despesas: number; saldo: number };
  categoryReport: {
    total: number;
    previousTotal: number;
    categories: CategoryRow[];
    trend: {
      months: string[];
      series: { categoryId: string; name: string; color: string; values: number[] }[];
    };
    expenses: CategoryExpense[];
  };
  installmentsSummary: { name: string; color: string; total: number; currentInstallment: number; totalInstallments: number; currentAmount: number; targetAmount: number }[];
  investmentTotals: { invested: number; current: number; returnAmount: number; returnPercent: number };
  patrimonyEvolution: { label: string; saldo: number; investido: number }[];
  recentTransactions: {
    id: string;
    description: string;
    amount: number;
    type: string;
    date: string;
    category: { name: string; color: string; icon: string | null };
    account: { name: string };
  }[];
  goals: {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    color: string;
    deadline: string | null;
  }[];
  debtsSummary: {
    debts: { name: string; color: string; totalInstallments: number; remainingInstallments: number; remainingAmount: number }[];
    totalDebt: number;
    payoffDate: string | null;
    monthsToPayoff: number;
    timeline: { label: string; remaining: number }[];
  };
  periodLabel: string;
  period: string;
  layout: DashboardLayout;
}

export default function DashboardClient({
  monthlyTotals,
  categoryReport,
  investmentTotals,
  patrimonyEvolution,
  recentTransactions,
  goals,
  installmentsSummary,
  debtsSummary,
  periodLabel,
  period,
  layout: initialLayout,
}: Props) {
  const [layout, setLayout] = useState(initialLayout);
  const [editing, setEditing] = useState(false);
  const [categoryView, setCategoryView] = useState<"distribuicao" | "evolucao">("distribuicao");
  const [detailCategoryId, setDetailCategoryId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // No donut só entram as categorias com gasto no período
  const spentCategories = categoryReport.categories.filter((c) => c.total > 0);
  const totalChange =
    categoryReport.previousTotal > 0
      ? (categoryReport.total - categoryReport.previousTotal) / categoryReport.previousTotal
      : null;

  function openCategoryDetails(name: string) {
    const category = spentCategories.find((c) => c.name === name);
    if (!category) return;
    setDetailCategoryId(category.categoryId);
    setDetailOpen(true);
  }

  // As larguras só valem com o grid largo (≥ 56rem, o @4xl do container
  // "dash"); mais estreito, o modo de edição esconde a alça e os atalhos
  const gridRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const observer = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= 56 * rem));
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  function updateLayout(next: DashboardLayout) {
    setLayout(next);
    saveLayoutCookie(next);
  }

  const visible = visibleBlocks(layout);

  function blockProps(id: DashboardBlockId) {
    const index = visible.indexOf(id);
    return {
      label: blockLabel(id),
      span: layout.spans[id],
      editing,
      wide,
      // Durante o arraste só pré-visualiza; salva ao soltar
      onResize: (span: number) => setLayout((prev) => setBlockSpan(prev, id, span)),
      onResizeEnd: (span: number) => updateLayout(setBlockSpan(layout, id, span)),
      onMoveBefore: index > 0 ? () => updateLayout(moveBlock(layout, id, -1)) : undefined,
      onMoveAfter: index < visible.length - 1 ? () => updateLayout(moveBlock(layout, id, 1)) : undefined,
      onHide: () => updateLayout(setBlockHidden(layout, id, true)),
    };
  }

  const blockContent: Record<DashboardBlockId, React.ReactNode> = {
    kpis: (
      <KpiStrip
        receitas={monthlyTotals.receitas}
        despesas={monthlyTotals.despesas}
        economia={monthlyTotals.saldo}
        investido={investmentTotals.current}
        retorno={investmentTotals.returnPercent}
      />
    ),
    // Hero Saldo
    saldo: (
      <div className="h-full">
        <HeroSaldo
          saldo={monthlyTotals.saldo}
          receitas={monthlyTotals.receitas}
          despesas={monthlyTotals.despesas}
        />
      </div>
    ),
    // Gráfico de evolução patrimonial
    patrimonio: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="h-full glass-card p-6"
      >
        <h2 className="font-display text-lg text-fg mb-6">
          Evolução Patrimonial
        </h2>
        <LinePatrimony data={patrimonyEvolution} />
      </motion.div>
    ),
    // Dívidas parceladas em aberto
    dividas: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="h-full glass-card p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <h2 className="font-display text-lg text-fg">Quitação de Dívidas</h2>
          <div className="flex flex-wrap gap-6 sm:gap-8">
            <div>
              <p className="text-[10px] font-medium text-text-dim uppercase tracking-wider mb-1">Total em dívidas</p>
              <p className="font-mono-value text-lg text-amber drop-shadow-[0_0_8px_rgba(255,184,0,0.3)]">
                {formatCurrency(debtsSummary.totalDebt)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-text-dim uppercase tracking-wider mb-1">Previsão de quitação</p>
              <p className="font-mono-value text-lg text-fg">
                {debtsSummary.payoffDate
                  ? `${formatMonthYear(debtsSummary.payoffDate)} (${debtsSummary.monthsToPayoff} ${debtsSummary.monthsToPayoff === 1 ? "mês" : "meses"})`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
        <DebtPayoffChart timeline={debtsSummary.timeline} />
      </motion.div>
    ),
    // Donut de categorias
    categorias: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="h-full glass-card p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="font-display text-lg text-fg">Despesas por Categoria</h2>
          <div className="flex gap-1 p-1 bg-fg/5 rounded-lg border border-fg/10">
            {([
              ["distribuicao", "Distribuição"],
              ["evolucao", "Evolução"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategoryView(value)}
                aria-pressed={categoryView === value}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  categoryView === value ? "bg-fg/10 text-fg" : "text-text-muted hover:text-fg"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {categoryView === "distribuicao" ? (
          <DonutCategories data={spentCategories} totalChange={totalChange} onDetails={openCategoryDetails} />
        ) : (
          <CategoryTrendChart months={categoryReport.trend.months} series={categoryReport.trend.series} highlightId={null} />
        )}
      </motion.div>
    ),
    // Despesas Parceladas
    parceladas: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="h-full glass-card p-6"
      >
        <h2 className="font-display text-lg text-fg mb-6 flex items-center justify-between">
          Despesas Parceladas
          <span className="text-xs font-sans text-text-muted uppercase tracking-widest">{installmentsSummary.length} ativas</span>
        </h2>
        {installmentsSummary.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-text-muted border border-dashed border-fg/10 rounded-lg">
            Nenhum parcelamento
          </div>
        ) : (
          <div className="space-y-6">
            {installmentsSummary.map((inst) => (
              <div key={inst.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-fg">{inst.name}</span>
                  <span className="font-mono-value text-xs text-text-dim">
                    {inst.currentInstallment}/{inst.totalInstallments} parcelas
                  </span>
                </div>
                <GoalProgressBar
                  current={inst.currentAmount}
                  target={inst.targetAmount}
                  color={inst.color}
                  height={6}
                  showLabel={false}
                />
                <p className="text-[10px] text-text-muted mt-1.5 font-mono-value tracking-wider flex justify-between">
                  <span>{calcPercent(inst.currentAmount, inst.targetAmount)}% PAGO</span>
                  <span>{formatCurrency(inst.total)} nesta fatura</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    ),
    // Metas
    metas: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="h-full glass-card p-6 flex flex-col"
      >
        <h2 className="font-display text-lg text-fg mb-6 flex items-center justify-between">
          Metas
          <span className="text-xs font-sans text-text-muted uppercase tracking-widest">{goals.length} ativas</span>
        </h2>
        {goals.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-text-muted border border-dashed border-fg/10 rounded-lg">
            Nenhuma meta cadastrada
          </div>
        ) : (
          <div className="space-y-6">
            {goals.map((goal) => (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-fg">{goal.name}</span>
                  <span className="font-mono-value text-xs text-text-dim">
                    {formatCurrency(goal.currentAmount)}
                  </span>
                </div>
                <GoalProgressBar
                  current={goal.currentAmount}
                  target={goal.targetAmount}
                  color={goal.color}
                  height={6}
                  showLabel={false}
                />
                <p className="text-[10px] text-text-muted mt-1.5 font-mono-value tracking-wider">
                  {calcPercent(goal.currentAmount, goal.targetAmount)}% ALCANÇADO DE {formatCurrency(goal.targetAmount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    ),
    // Transações recentes
    recentes: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="h-full glass-card p-6"
      >
        <h2 className="font-display text-lg text-fg mb-4">
          Recentes
        </h2>
        <RecentTransactions transactions={recentTransactions} />
      </motion.div>
    ),
  };

  return (
    // Container "page": o cabeçalho responde à largura do conteúdo, como os blocos
    <div className="@container/page space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-baseline gap-4">
          <h1 className="font-display text-4xl text-fg tracking-tight">Dashboard</h1>
          <p className="text-sm text-blue uppercase tracking-widest font-medium">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-3 w-full @xl/page:w-auto">
          <div className="flex-1 min-w-0 @xl/page:flex-none">
            <PeriodSelector period={period} />
          </div>
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            aria-pressed={editing}
            aria-label={editing ? "Concluir personalização" : "Personalizar Dashboard"}
            title={editing ? "Concluir" : "Personalizar"}
            className={`flex shrink-0 h-11 items-center gap-2 px-3.5 @xl/page:px-4 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer ${
              editing
                ? "bg-blue text-bg border-blue"
                : "border-fg/10 bg-fg/5 text-text-dim hover:text-fg hover:border-fg/20 hover:bg-fg/10"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {editing ? (
                <path d="M20 6L9 17l-5-5" />
              ) : (
                <>
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="18" height="7" rx="1.5" />
                </>
              )}
            </svg>
            <span className="hidden @xl/page:inline">{editing ? "Concluir" : "Personalizar"}</span>
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-4 py-3 rounded-xl border border-blue/30 bg-blue/5 text-sm text-text-dim">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  {wide
                    ? "Use a barra de cada bloco para reordenar, mudar a largura ou esconder. A alça na borda direita também ajusta a largura."
                    : "Use a barra de cada bloco para reordenar ou esconder. Em telas mais largas dá para mudar a largura também."}
                </span>
                {!isDefaultLayout(layout) && (
                  <button
                    type="button"
                    onClick={() => updateLayout(defaultLayout())}
                    className="text-sm font-medium text-blue hover:underline cursor-pointer shrink-0"
                  >
                    Restaurar padrão
                  </button>
                )}
              </div>
              {layout.hidden.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-blue/20">
                  <span className="text-xs text-text-muted">Escondidos:</span>
                  {layout.hidden.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => updateLayout(setBlockHidden(layout, id, false))}
                      className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-fg/15 bg-panel text-xs font-medium text-text-dim hover:text-fg hover:border-blue/50 transition-colors cursor-pointer"
                    >
                      <span className="text-blue">+</span>
                      {blockLabel(id)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid principal: blocos visíveis na ordem escolhida */}
      <div ref={gridRef} className="@container/dash">
        <div className="grid grid-cols-12 gap-4 sm:gap-6">
          {visible.map((id) => (
            <ResizableBlock key={id} {...blockProps(id)}>
              {blockContent[id]}
            </ResizableBlock>
          ))}
        </div>
        {visible.length === 0 && (
          <div className="py-16 text-center text-sm text-text-muted border border-dashed border-fg/10 rounded-xl">
            Todos os blocos estão escondidos. Use <span className="text-fg">Personalizar</span> para trazê-los de volta.
          </div>
        )}
      </div>

      <CategoryDetailsModal
        isOpen={detailOpen}
        category={categoryReport.categories.find((c) => c.categoryId === detailCategoryId) ?? null}
        expenses={categoryReport.expenses}
        periodLabel={periodLabel}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
