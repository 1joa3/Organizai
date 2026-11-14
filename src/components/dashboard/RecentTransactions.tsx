"use client";

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

/**
 * Últimas transações em lista simples, separadas por uma linha fina:
 * despesa na cor do texto, receita em verde com "+". O vermelho fica para
 * o que é alerta de verdade (estouro, saldo negativo).
 */
export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 text-text-muted text-sm">
        Nenhuma transação neste período
      </div>
    );
  }

  return (
    <ul className="divide-y divide-fg/[0.06]">
      {transactions.map((t) => {
        const income = t.type === "receita";
        return (
          <li key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${t.category.color}1f`, color: t.category.color }}
              aria-hidden
            >
              <CategoryIcon name={t.category.name} size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg truncate">{t.description}</p>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                {t.category.name}
                {/* No celular a conta sai para sobrar espaço para a descrição */}
                <span className="hidden sm:inline"> · {t.account.name}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className={`font-mono-value text-sm whitespace-nowrap ${income ? "text-emerald" : "text-fg"}`}>
                {income ? "+" : "−"}
                {formatCurrency(t.amount)}
              </p>
              <p className="text-xs text-text-muted mt-0.5">{formatDateShort(t.date)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
