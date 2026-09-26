"use client";

import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/formatters";

interface HeroSaldoProps {
  saldo: number;
  receitas: number;
  despesas: number;
}

export default function HeroSaldo({ saldo, receitas, despesas }: HeroSaldoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden glass-card p-8 h-full flex flex-col justify-between group"
    >
      {/* Background Glow */}
      <div className="absolute -inset-24 bg-gradient-to-r from-blue/20 via-emerald/10 to-transparent blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none" />

      <div className="relative z-10">
        <p className="text-sm font-medium text-text-dim uppercase tracking-wider mb-2">
          Saldo Atual
        </p>
        <p
          className={`font-mono-value text-3xl sm:text-4xl md:text-5xl font-light tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] ${
            saldo >= 0 ? "text-white" : "text-coral"
          }`}
        >
          {formatCurrency(saldo)}
        </p>
      </div>

      <div className="relative z-10 flex gap-10 mt-8 pt-6 border-t border-white/10">
        <div>
          <p className="text-xs font-medium text-text-dim uppercase tracking-wider mb-1">Receitas</p>
          <p className="font-mono-value text-lg text-emerald drop-shadow-[0_0_8px_rgba(204,255,0,0.3)]">
            +{formatCurrency(receitas)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-text-dim uppercase tracking-wider mb-1">Despesas</p>
          <p className="font-mono-value text-lg text-coral drop-shadow-[0_0_8px_rgba(255,0,85,0.3)]">
            −{formatCurrency(despesas)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
