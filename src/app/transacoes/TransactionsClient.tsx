"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import MoneyInput from "@/components/ui/MoneyInput";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import PeriodSelector from "@/components/ui/PeriodSelector";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { useToast } from "@/components/ui/Toast";
import { createTransaction, updateTransaction, deleteTransaction, deleteTransactionGroup, createCategory, createAccount, deleteTransactions, updateTransactionsCategory } from "./actions";
import { formatCurrency, formatDayMonth, formatDateInput } from "@/lib/formatters";
import { dayLabel, groupByDay, matchesSearch, summarizeTransactions } from "@/lib/transactionList";
import { exportTransactionsToCSV } from "@/lib/csv";
import { getInstallmentInfo } from "@/lib/installments";
import type { SerializedTransaction } from "@/lib/types";
import type { Account, Category } from "@prisma/client";
import ImportModal from "./ImportModal";

type BaseProps = {
  transactions: SerializedTransaction[];
  accounts: Account[];
  categories: Category[];
  period: string;
};

export default function TransactionsClient({
  transactions,
  accounts,
  categories,
  period,
}: BaseProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState("despesa");
  const [editingTransaction, setEditingTransaction] = useState<SerializedTransaction | null>(null);
  const [, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<SerializedTransaction | null>(null);
  const toast = useToast();

  // Filtros
  const [filterType, setFilterType] = useState<string>("");
  const [search, setSearch] = useState("");

  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  // Nova categoria (inline, dentro do modal de transação)
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#00E5FF");

  function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;

    setIsCategoryLoading(true);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("type", selectedType);
    formData.set("color", newCategoryColor);

    startTransition(async () => {
      try {
        const result = await createCategory(formData);
        if (result?.error) {
          toast.error("Erro ao criar categoria", result.error);
        } else {
          toast.success("Categoria criada", `"${name}" já está disponível na lista.`);
          setIsAddingCategory(false);
          setNewCategoryName("");
          setNewCategoryColor("#00E5FF");
        }
      } catch {
        toast.error("Erro ao criar categoria", "Tente novamente.");
      } finally {
        setIsCategoryLoading(false);
      }
    });
  }

  // Nova conta (inline, dentro do modal de transação)
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("corrente");

  function cancelNewAccount() {
    setIsAddingAccount(false);
    setNewAccountName("");
    setNewAccountType("corrente");
  }

  function handleCreateAccount() {
    const name = newAccountName.trim();
    if (!name) return;

    setIsAccountLoading(true);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("type", newAccountType);

    startTransition(async () => {
      try {
        const result = await createAccount(formData);
        if (result?.error) {
          toast.error("Erro ao criar conta", result.error);
        } else {
          toast.success("Conta criada", `"${name}" já está disponível na lista.`);
          cancelNewAccount();
        }
      } catch {
        toast.error("Erro ao criar conta", "Tente novamente.");
      } finally {
        setIsAccountLoading(false);
      }
    });
  }

  function openCreateModal() {
    setEditingTransaction(null);
    setSelectedType("despesa");
    setIsModalOpen(true);
  }

  function openEditModal(t: SerializedTransaction) {
    setEditingTransaction(t);
    setSelectedType(t.type);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingTransaction(null);
    setIsAddingCategory(false);
    setNewCategoryName("");
    cancelNewAccount();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isAddingCategory) {
      toast.warning("Categoria pendente", "Salve ou cancele a nova categoria antes de continuar.");
      return;
    }
    if (isAddingAccount) {
      toast.warning("Conta pendente", "Salve ou cancele a nova conta antes de continuar.");
      return;
    }
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        if (editingTransaction) {
          const result = await updateTransaction(editingTransaction.id, formData);
          if (result?.error) {
            toast.error("Erro ao salvar", result.error);
          } else {
            toast.success("Transação atualizada", "As alterações foram salvas.");
          }
        } else {
          await createTransaction(formData);
          toast.success("Transação criada", "A transação foi registrada com sucesso.");
        }
      } catch {
        toast.error("Erro ao salvar", "Não foi possível salvar a transação.");
      } finally {
        setIsLoading(false);
        closeModal();
      }
    });
  }

  function handleDeleteClick(t: SerializedTransaction) {
    setDeleteTarget(t);
  }

  function runDelete(action: () => Promise<{ error?: string; count?: number }>, successMessage: (count: number) => string) {
    setDeleteTarget(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result?.error) {
          toast.error("Erro ao excluir", result.error);
        } else {
          toast.success("Transação excluída", successMessage(result?.count ?? 1));
        }
      } catch (error) {
        console.error("Failed to delete transaction:", error);
        toast.error("Erro inesperado", "Ocorreu um erro ao excluir a transação.");
      }
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    runDelete(
      () => deleteTransaction(deleteTarget.id),
      () => "O registro foi removido com sucesso."
    );
  }

  function handleDeleteGroupConfirm() {
    if (!deleteTarget) return;
    runDelete(
      () => deleteTransactionGroup(deleteTarget.id),
      (count) => `${count} parcelas foram removidas.`
    );
  }

  function handleDeleteCancel() {
    setDeleteTarget(null);
  }

  const filtered = transactions.filter((t) => {
    if (filterType && t.type !== filterType) return false;
    return matchesSearch(t, search);
  });
  const isFiltering = filterType !== "" || search.trim() !== "";
  const summary = summarizeTransactions(filtered);
  const days = groupByDay(filtered);

  const selectedTransactions = filtered.filter((t) => selectedIds.has(t.id));
  const selectedTypes = new Set(selectedTransactions.map((t) => t.type));
  const canBulkRecategorize = selectedTypes.size === 1;
  const bulkCategoryOptions = categories.filter((c) =>
    canBulkRecategorize ? c.type === [...selectedTypes][0] : false
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((t) => t.id))
    );
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setBulkCategoryId("");
  }

  function handleBulkDeleteConfirm() {
    setIsBulkDeleteOpen(false);
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      try {
        const result = await deleteTransactions(ids);
        if (result?.error) {
          toast.error("Erro ao excluir", result.error);
        } else {
          toast.success("Transações excluídas", `${result.count} transações foram removidas.`);
          clearSelection();
        }
      } catch {
        toast.error("Erro inesperado", "Ocorreu um erro ao excluir as transações.");
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
          toast.error("Erro ao atualizar", result.error);
        } else {
          toast.success("Categoria atualizada", `${result.count} transações foram reclassificadas.`);
          clearSelection();
        }
      } catch {
        toast.error("Erro inesperado", "Ocorreu um erro ao atualizar a categoria.");
      } finally {
        setIsBulkActionLoading(false);
      }
    });
  }

  const columns = [
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          checked={filtered.length > 0 && selectedIds.size === filtered.length}
          onChange={toggleSelectAll}
          className="w-4 h-4 accent-blue cursor-pointer"
          aria-label="Selecionar todas"
        />
      ),
      className: "w-10",
      render: (t: SerializedTransaction) => (
        <input
          type="checkbox"
          checked={selectedIds.has(t.id)}
          onChange={() => toggleSelect(t.id)}
          className="w-4 h-4 accent-blue cursor-pointer"
          aria-label="Selecionar transação"
        />
      ),
    },
    {
      key: "date",
      label: "Data",
      sortable: true,
      render: (t: SerializedTransaction) => (
        <span className="font-mono-value text-text-dim whitespace-nowrap">{formatDayMonth(t.date)}</span>
      ),
    },
    {
      key: "description",
      label: "Descrição",
      sortable: true,
      render: (t: SerializedTransaction) => <TransactionTitle t={t} />,
    },
    {
      key: "category",
      label: "Categoria",
      render: (t: SerializedTransaction) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${t.category.color}15`, color: t.category.color, border: `1px solid ${t.category.color}30` }}>
          <CategoryIcon name={t.category.name} size={12} />
          {t.category.name}
        </span>
      ),
    },
    {
      key: "account",
      label: "Conta",
      render: (t: SerializedTransaction) => <span className="text-text-muted">{t.account.name}</span>,
    },
    {
      key: "amount",
      label: "Valor",
      sortable: true,
      className: "text-right",
      render: (t: SerializedTransaction) => (
        <span
          className={`font-mono-value font-medium ${
            t.type === "receita" ? "text-emerald drop-shadow-[0_0_8px_rgba(204,255,0,0.3)]" : "text-coral drop-shadow-[0_0_8px_rgba(255,0,85,0.3)]"
          }`}
        >
          {t.type === "receita" ? "+" : "−"}
          {formatCurrency(Number(t.amount))}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-16 text-right",
      render: (t: SerializedTransaction) => (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => openEditModal(t)}
            className="text-text-dim hover:text-blue transition-colors"
            title="Editar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
            </svg>
          </button>
          <button
            onClick={() => handleDeleteClick(t)}
            className="text-text-dim hover:text-coral transition-colors"
            title="Excluir"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      ),
    },
  ];

  // No celular: lista em seções por dia. Tocar no cartão abre a edição
  // (excluir fica dentro dela); a caixinha seleciona para ações em lote.
  function renderMobileItem(t: SerializedTransaction) {
    const selected = selectedIds.has(t.id);
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => openEditModal(t)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openEditModal(t);
          }
        }}
        aria-label={`Editar ${t.description}`}
        className={`glass-panel p-3 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-[transform,border-color] ${
          selected ? "border-blue/40!" : ""
        }`}
      >
        <label
          onClick={(e) => e.stopPropagation()}
          className="-m-2 p-2 shrink-0 flex items-center cursor-pointer"
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => toggleSelect(t.id)}
            className="w-4 h-4 accent-blue cursor-pointer"
            aria-label={`Selecionar ${t.description}`}
          />
        </label>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shadow-inner shrink-0"
          style={{
            backgroundColor: `${t.category.color}15`,
            border: `1px solid ${t.category.color}40`,
            color: t.category.color,
          }}
        >
          <CategoryIcon name={t.category.name} size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <TransactionTitle t={t} className="text-sm line-clamp-2 break-words" />
          <p className="text-xs text-text-dim truncate mt-0.5">
            {t.category.name} <span className="text-fg/20">•</span> {t.account.name}
          </p>
        </div>
        <span
          className={`font-mono-value text-sm font-medium whitespace-nowrap shrink-0 ${
            t.type === "receita" ? "text-emerald" : "text-coral"
          }`}
        >
          {t.type === "receita" ? "+" : "−"}
          {formatCurrency(Number(t.amount))}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap justify-between items-center gap-4"
      >
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-fg tracking-tight">Transações</h1>
          <p className="text-sm text-text-dim mt-1">Gerencie suas receitas e despesas</p>
        </div>
        {/* No celular, o botão flutuante "+" faz o mesmo */}
        <div className="hidden md:block">
          <Button onClick={openCreateModal}>Nova Transação</Button>
        </div>
      </motion.div>

      {/* Filtros: período e tipo; busca, importar e exportar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col lg:flex-row lg:items-center gap-3"
      >
        {/* Celular: período + importar/exportar numa linha, busca + tipo na
            outra. Em telas largas as duas linhas viram uma só (lg:contents). */}
        <div className="flex gap-2 sm:gap-3 items-center lg:contents">
          <div className="flex-1 min-w-0 lg:flex-none lg:order-1">
            <PeriodSelector period={period} />
          </div>
          <div className="lg:order-4 shrink-0">
            <ToolbarButton label="Importar fatura" onClick={() => setIsImportModalOpen(true)}>
              <path d="M12 3v12M7 10l5 5 5-5" />
              <path d="M5 21h14" />
            </ToolbarButton>
          </div>
          <div className="lg:order-5 shrink-0">
            <ToolbarButton label="Exportar CSV" onClick={() => exportTransactionsToCSV(filtered)}>
              <path d="M12 15V3M7 8l5-5 5 5" />
              <path d="M5 21h14" />
            </ToolbarButton>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3 items-center lg:contents">
          <label className="relative flex-1 min-w-0 lg:order-3">
            <span className="sr-only">Buscar transações</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                clearSelection();
              }}
              placeholder="Buscar descrição, categoria ou conta"
              className="w-full h-[46px] pl-10 pr-3 text-sm bg-fg/5 text-fg placeholder:text-text-muted border border-fg/10 rounded-lg hover:border-fg/20 focus:border-blue focus:outline-none focus:ring-4 focus:ring-blue/10 transition-all shadow-inner"
            />
          </label>
          <div className="w-32 sm:w-44 shrink-0 lg:order-2">
            <Select
              aria-label="Tipo"
              options={[
                { value: "", label: "Todos" },
                { value: "receita", label: "Receitas" },
                { value: "despesa", label: "Despesas" },
              ]}
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                clearSelection();
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Resumo do que está na lista */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4"
      >
        {/* No celular o saldo vem primeiro, na largura toda */}
        {([
          ["Receitas", summary.receitas, "text-emerald", ""],
          ["Despesas", summary.despesas, "text-coral", ""],
          ["Saldo", summary.saldo, summary.saldo < 0 ? "text-coral" : "text-fg", "col-span-2 sm:col-span-1 order-first sm:order-none"],
        ] as const).map(([label, value, color, place]) => (
          <div key={label} className={`glass-panel px-4 py-3 sm:px-5 sm:py-4 min-w-0 ${place}`}>
            <p className="text-[10px] sm:text-xs font-medium text-text-dim uppercase tracking-wider truncate">
              {label}
              {isFiltering && <span className="hidden sm:inline normal-case tracking-normal text-text-muted"> · filtrado</span>}
            </p>
            <p className={`font-mono-value mt-1 truncate ${label === "Saldo" ? "text-xl" : "text-base"} sm:text-xl ${color}`}>
              {label === "Saldo" && value < 0 ? "−" : ""}
              {formatCurrency(Math.abs(value))}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Barra de ações em massa */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-2 z-30 flex flex-wrap items-center gap-2 sm:gap-3 p-3 glass-panel bg-panel! border border-blue/20 shadow-lg"
        >
          <span className="text-sm text-fg font-medium px-1 w-full sm:w-auto">
            {selectedIds.size} selecionada{selectedIds.size > 1 ? "s" : ""}
          </span>

          <div className="flex-1 basis-full sm:basis-auto flex items-center gap-2 min-w-0">
            {canBulkRecategorize ? (
              <>
                <select
                  value={bulkCategoryId}
                  onChange={(e) => setBulkCategoryId(e.target.value)}
                  className="flex-1 sm:flex-none min-w-0 bg-fg/5 border border-fg/10 rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-blue focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-option">Mudar categoria para...</option>
                  {bulkCategoryOptions.map((c) => (
                    <option key={c.id} value={c.id} className="bg-option">{c.name}</option>
                  ))}
                </select>
                <Button
                  variant="glass"
                  size="sm"
                  disabled={!bulkCategoryId}
                  loading={isBulkActionLoading}
                  onClick={handleBulkRecategorize}
                >
                  Aplicar
                </Button>
              </>
            ) : (
              <span className="text-xs text-text-muted">
                Selecione itens do mesmo tipo (despesa ou receita) para mudar a categoria em lote
              </span>
            )}
          </div>

          <Button variant="danger" size="sm" onClick={() => setIsBulkDeleteOpen(true)}>
            Excluir selecionadas
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Cancelar
          </Button>
        </motion.div>
      )}

      {/* Celular: seções por dia */}
      {/* pb: espaço para o botão flutuante não cobrir o último item */}
      <div className="md:hidden space-y-5 pb-16">
        {days.length === 0 ? (
          <div className="glass-panel px-5 py-12 text-center text-text-muted text-sm">
            {isFiltering ? "Nenhuma transação encontrada com esses filtros" : "Nenhuma transação neste período"}
          </div>
        ) : (
          days.map((day) => (
            <section key={day.key} aria-label={dayLabel(day.date)}>
              <div className="flex items-baseline justify-between px-1 mb-2">
                <h2 className="text-xs font-semibold text-text-dim uppercase tracking-wider">{dayLabel(day.date)}</h2>
                <span className={`font-mono-value text-xs ${day.total < 0 ? "text-coral/80" : "text-emerald/80"}`}>
                  {day.total < 0 ? "−" : "+"}
                  {formatCurrency(Math.abs(day.total))}
                </span>
              </div>
              <div className="space-y-2">
                {day.items.map((t) => (
                  <div key={t.id}>{renderMobileItem(t)}</div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Computador: tabela */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="hidden md:block"
      >
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(t) => t.id}
          emptyMessage={isFiltering ? "Nenhuma transação encontrada com esses filtros" : "Nenhuma transação neste período"}
        />
      </motion.div>

      {/* Celular: botão flutuante de nova transação, acima da barra inferior */}
      <button
        type="button"
        onClick={openCreateModal}
        aria-label="Nova transação"
        className="md:hidden fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 w-14 h-14 rounded-full bg-fg text-bg flex items-center justify-center shadow-[0_8px_30px_-6px_var(--shadow),0_0_20px_color-mix(in_srgb,var(--fg)_20%,transparent)] active:scale-95 transition-transform cursor-pointer"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {/* Modal Nova Transação */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`${editingTransaction ? "Editar" : "Nova"} ${selectedType === "receita" ? "Receita" : "Despesa"}`}
        eyebrow={editingTransaction ? "Editar transação" : "Transação"}
        accent={selectedType === "receita" ? "emerald" : "coral"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-medium text-text-dim uppercase tracking-wider mb-2 block">
              Tipo
            </label>
            <div className="flex gap-2 p-1 bg-fg/5 rounded-lg border border-fg/10">
              <button
                type="button"
                onClick={() => setSelectedType("despesa")}
                className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all cursor-pointer ${
                  selectedType === "despesa"
                    ? "bg-coral/15 text-coral border border-coral/30"
                    : "text-text-dim hover:text-fg border border-transparent"
                }`}
              >
                − Despesa
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("receita")}
                className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all cursor-pointer ${
                  selectedType === "receita"
                    ? "bg-emerald/15 text-emerald border border-emerald/30"
                    : "text-text-dim hover:text-fg border border-transparent"
                }`}
              >
                + Receita
              </button>
            </div>
            <input type="hidden" name="type" value={selectedType} />
          </div>

          <Input
            name="description"
            label="Descrição"
            required
            placeholder="Ex: Supermercado"
            defaultValue={editingTransaction?.description}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MoneyInput
              key={editingTransaction?.id ?? "new"}
              name="amount"
              label="Valor Total"
              required
              defaultValue={editingTransaction?.amount}
            />
            <Input
              name="date"
              label="Data"
              type="date"
              required
              defaultValue={editingTransaction ? formatDateInput(editingTransaction.date) : formatDateInput(new Date())}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-text-dim uppercase tracking-wider">
                  Conta
                </label>
                {!isAddingAccount && (
                  <button
                    type="button"
                    onClick={() => setIsAddingAccount(true)}
                    className="text-xs text-blue hover:text-fg transition-colors cursor-pointer"
                  >
                    + Nova
                  </button>
                )}
              </div>

              {isAddingAccount ? (
                <div className="p-3 bg-fg/5 border border-fg/10 rounded-lg space-y-3">
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="Nome da conta"
                      className="flex-1 min-w-0 px-3 py-2 text-sm bg-fg/5 text-fg border border-fg/10 rounded-lg placeholder:text-text-muted focus:border-blue focus:outline-none"
                    />
                    <select
                      value={newAccountType}
                      onChange={(e) => setNewAccountType(e.target.value)}
                      className="px-2 py-2 text-sm bg-fg/5 text-fg border border-fg/10 rounded-lg focus:border-blue focus:outline-none cursor-pointer shrink-0"
                      aria-label="Tipo da conta"
                    >
                      <option value="corrente" className="bg-option">Corrente</option>
                      <option value="poupança" className="bg-option">Poupança</option>
                      <option value="carteira" className="bg-option">Carteira</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" type="button" onClick={cancelNewAccount}>
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      loading={isAccountLoading}
                      onClick={handleCreateAccount}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <Select
                  name="accountId"
                  required
                  defaultValue={editingTransaction?.accountId}
                  options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                />
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-text-dim uppercase tracking-wider">
                  Categoria
                </label>
                {!isAddingCategory && (
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(true)}
                    className="text-xs text-blue hover:text-fg transition-colors cursor-pointer"
                  >
                    + Nova
                  </button>
                )}
              </div>

              {isAddingCategory ? (
                <div className="p-3 bg-fg/5 border border-fg/10 rounded-lg space-y-3">
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nome da categoria"
                      className="flex-1 min-w-0 px-3 py-2 text-sm bg-fg/5 text-fg border border-fg/10 rounded-lg placeholder:text-text-muted focus:border-blue focus:outline-none"
                    />
                    <input
                      type="color"
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="w-10 h-10 p-1 bg-well border border-fg/10 rounded cursor-pointer shrink-0"
                      aria-label="Cor da categoria"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryName("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      loading={isCategoryLoading}
                      onClick={handleCreateCategory}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <Select
                  name="categoryId"
                  required
                  defaultValue={editingTransaction?.categoryId}
                  options={categories
                    .filter((c) => c.type === selectedType)
                    .map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                />
              )}
            </div>
          </div>

          {selectedType === "despesa" && !editingTransaction && (
            <Input name="installments" label="Parcelas" type="number" min="1" max="120" defaultValue="1" />
          )}

          <div className="pt-4 border-t border-fg/10 flex items-center justify-end gap-3">
            {editingTransaction && (
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  const target = editingTransaction;
                  closeModal();
                  handleDeleteClick(target);
                }}
                className="mr-auto text-coral! hover:bg-coral/10!"
              >
                Excluir
              </Button>
            )}
            <Button variant="ghost" type="button" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={isLoading}>
              {editingTransaction ? "Salvar" : "Salvar Transação"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog para exclusão */}
      {(() => {
        const installmentInfo = deleteTarget ? getInstallmentInfo(deleteTarget) : null;
        return (
          <ConfirmDialog
            isOpen={deleteTarget !== null}
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
            onExtra={installmentInfo ? handleDeleteGroupConfirm : undefined}
            extraLabel={installmentInfo ? "Excluir a compra inteira" : undefined}
            title="Excluir transação"
            message={
              installmentInfo
                ? `Esta é a parcela ${installmentInfo.current}/${installmentInfo.total} de "${installmentInfo.baseName}". Excluir só esta parcela, ou a compra inteira?`
                : "Esta ação é irreversível. Deseja realmente excluir esta transação?"
            }
            confirmLabel={installmentInfo ? "Excluir só esta" : "Excluir"}
            cancelLabel="Cancelar"
            variant="danger"
          />
        );
      })()}

      {/* Confirm Dialog para exclusão em massa */}
      <ConfirmDialog
        isOpen={isBulkDeleteOpen}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setIsBulkDeleteOpen(false)}
        title="Excluir transações selecionadas"
        message={`Esta ação é irreversível. Deseja realmente excluir ${selectedIds.size} transação(ões)?`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
      />

      {/* Modal de importação */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}

/** Descrição da transação; parcela aparece como selo "3/10" em vez de "(3/10)". */
function TransactionTitle({ t, className = "" }: { t: SerializedTransaction; className?: string }) {
  const installment = getInstallmentInfo(t);
  return (
    <p className={`font-medium text-fg ${className}`}>
      {installment ? installment.baseName : t.description}
      {installment && (
        <span className="ml-2 inline-flex align-middle px-1.5 py-px rounded-md bg-fg/[0.07] border border-fg/10 font-mono-value text-[10px] font-normal text-text-dim whitespace-nowrap">
          {installment.current}/{installment.total}
        </span>
      )}
    </p>
  );
}

/** Botão da barra de filtros: só ícone no celular, ícone e texto em telas largas. */
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
