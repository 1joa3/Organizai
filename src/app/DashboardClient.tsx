"use client";

import { motion } from "framer-motion";
import HeroSaldo from "@/components/dashboard/HeroSaldo";
import KpiStrip from "@/components/dashboard/KpiStrip";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import DonutCategories from "@/components/charts/DonutCategories";
import LinePatrimony from "@/components/charts/LinePatrimony";
import DebtPayoffChart from "@/components/charts/DebtPayoffChart";
import GoalProgressBar from "@/components/charts/GoalProgressBar";
import PeriodSelector from "@/components/ui/PeriodSelector";
import { formatCurrency, formatMonthYear, calcPercent } from "@/lib/formatters";

interface Props {
  monthlyTotals: { receitas: number; despesas: number; saldo: number };
  expensesByCategory: { categoryId: string; name: string; color: string; total: number }[];
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
  currentMonth: string;
  month: number;
  year: number;
}

export default function DashboardClient({
  monthlyTotals,
  expensesByCategory,
  investmentTotals,
  patrimonyEvolution,
  recentTransactions,
  goals,
  installmentsSummary,
  debtsSummary,
  currentMonth,
  month,
  year,
}: Props) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-baseline gap-4">
          <h1 className="font-display text-4xl text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-blue uppercase tracking-widest font-medium">{currentMonth}</p>
        </div>
        <PeriodSelector month={month} year={year} />
      </motion.div>

      {/* KPI Strip */}
      <KpiStrip
        receitas={monthlyTotals.receitas}
        despesas={monthlyTotals.despesas}
        economia={monthlyTotals.saldo}
        investido={investmentTotals.current}
        retorno={investmentTotals.returnPercent}
      />

      {/* Grid principal */}
      <div className="grid grid-cols-12 gap-6">
        {/* Hero Saldo (Aumentado para col-span-6 para dar mais ênfase) */}
        <div className="col-span-12 lg:col-span-6 xl:col-span-5">
          <HeroSaldo
            saldo={monthlyTotals.saldo}
            receitas={monthlyTotals.receitas}
            despesas={monthlyTotals.despesas}
          />
        </div>

        {/* Gráfico de evolução patrimonial */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="col-span-12 lg:col-span-6 xl:col-span-7 glass-card p-6"
        >
          <h2 className="font-display text-lg text-white mb-6">
            Evolução Patrimonial
          </h2>
          <LinePatrimony data={patrimonyEvolution} />
        </motion.div>

        {/* Dívidas parceladas em aberto */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="col-span-12 glass-card p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <h2 className="font-display text-lg text-white">Quitação de Dívidas</h2>
            <div className="flex flex-wrap gap-6 sm:gap-8">
              <div>
                <p className="text-[10px] font-medium text-text-dim uppercase tracking-wider mb-1">Total em dívidas</p>
                <p className="font-mono-value text-lg text-amber drop-shadow-[0_0_8px_rgba(255,184,0,0.3)]">
                  {formatCurrency(debtsSummary.totalDebt)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-text-dim uppercase tracking-wider mb-1">Previsão de quitação</p>
                <p className="font-mono-value text-lg text-white">
                  {debtsSummary.payoffDate
                    ? `${formatMonthYear(debtsSummary.payoffDate)} (${debtsSummary.monthsToPayoff} ${debtsSummary.monthsToPayoff === 1 ? "mês" : "meses"})`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
          <DebtPayoffChart timeline={debtsSummary.timeline} />
        </motion.div>

        {/* Donut de categorias */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="col-span-12 lg:col-span-4 xl:col-span-4 glass-card p-6"
        >
          <h2 className="font-display text-lg text-white mb-6">
            Despesas por Categoria
          </h2>
          <DonutCategories data={expensesByCategory} />
        </motion.div>

        {/* Despesas Parceladas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="col-span-12 lg:col-span-4 xl:col-span-4 glass-card p-6"
        >
          <h2 className="font-display text-lg text-white mb-6 flex items-center justify-between">
            Despesas Parceladas
            <span className="text-xs font-sans text-text-muted uppercase tracking-widest">{installmentsSummary.length} ativas</span>
          </h2>
          {installmentsSummary.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-text-muted border border-dashed border-white/10 rounded-lg">
              Nenhum parcelamento
            </div>
          ) : (
            <div className="space-y-6">
              {installmentsSummary.map((inst) => (
                <div key={inst.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{inst.name}</span>
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

        {/* Metas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="col-span-12 lg:col-span-4 xl:col-span-4 glass-card p-6 flex flex-col"
        >
          <h2 className="font-display text-lg text-white mb-6 flex items-center justify-between">
            Metas
            <span className="text-xs font-sans text-text-muted uppercase tracking-widest">{goals.length} ativas</span>
          </h2>
          {goals.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-text-muted border border-dashed border-white/10 rounded-lg">
              Nenhuma meta cadastrada
            </div>
          ) : (
            <div className="space-y-6">
              {goals.map((goal) => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{goal.name}</span>
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

        {/* Transações recentes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="col-span-12 lg:col-span-4 xl:col-span-4 glass-card p-6"
        >
          <h2 className="font-display text-lg text-white mb-4">
            Recentes
          </h2>
          <RecentTransactions transactions={recentTransactions} />
        </motion.div>
      </div>
    </div>
  );
}
