"use client";

import CardSpotlight from "@/components/ui/CardSpotlight";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { motion } from "framer-motion";

interface KpiStripProps {
  receitas: number;
  despesas: number;
  /** Dias do período já passados (para a média diária) */
  days: number;
  investido?: number;
  retorno?: number;
}

// Tamanho do valor proporcional à largura do bloco (cqi), até o 1.25rem de
// sempre: "R$ 16.320,50" cabe no cartão em qualquer largura, sem quebrar.
// Um fator por arranjo do grid, porque a largura de cada cartão muda (½, ¼)
const VALUE_SIZE = "text-[min(1.25rem,5cqi)] @xl:text-[min(1.25rem,2.6cqi)]";

const glow = (good: boolean) =>
  good ? "drop-shadow-[0_0_8px_rgba(204,255,0,0.3)]" : "drop-shadow-[0_0_8px_rgba(255,0,85,0.3)]";

/**
 * Indicadores que completam o resumo (receitas e despesas já estão nele):
 * quanto da renda ficou, o gasto médio por dia e os investimentos.
 */
export default function KpiStrip({ receitas, despesas, days, investido, retorno }: KpiStripProps) {
  const rate = receitas > 0 ? (receitas - despesas) / receitas : null;
  const perDay = despesas / Math.max(1, days);

  const kpis = [
    {
      label: "Taxa de poupança",
      shortLabel: "Poupança",
      value: rate === null ? "—" : <AnimatedNumber value={Math.round(rate * 100)} format="percent" />,
      hint: "do que entrou ficou",
      color: rate === null ? "text-fg" : rate >= 0 ? "text-emerald" : "text-coral",
      glow: rate === null ? "" : glow(rate >= 0),
    },
    {
      label: "Gasto médio por dia",
      shortLabel: "Gasto/dia",
      value: <AnimatedNumber value={perDay} />,
      hint: `em ${days} ${days === 1 ? "dia" : "dias"}`,
      color: "text-fg",
      glow: "",
    },
    {
      label: "Patrimônio Investido",
      shortLabel: "Investido",
      value: <AnimatedNumber value={investido || 0} />,
      hint: "valor atual",
      color: "text-amber",
      glow: "drop-shadow-[0_0_8px_rgba(255,184,0,0.3)]",
    },
    {
      label: "Retorno",
      value: <AnimatedNumber value={(retorno || 0) * 100} format="percent" decimals={2} signed />,
      hint: "dos investimentos",
      color: (retorno || 0) >= 0 ? "text-emerald" : "text-coral",
      glow: glow((retorno || 0) >= 0),
    },
  ];

  return (
    // Medido pela largura do bloco, não da tela: 2 colunas, ou 4 quando cabe
    <div className="grid grid-cols-2 @xl:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card p-3.5 @xl:p-5 relative overflow-hidden group min-w-0"
        >
          <CardSpotlight size={200} />
          {/* Subtle top highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <p className="text-xs font-medium text-text-dim uppercase tracking-wider truncate" title={kpi.label}>
            {"shortLabel" in kpi ? (
              <>
                {/* Em 2 colunas o nome completo não cabe */}
                <span className="@3xl:hidden">{kpi.shortLabel}</span>
                <span className="hidden @3xl:inline">{kpi.label}</span>
              </>
            ) : (
              kpi.label
            )}
          </p>
          <p className={`font-mono-value font-medium mt-2 whitespace-nowrap ${VALUE_SIZE} ${kpi.color} ${kpi.glow}`}>
            {kpi.value}
          </p>
          <p className="text-[11px] text-text-muted mt-1 truncate">{kpi.hint}</p>
        </motion.div>
      ))}
    </div>
  );
}
