"use client";

import { motion } from "framer-motion";
import { formatCurrency, formatReturn } from "@/lib/formatters";

interface KpiStripProps {
  receitas: number;
  despesas: number;
  economia: number;
  investido?: number;
  retorno?: number;
}

// Tamanho do valor proporcional à largura do bloco (cqi), até o 1.25rem de
// sempre: "R$ 16.320,50" cabe no cartão em qualquer largura, sem quebrar.
// Um fator por arranjo do grid, porque a largura de cada cartão muda (½, ⅓, ⅕)
const VALUE_SIZE = "text-[min(1.25rem,5cqi)] @xl:text-[min(1.25rem,3.2cqi)] @4xl:text-[min(1.25rem,1.8cqi)]";

export default function KpiStrip({
  receitas,
  despesas,
  economia,
  investido,
  retorno,
}: KpiStripProps) {
  const kpis = [
    {
      label: "Receitas",
      value: formatCurrency(receitas),
      color: "text-emerald",
      glow: "drop-shadow-[0_0_8px_rgba(204,255,0,0.3)]",
    },
    {
      label: "Despesas",
      value: formatCurrency(despesas),
      color: "text-coral",
      glow: "drop-shadow-[0_0_8px_rgba(255,0,85,0.3)]",
    },
    {
      label: "Economia",
      value: formatCurrency(economia),
      color: economia >= 0 ? "text-emerald" : "text-coral",
      glow: economia >= 0 ? "drop-shadow-[0_0_8px_rgba(204,255,0,0.3)]" : "drop-shadow-[0_0_8px_rgba(255,0,85,0.3)]",
    },
    {
      label: "Patrimônio Investido",
      shortLabel: "Investido",
      value: formatCurrency(investido || 0),
      color: "text-amber",
      glow: "drop-shadow-[0_0_8px_rgba(255,184,0,0.3)]",
    },
    {
      label: "Retorno",
      value: formatReturn(retorno || 0),
      color: (retorno || 0) >= 0 ? "text-emerald" : "text-coral",
      glow: (retorno || 0) >= 0 ? "drop-shadow-[0_0_8px_rgba(204,255,0,0.3)]" : "drop-shadow-[0_0_8px_rgba(255,0,85,0.3)]",
    },
  ];

  return (
    // Medido pela largura do bloco, não da tela. Sem cartão sobrando sozinho
    // numa linha: em 2 colunas o último ocupa a linha toda; em 6, são 3 + 2
    <div className="grid grid-cols-2 @xl:grid-cols-6 @4xl:grid-cols-5 gap-3 sm:gap-4">
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`glass-card p-3.5 @xl:p-5 relative overflow-hidden group min-w-0 ${
            i === kpis.length - 1 ? "col-span-2" : ""
          } ${i < 3 ? "@xl:col-span-2" : "@xl:col-span-3"} @4xl:col-span-1`}
        >
          {/* Subtle top highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <p className="text-xs font-medium text-text-dim uppercase tracking-wider truncate" title={kpi.label}>
            {"shortLabel" in kpi ? (
              <>
                {/* Em 2 colunas o nome completo não cabe */}
                <span className="@xl:hidden">{kpi.shortLabel}</span>
                <span className="hidden @xl:inline">{kpi.label}</span>
              </>
            ) : (
              kpi.label
            )}
          </p>
          <p className={`font-mono-value font-medium mt-2 whitespace-nowrap ${VALUE_SIZE} ${kpi.color} ${kpi.glow}`}>
            {kpi.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
