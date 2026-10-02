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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card p-5 relative overflow-hidden group"
        >
          {/* Subtle top highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <p className="text-xs font-medium text-text-dim uppercase tracking-wider truncate">
            {kpi.label}
          </p>
          <p className={`font-mono-value text-xl font-medium mt-2 ${kpi.color} ${kpi.glow}`}>
            {kpi.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
