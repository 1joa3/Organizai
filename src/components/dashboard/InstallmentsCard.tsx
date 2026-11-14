"use client";

import { motion } from "framer-motion";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { formatCurrency } from "@/lib/formatters";

export interface InstallmentItem {
  name: string;
  /** Nome da categoria (para o ícone) */
  category: string;
  color: string;
  /** Valor das parcelas desta compra no período (nesta fatura) */
  total: number;
  /** Número da parcela atual (a deste período) */
  currentInstallment: number;
  totalInstallments: number;
  /** Já pago, contando a parcela atual */
  currentAmount: number;
  targetAmount: number;
}

/** Acima disso a barra vira contínua: os segmentos ficariam finos demais */
const MAX_SEGMENTS = 24;

/**
 * Barra de parcelas: um segmento por parcela, os pagos preenchidos na cor
 * da categoria. Dá para contar quantas faltam só de olhar.
 */
function InstallmentBar({ paid, total, color }: { paid: number; total: number; color: string }) {
  if (total > MAX_SEGMENTS) {
    return (
      <div className="h-1.5 w-full rounded-full bg-fg/[0.08] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${(paid / total) * 100}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        />
      </div>
    );
  }
  return (
    <div className="flex gap-[3px]" role="presentation">
      {Array.from({ length: total }, (_, i) => (
        <motion.span
          key={i}
          className="h-1.5 flex-1 rounded-full"
          initial={{ backgroundColor: "color-mix(in srgb, var(--fg) 8%, transparent)" }}
          animate={{ backgroundColor: i < paid ? color : "color-mix(in srgb, var(--fg) 8%, transparent)" }}
          transition={{ duration: 0.3, delay: 0.1 + i * 0.03 }}
        />
      ))}
    </div>
  );
}

/**
 * Bloco do Dashboard: as compras parceladas com parcela neste período.
 * Em cima, quanto entra nesta fatura e quanto ainda falta pagar no total;
 * cada compra mostra a parcela do mês, quantas já foram e quanto falta. As
 * que terminam primeiro vêm antes.
 */
export default function InstallmentsCard({ items }: { items: InstallmentItem[] }) {
  const thisPeriod = items.reduce((sum, i) => sum + i.total, 0);
  const remaining = items.reduce((sum, i) => sum + Math.max(0, i.targetAmount - i.currentAmount), 0);
  const sorted = [...items].sort(
    (a, b) => a.totalInstallments - a.currentInstallment - (b.totalInstallments - b.currentInstallment) || b.total - a.total
  );

  return (
    <div className="relative h-full glass-card p-6 flex flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg text-fg">Despesas parceladas</h2>
        {items.length > 0 && (
          <span className="text-xs text-text-muted whitespace-nowrap">
            {items.length} {items.length === 1 ? "compra" : "compras"}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
          <span className="w-10 h-10 rounded-full bg-fg/5 flex items-center justify-center text-text-muted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </span>
          <p className="text-sm text-text-dim">Nenhuma compra parcelada neste período</p>
        </div>
      ) : (
        <>
          {/* Resumo: o que vem na fatura e o que ainda falta */}
          <div className="mt-4 mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-fg/[0.04] px-3.5 py-3">
              <p className="text-xs text-text-dim">Nesta fatura</p>
              <p className="font-mono-value text-base text-fg mt-0.5">{formatCurrency(thisPeriod)}</p>
            </div>
            <div className="rounded-xl bg-fg/[0.04] px-3.5 py-3">
              <p className="text-xs text-text-dim">Ainda a pagar</p>
              <p className="font-mono-value text-base text-fg mt-0.5">{formatCurrency(remaining)}</p>
            </div>
          </div>

          <ul className="space-y-4">
            {sorted.map((item) => {
              const left = item.totalInstallments - item.currentInstallment;
              const owed = Math.max(0, item.targetAmount - item.currentAmount);
              return (
                <li key={`${item.name}-${item.totalInstallments}`} className="flex gap-3">
                  <span
                    className="mt-0.5 w-9 h-9 shrink-0 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}1f`, color: item.color }}
                    aria-hidden
                  >
                    <CategoryIcon name={item.category} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-fg truncate">{item.name}</p>
                      <p className="font-mono-value text-sm text-fg whitespace-nowrap">{formatCurrency(item.total)}</p>
                    </div>
                    <div className="mt-2">
                      <InstallmentBar paid={item.currentInstallment} total={item.totalInstallments} color={item.color} />
                    </div>
                    <p className="mt-1.5 flex items-center justify-between gap-2 text-xs text-text-muted">
                      <span>
                        {item.currentInstallment} de {item.totalInstallments} pagas
                      </span>
                      {left === 0 ? (
                        <span className="px-1.5 py-px rounded-md bg-emerald/10 text-emerald font-medium">Última parcela</span>
                      ) : (
                        <span className="whitespace-nowrap">
                          faltam {left} · {formatCurrency(owed)}
                        </span>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
