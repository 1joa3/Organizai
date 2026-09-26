"use client";

import { motion } from "framer-motion";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { formatCurrency, formatDateShort } from "@/lib/formatters";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
  category: { name: string; color: string; icon: string | null };
  account: { name: string };
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export default function RecentTransactions({
  transactions,
}: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted text-sm border border-dashed border-white/10 rounded-lg">
        Nenhuma transação recente
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((t, i) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 + i * 0.08, ease: "easeOut" }}
          className="group flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.06] border border-transparent hover:border-white/10 rounded-xl transition-all duration-300"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-inner shrink-0"
              style={{
                backgroundColor: `${t.category.color}15`,
                border: `1px solid ${t.category.color}40`,
                color: t.category.color,
                filter: `drop-shadow(0 0 4px ${t.category.color}80)`,
              }}
            >
              <CategoryIcon name={t.category.name} size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{t.description}</p>
              <p className="text-xs text-text-dim mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.category.color, boxShadow: `0 0 5px ${t.category.color}` }} />
                  {t.category.name}
                </span>
                <span className="text-white/20">•</span>
                <span>{t.account.name}</span>
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 ml-4">
            <p
              className={`font-mono-value text-base font-medium ${
                t.type === "receita" ? "text-emerald drop-shadow-[0_0_8px_rgba(204,255,0,0.3)]" : "text-coral drop-shadow-[0_0_8px_rgba(255,0,85,0.3)]"
              }`}
            >
              {t.type === "receita" ? "+" : "−"}{formatCurrency(t.amount)}
            </p>
            <p className="text-xs text-text-muted font-mono-value mt-0.5">
              {formatDateShort(t.date)}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
