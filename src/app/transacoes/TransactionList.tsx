"use client";

import { useRef } from "react";
import Checkbox from "@/components/ui/Checkbox";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { formatCurrency } from "@/lib/formatters";
import { dayLabel, type DayGroup } from "@/lib/transactionList";
import { getInstallmentInfo } from "@/lib/installments";
import type { SerializedTransaction } from "@/lib/types";

interface TransactionListProps {
  days: DayGroup<SerializedTransaction>[];
  emptyMessage: string;
  selecting: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (t: SerializedTransaction) => void;
  onDelete: (t: SerializedTransaction) => void;
  /** Segurar uma transação (celular): entra no modo de seleção com ela marcada */
  onLongPress: (t: SerializedTransaction) => void;
}

/** Tempo segurando o dedo para entrar no modo de seleção */
const LONG_PRESS_MS = 450;

function Amount({ t, className = "" }: { t: SerializedTransaction; className?: string }) {
  const income = t.type === "receita";
  return (
    <span className={`font-mono-value whitespace-nowrap ${income ? "text-emerald" : "text-fg"} ${className}`}>
      {income ? "+" : "−"}
      {formatCurrency(Number(t.amount))}
    </span>
  );
}

/** Descrição; parcela aparece como selo "3/10" em vez de "(3/10)". */
function Title({ t }: { t: SerializedTransaction }) {
  const installment = getInstallmentInfo(t);
  return (
    <p className="text-sm font-medium text-fg truncate">
      {installment ? installment.baseName : t.description}
      {installment && (
        <span className="ml-2 inline-flex align-middle px-1.5 py-px rounded-md bg-fg/[0.07] font-mono-value text-[10px] font-normal text-text-dim">
          {installment.current}/{installment.total}
        </span>
      )}
    </p>
  );
}

const iconButton =
  "w-8 h-8 rounded-lg flex items-center justify-center text-text-muted transition-colors cursor-pointer";

/**
 * Lista de transações em cartões por dia (a mesma no computador e no
 * celular). Tocar numa linha abre a edição; no modo de seleção, marca. No
 * computador, editar e excluir aparecem ao passar o mouse.
 */
export default function TransactionList({
  days,
  emptyMessage,
  selecting,
  selectedIds,
  onToggle,
  onOpen,
  onDelete,
  onLongPress,
}: TransactionListProps) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  function startPress(t: SerializedTransaction, e: React.PointerEvent) {
    if (e.pointerType === "mouse" || selecting) return;
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      navigator.vibrate?.(10);
      onLongPress(t);
    }, LONG_PRESS_MS);
  }
  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }

  if (days.length === 0) {
    return (
      <div className="glass-card px-5 py-14 flex flex-col items-center gap-2 text-center">
        <span className="w-10 h-10 rounded-full bg-fg/5 flex items-center justify-center text-text-muted" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </span>
        <p className="text-sm text-text-dim">{emptyMessage}</p>
      </div>
    );
  }

  // Um cartão só; cada dia abre com uma faixa (nome do dia e o total dele)
  return (
    <div className="glass-card overflow-hidden">
      {days.map((day) => (
        <section key={day.key} aria-label={dayLabel(day.date)} className="border-t border-fg/[0.06] first:border-t-0">
          <header className="flex items-baseline justify-between gap-3 px-4 sm:px-5 py-2 bg-fg/[0.025]">
            <h2 className="text-xs font-semibold text-text-dim first-letter:uppercase">{dayLabel(day.date)}</h2>
            <span className={`font-mono-value text-xs ${day.total < 0 ? "text-text-dim" : "text-emerald"}`}>
              {day.total < 0 ? "−" : "+"}
              {formatCurrency(Math.abs(day.total))}
            </span>
          </header>
          <ul className="divide-y divide-fg/[0.06]">
            {day.items.map((t) => {
              const selected = selectedIds.has(t.id);
              return (
                <li
                  key={t.id}
                  className={`group relative flex items-center gap-3 px-4 sm:px-5 py-3 transition-colors ${
                    selected ? "bg-blue/[0.07]" : "hover:bg-fg/[0.03]"
                  }`}
                >
                  {selecting && (
                    <Checkbox checked={selected} onChange={() => onToggle(t.id)} ariaLabel={`Selecionar ${t.description}`} />
                  )}
                  {/* A linha toda é o botão: abre a edição, ou marca no modo de seleção */}
                  <button
                    type="button"
                    onClick={() => {
                      if (longPressed.current) {
                        longPressed.current = false;
                        return;
                      }
                      if (selecting) onToggle(t.id);
                      else onOpen(t);
                    }}
                    onPointerDown={(e) => startPress(t, e)}
                    onPointerUp={cancelPress}
                    onPointerLeave={cancelPress}
                    onPointerCancel={cancelPress}
                    onContextMenu={(e) => {
                      if (longPressed.current) e.preventDefault();
                    }}
                    aria-label={selecting ? `Selecionar ${t.description}` : `Editar ${t.description}`}
                    className="absolute inset-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue [-webkit-touch-callout:none] select-none"
                  />
                  <span
                    className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 pointer-events-none"
                    style={{ backgroundColor: `${t.category.color}1f`, color: t.category.color }}
                    aria-hidden
                  >
                    <CategoryIcon name={t.category.name} size={16} />
                  </span>
                  <div className="relative min-w-0 flex-1 pointer-events-none">
                    <Title t={t} />
                    <p className="text-xs text-text-muted mt-0.5 truncate">
                      {t.category.name} · {t.account.name}
                    </p>
                  </div>
                  <Amount t={t} className="relative text-sm pointer-events-none" />
                  {/* Computador: ações ao passar o mouse (ou com foco do teclado) */}
                  {!selecting && (
                    <div className="relative hidden md:flex items-center gap-0.5 -mr-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                      <button type="button" onClick={() => onOpen(t)} className={`${iconButton} hover:text-fg hover:bg-fg/10`} title="Editar" aria-label={`Editar ${t.description}`}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                        </svg>
                      </button>
                      <button type="button" onClick={() => onDelete(t)} className={`${iconButton} hover:text-coral hover:bg-coral/10`} title="Excluir" aria-label={`Excluir ${t.description}`}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
