"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import SegmentedTabs from "@/components/ui/SegmentedTabs";
import Checkbox from "@/components/ui/Checkbox";
import GlideSelect from "@/components/reactbits/GlideSelect";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import PageTitle from "@/components/ui/PageTitle";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import PeriodSelector from "@/components/ui/PeriodSelector";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { deleteTransaction, deleteTransactionGroup, deleteTransactions, updateTransactionsCategory } from "./actions";
import { groupByDay, matchesSearch, summarizeTransactions } from "@/lib/transactionList";
import { exportTransactionsToCSV } from "@/lib/csv";
import { getInstallmentInfo } from "@/lib/installments";
import type { SerializedTransaction } from "@/lib/types";
import type { Account, Category } from "@prisma/client";
import ImportModal from "./ImportModal";
import TransactionForm from "./TransactionForm";
import TransactionList from "./TransactionList";

type BaseProps = {
  transactions: SerializedTransaction[];
  accounts: Account[];
  categories: Category[];
  period: string;
};

type TypeFilter = "" | "despesa" | "receita";

/** Gatilho das listas de filtro, com a cara dos outros controles da barra */
const filterTrigger =
  "h-[46px] px-3.5 text-sm bg-fg/5 text-fg border border-fg/10 rounded-lg hover:border-fg/20 aria-expanded:border-blue focus-visible:border-blue";

export default function TransactionsClient({ transactions, accounts, categories, period }: BaseProps) {
  const toast = useToast();
  const [, startTransition] = useTransition();

  // Janela de nova/editar transação
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SerializedTransaction | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SerializedTransaction | null>(null);

  // Filtros
  const [filterType, setFilterType] = useState<TypeFilter>("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [search, setSearch] = useState("");

  // Modo de seleção (ações em lote)
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(t: SerializedTransaction) {
    setEditing(t);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
  }

  // "Nova transação" do menu (ou o "+" do celular) chega como ?nova=1: abre
  // a janela e tira o parâmetro da URL, para não reabrir ao recarregar
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const wantsNew = searchParams.get("nova") === "1";
  const [handledNew, setHandledNew] = useState(false);
  // Ajuste durante a renderização (padrão do React para reagir a uma mudança
  // de entrada), em vez de setState dentro de um efeito
  if (wantsNew && !handledNew) {
    setHandledNew(true);
    setEditing(null);
    setFormOpen(true);
  } else if (!wantsNew && handledNew) {
    setHandledNew(false);
  }
  useEffect(() => {
    if (!wantsNew) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("nova");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsNew]);

  // ── Exclusão de uma transação ──
  function runDelete(action: () => Promise<{ error?: string; count?: number }>, successMessage: (count: number) => string) {
    setDeleteTarget(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result?.error) toast.error("Não foi possível excluir", result.error);
        else toast.success("Transação excluída", successMessage(result?.count ?? 1));
      } catch (error) {
        console.error("Failed to delete transaction:", error);
        toast.error("Não foi possível excluir", "Confira sua conexão e tente de novo.");
      }
    });
  }

  function requestDelete(t: SerializedTransaction) {
    setFormOpen(false);
    setDeleteTarget(t);
  }

  // ── Filtros ──
  const categoryOptions = categories.filter((c) => !filterType || c.type === filterType);
  const filtered = transactions.filter((t) => {
    if (filterType && t.type !== filterType) return false;
    if (filterCategory && t.categoryId !== filterCategory) return false;
    if (filterAccount && t.accountId !== filterAccount) return false;
    return matchesSearch(t, search);
  });
  const isFiltering = filterType !== "" || filterCategory !== "" || filterAccount !== "" || search.trim() !== "";
  const summary = summarizeTransactions(filtered);
  const days = groupByDay(filtered);

  function changeFilters(fn: () => void) {
    fn();
    clearSelection();
  }

  function clearFilters() {
    changeFilters(() => {
      setFilterType("");
      setFilterCategory("");
      setFilterAccount("");
      setSearch("");
    });
  }

  // ── Seleção ──
  const selectedTransactions = filtered.filter((t) => selectedIds.has(t.id));
  const selectedTypes = new Set(selectedTransactions.map((t) => t.type));
  const canBulkRecategorize = selectedTypes.size === 1;
  const bulkCategoryOptions = categories.filter((c) => (canBulkRecategorize ? c.type === [...selectedTypes][0] : false));
  const allSelected = filtered.length > 0 && selectedTransactions.length === filtered.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(filtered.map((t) => t.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setBulkCategoryId("");
  }

  function exitSelecting() {
    clearSelection();
    setSelecting(false);
  }

  function handleBulkDeleteConfirm() {
    setIsBulkDeleteOpen(false);
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      try {
        const result = await deleteTransactions(ids);
        if (result?.error) {
          toast.error("Não foi possível excluir", result.error);
        } else {
          toast.success("Transações excluídas", `${result.count} transações foram removidas.`);
          exitSelecting();
        }
      } catch {
        toast.error("Não foi possível excluir", "Confira sua conexão e tente de novo.");
      }
    });
  }

  function handleBulkRecategorize() {
    if (!bulkCategoryId) return;
    const ids = Array.from(selectedIds);
    setIsBulkActionLoading(true);
    startTransition(async () => {
      try {
        const result = await updateTransactionsCategory(ids, bulkCategoryId);
        if (result?.error) {
          toast.error("Não foi possível mudar a categoria", result.error);
        } else {
          toast.success("Categoria atualizada", `${result.count} transações foram reclassificadas.`);
          exitSelecting();
        }
      } catch {
        toast.error("Não foi possível mudar a categoria", "Confira sua conexão e tente de novo.");
      } finally {
        setIsBulkActionLoading(false);
      }
    });
  }

  const deleteInstallment = deleteTarget ? getInstallmentInfo(deleteTarget) : null;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <PageTitle text="Transações" />
          <p className="text-sm text-text-dim mt-1">Gerencie suas receitas e despesas</p>
        </div>
        {/* No celular, o "+" da barra de baixo faz o mesmo */}
        <div className="hidden md:block">
          <Button onClick={openCreate}>Nova transação</Button>
        </div>
      </div>

      {/* Período, busca, importar e exportar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex gap-2 sm:gap-3 items-center lg:contents">
          <div className="flex-1 min-w-0 lg:flex-none lg:order-1">
            <PeriodSelector period={period} />
          </div>
          <div className="lg:order-3 shrink-0">
            <ToolbarButton label="Importar fatura" onClick={() => setIsImportModalOpen(true)}>
              <path d="M12 3v12M7 10l5 5 5-5" />
              <path d="M5 21h14" />
            </ToolbarButton>
          </div>
          <div className="lg:order-4 shrink-0">
            <ToolbarButton label="Exportar CSV" onClick={() => exportTransactionsToCSV(filtered)}>
              <path d="M12 15V3M7 8l5-5 5 5" />
              <path d="M5 21h14" />
            </ToolbarButton>
          </div>
        </div>
        <label className="relative flex-1 min-w-0 lg:order-2">
          <span className="sr-only">Buscar transações</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => changeFilters(() => setSearch(e.target.value))}
            placeholder="Buscar descrição, categoria ou conta"
            className="w-full h-[46px] pl-10 pr-3 text-sm bg-fg/5 text-fg placeholder:text-text-muted border border-fg/10 rounded-lg hover:border-fg/20 focus:border-blue focus:outline-none focus:ring-4 focus:ring-blue/10 transition-all"
          />
        </label>
      </div>

      {/* Filtros: tipo, categoria e conta */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SegmentedTabs
          ariaLabel="Tipo"
          value={filterType || "todas"}
          onChange={(v) =>
            changeFilters(() => {
              const next = v === "todas" ? "" : (v as TypeFilter);
              setFilterType(next);
              // Categoria de outro tipo deixa de fazer sentido
              const cat = categories.find((c) => c.id === filterCategory);
              if (next && cat && cat.type !== next) setFilterCategory("");
            })
          }
          full
          className="sm:w-auto! sm:inline-flex!"
          tabClassName="text-sm font-medium h-9! sm:px-4!"
          options={[
            { value: "todas", label: "Todas" },
            { value: "despesa", label: "Despesas" },
            { value: "receita", label: "Receitas" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-1">
          <GlideSelect
            ariaLabel="Filtrar por categoria"
            value={filterCategory}
            onChange={(v) => changeFilters(() => setFilterCategory(v))}
            options={[{ value: "", label: "Todas as categorias" }, ...categoryOptions.map((c) => ({ value: c.id, label: c.name }))]}
            menuWidth={220}
            className="min-w-0 sm:w-52"
            triggerClassName={`${filterTrigger} ${filterCategory ? "border-blue/50!" : ""}`}
          />
          <GlideSelect
            ariaLabel="Filtrar por conta"
            value={filterAccount}
            onChange={(v) => changeFilters(() => setFilterAccount(v))}
            options={[{ value: "", label: "Todas as contas" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
            menuWidth={200}
            className="min-w-0 sm:w-48"
            triggerClassName={`${filterTrigger} ${filterAccount ? "border-blue/50!" : ""}`}
          />
        </div>
        {isFiltering && (
          <button
            type="button"
            onClick={clearFilters}
            className="self-start sm:self-auto h-9 px-3 rounded-lg text-sm text-blue hover:bg-blue/10 transition-colors cursor-pointer whitespace-nowrap"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Resumo numa faixa só. No celular, o saldo vai em cima, na largura
          toda, e entradas e saídas dividem a linha de baixo */}
      <dl className="glass-card grid grid-cols-2 sm:grid-cols-3">
        {([
          ["Entradas", summary.receitas, "text-emerald", "border-r border-t sm:border-t-0"],
          ["Saídas", summary.despesas, "text-fg", "border-t sm:border-t-0 sm:border-r"],
          ["Saldo", summary.saldo, summary.saldo < 0 ? "text-coral" : "text-fg", "col-span-2 sm:col-span-1 order-first sm:order-none"],
        ] as const).map(([label, value, color, place]) => (
          <div key={label} className={`px-4 sm:px-5 py-3 sm:py-4 min-w-0 border-fg/[0.08] ${place}`}>
            <dt className="text-xs text-text-dim truncate">
              {label}
              {isFiltering && <span className="text-text-muted"> · filtrado</span>}
            </dt>
            <dd className={`font-mono-value mt-1 truncate ${label === "Saldo" ? "text-xl" : "text-base"} sm:text-xl ${color}`}>
              {label === "Saldo" && value < 0 ? "−" : ""}
              <AnimatedNumber value={Math.abs(value)} duration={0.9} />
            </dd>
          </div>
        ))}
      </dl>

      {/* Linha da lista: quantas e o modo de seleção */}
      <div className="flex items-center justify-between gap-3 -mb-1 sm:-mb-2">
        <p className="text-sm text-text-dim">
          {filtered.length} {filtered.length === 1 ? "transação" : "transações"}
        </p>
        {filtered.length > 0 && (
          <button
            type="button"
            onClick={() => (selecting ? exitSelecting() : setSelecting(true))}
            aria-pressed={selecting}
            className="h-9 px-3 rounded-lg text-sm font-medium text-blue hover:bg-blue/10 transition-colors cursor-pointer"
          >
            {selecting ? "Cancelar seleção" : "Selecionar"}
          </button>
        )}
      </div>

      {/* Barra das ações em lote: presa no topo enquanto seleciona */}
      <AnimatePresence>
        {selecting && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            className="sticky top-2 z-30 flex flex-wrap items-center gap-2 sm:gap-3 p-3 rounded-xl bg-panel border border-blue/25 shadow-[0_12px_32px_-12px_var(--shadow)]"
          >
            <div className="flex items-center gap-3 px-1">
              <Checkbox checked={allSelected} onChange={toggleSelectAll} ariaLabel="Selecionar todas" />
              <span className="text-sm text-fg font-medium">
                {selectedIds.size === 0
                  ? "Toque nas transações"
                  : `${selectedIds.size} selecionada${selectedIds.size > 1 ? "s" : ""}`}
              </span>
            </div>

            {selectedIds.size > 0 && (
              <>
                <div className="flex-1 basis-full sm:basis-auto flex items-center gap-2 min-w-0">
                  {canBulkRecategorize ? (
                    <>
                      <GlideSelect
                        size="sm"
                        ariaLabel="Nova categoria"
                        placeholder="Mudar categoria para..."
                        value={bulkCategoryId}
                        onChange={setBulkCategoryId}
                        options={bulkCategoryOptions.map((c) => ({ value: c.id, label: c.name }))}
                        menuWidth={200}
                        className="flex-1 sm:flex-none sm:w-52 min-w-0"
                        triggerClassName="bg-fg/5 border border-fg/10 rounded-lg px-2.5 py-1.5 text-xs text-fg hover:border-fg/20 aria-expanded:border-blue focus-visible:border-blue"
                      />
                      <Button variant="glass" size="sm" disabled={!bulkCategoryId} loading={isBulkActionLoading} onClick={handleBulkRecategorize}>
                        Aplicar
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-text-muted">
                      Para mudar a categoria, selecione só despesas ou só receitas
                    </span>
                  )}
                </div>
                <Button variant="danger" size="sm" onClick={() => setIsBulkDeleteOpen(true)}>
                  Excluir
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <TransactionList
        days={days}
        emptyMessage={isFiltering ? "Nenhuma transação com esses filtros" : "Nenhuma transação neste período"}
        selecting={selecting}
        selectedIds={selectedIds}
        onToggle={toggleSelect}
        onOpen={openEdit}
        onDelete={requestDelete}
        onLongPress={(t) => {
          setSelecting(true);
          setSelectedIds(new Set([t.id]));
        }}
      />

      {/* Janela de nova/editar transação */}
      <Modal isOpen={formOpen} onClose={closeForm} title={editing ? "Editar transação" : "Nova transação"}>
        <TransactionForm
          key={editing?.id ?? "new"}
          editing={editing}
          accounts={accounts}
          categories={categories}
          onDone={closeForm}
          onDelete={requestDelete}
        />
      </Modal>

      {/* Confirmação de exclusão */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onConfirm={() => deleteTarget && runDelete(() => deleteTransaction(deleteTarget.id), () => "O registro foi removido.")}
        onCancel={() => setDeleteTarget(null)}
        onExtra={
          deleteInstallment
            ? () => deleteTarget && runDelete(() => deleteTransactionGroup(deleteTarget.id), (count) => `${count} parcelas foram removidas.`)
            : undefined
        }
        extraLabel={deleteInstallment ? "Excluir a compra inteira" : undefined}
        title="Excluir transação"
        message={
          deleteInstallment
            ? `Esta é a parcela ${deleteInstallment.current}/${deleteInstallment.total} de "${deleteInstallment.baseName}". Excluir só esta parcela, ou a compra inteira?`
            : "Esta ação não pode ser desfeita. Deseja excluir esta transação?"
        }
        confirmLabel={deleteInstallment ? "Excluir só esta" : "Excluir"}
        cancelLabel="Cancelar"
        variant="danger"
      />

      {/* Confirmação de exclusão em lote */}
      <ConfirmDialog
        isOpen={isBulkDeleteOpen}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setIsBulkDeleteOpen(false)}
        title="Excluir transações selecionadas"
        message={`Esta ação não pode ser desfeita. Deseja excluir ${selectedIds.size} ${selectedIds.size === 1 ? "transação" : "transações"}?`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
      />

      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} accounts={accounts} categories={categories} />
    </div>
  );
}

/** Botão da barra: só ícone no celular, ícone e texto em telas largas. */
function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="h-[46px] shrink-0 inline-flex items-center justify-center gap-2 px-3 sm:px-4 rounded-lg glass-panel text-text-dim hover:text-fg hover:border-fg/20 hover:bg-fg/10 transition-colors cursor-pointer"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
      <span className="hidden xl:inline text-xs font-medium whitespace-nowrap">{label}</span>
    </button>
  );
}
