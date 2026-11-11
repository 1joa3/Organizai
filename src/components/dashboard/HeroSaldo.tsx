"use client";

import { motion } from "framer-motion";
import PaceChart from "@/components/charts/PaceChart";
import { comparisonPhrase, type Pace } from "@/lib/dashboardStory";
import { formatCurrency } from "@/lib/formatters";

interface HeroSaldoProps {
  saldo: number;
  receitas: number;
  despesas: number;
  previous: { receitas: number; despesas: number; saldo: number };
  pace: Pace;
  rangeStart: string;
  periodLabel: string;
  /** "outubro" quando o período é um mês; null nos demais */
  previousName: string | null;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Resumo do período: quanto sobrou, comparado ao período anterior, e o
 * ritmo de gastos dia a dia — no período em andamento, com a projeção de
 * como deve fechar.
 */
export default function HeroSaldo({
  saldo,
  receitas,
  despesas,
  previous,
  pace,
  rangeStart,
  periodLabel,
  previousName,
}: HeroSaldoProps) {
  const finished = pace.elapsed >= pace.days;
  const positive = saldo >= 0;
  const verb = finished ? (positive ? "Sobraram" : "Faltaram") : positive ? "Sobram" : "Faltam";
  const hasPrevious = previous.receitas > 0 || previous.despesas > 0;
  const currentName = previousName ? capitalize(periodLabel.split(" ")[0]) : "Este período";
  const previousLabel = previousName ? capitalize(previousName) : "Período anterior";

  // Comparação: no período em andamento, o gasto até hoje contra o mesmo
  // ponto do anterior; no que já acabou, a sobra de um contra a do outro
  let comparison: { good: boolean; text: string } | null = null;
  if (pace.ongoing && pace.previousToDate > 0) {
    const diff = pace.spentToDate - pace.previousToDate;
    comparison = {
      good: diff <= 0,
      text: `${formatCurrency(Math.abs(diff))} ${diff <= 0 ? "a menos" : "a mais"} de gastos ${comparisonPhrase(previousName, true)}`,
    };
  } else if (finished && hasPrevious) {
    const diff = saldo - previous.saldo;
    comparison = {
      good: diff >= 0,
      text: `${formatCurrency(Math.abs(diff))} ${diff >= 0 ? "a mais" : "a menos"} de sobra ${comparisonPhrase(previousName, false)}`,
    };
  }

  const showChart = pace.days > 1 && (despesas > 0 || pace.previousTotal > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden glass-card p-6 sm:p-8 min-h-full flex flex-col gap-6"
    >
      {/* Brilho do fundo: verde quando sobra, rosa quando falta */}
      <div
        className={`absolute -top-32 -left-24 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none ${
          positive ? "bg-emerald/40" : "bg-coral/40"
        }`}
      />

      <div className="relative">
        <p className="text-xs font-medium text-text-dim uppercase tracking-widest mb-3">{periodLabel}</p>
        <p className="font-display text-lg text-text-dim leading-none">{verb}</p>
        <p
          className={`font-mono-value text-4xl @sm:text-5xl font-light tracking-tight mt-1 ${
            positive ? "text-fg" : "text-coral"
          }`}
        >
          {formatCurrency(Math.abs(saldo))}
        </p>
        <p className="text-sm text-text-dim mt-2">
          {receitas > 0 ? (
            <>
              <span className="whitespace-nowrap">
                de <span className="font-mono-value text-emerald">{formatCurrency(receitas)}</span> que entraram
              </span>
              {" · "}
              <span className="whitespace-nowrap">
                saíram <span className="font-mono-value text-coral">{formatCurrency(despesas)}</span>
              </span>
            </>
          ) : (
            <>
              Nenhuma receita · saíram <span className="font-mono-value text-coral">{formatCurrency(despesas)}</span>
            </>
          )}
        </p>

        {comparison && (
          <p
            className={`inline-flex items-center gap-1.5 mt-4 px-2.5 py-1 rounded-full text-xs font-medium border ${
              comparison.good
                ? "text-emerald border-emerald/25 bg-emerald/10"
                : "text-coral border-coral/25 bg-coral/10"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {comparison.good ? <path d="M20 6L9 17l-5-5" /> : <><path d="M12 9v4" /><path d="M12 17h.01" /><circle cx="12" cy="12" r="9" /></>}
            </svg>
            <span className="text-fg/90">{comparison.text}</span>
          </p>
        )}
      </div>

      {showChart && (
        <div className="relative pt-5 border-t border-fg/10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
            <h3 className="text-sm font-medium text-fg">Ritmo de gastos</h3>
            {pace.ongoing && (
              <p className="text-xs text-text-dim">
                {formatCurrency(pace.spentToDate)} até hoje · dia {pace.elapsed} de {pace.days}
              </p>
            )}
          </div>
          <PaceChart pace={pace} rangeStart={rangeStart} currentLabel={currentName} previousLabel={previousLabel} />
          <p className="text-xs text-text-dim mt-3 leading-relaxed">
            {pace.ongoing ? (
              <>
                {pace.projection !== null && (
                  <>
                    Se o resto {previousName ? "do mês" : "do período"} for como{" "}
                    {previousName ?? "o anterior"}, os gastos fecham em cerca de{" "}
                    <span className="font-mono-value text-fg">{formatCurrency(pace.projection)}</span>.{" "}
                  </>
                )}
                {pace.scheduled > 0 && (
                  <>
                    Já há <span className="font-mono-value text-fg">{formatCurrency(pace.scheduled)}</span> lançados para os
                    próximos dias.
                  </>
                )}
              </>
            ) : (
              pace.previousTotal > 0 && (
                <>
                  {previousLabel}: <span className="font-mono-value text-fg">{formatCurrency(pace.previousTotal)}</span> de
                  gastos.
                </>
              )
            )}
          </p>
        </div>
      )}
    </motion.div>
  );
}
