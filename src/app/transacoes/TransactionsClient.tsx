"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import PeriodSelector from "@/components/ui/PeriodSelector";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { useToast } from "@/components/ui/Toast";
import { createTransaction, deleteTransaction, createCategory } from "./actions";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { exportTransactionsToCSV } from "@/lib/csv";

type BaseProps = {
  transactions: any[];
  accounts: any[];
  categories: any[];
  month: number;
  year: number;
};

export default function TransactionsClient({
  transactions,
  accounts,
  categories,
  month,
  year,
}: BaseProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState("despesa");
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const toast = useToast();

  // Filtros
  const [filterType, setFilterType] = useState<string>("");

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

  function closeModal() {
    setIsModalOpen(false);
    setIsAddingCategory(false);
    setNewCategoryName("");
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isAddingCategory) {
      toast.warning("Categoria pendente", "Salve ou cancele a nova categoria antes de continuar.");
      return;
    }
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createTransaction(formData);
        toast.success("Transação criada", "A transação foi registrada com sucesso.");
      } catch {
        toast.error("Erro ao criar", "Não foi possível criar a transação.");
      } finally {
        setIsLoading(false);
        closeModal();
      }
    });
  }

  function handleDeleteClick(id: string) {
    setDeleteTarget(id);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);

    startTransition(async () => {
      try {
        const result = await deleteTransaction(id);
        if (result?.error) {
          toast.error("Erro ao excluir", result.error);
        } else {
          toast.success("Transação excluída", "O registro foi removido com sucesso.");
        }
      } catch (error) {
        console.error("Failed to delete transaction:", error);
        toast.error("Erro inesperado", "Ocorreu um erro ao excluir a transação.");
      }
    });
  }

  function handleDeleteCancel() {
    setDeleteTarget(null);
  }

  const filtered = transactions.filter((t) => {
    if (filterType && t.type !== filterType) return false;
    return true;
  });

  const columns = [
    {
      key: "date",
      label: "Data",
      sortable: true,
      render: (t: any) => (
        <span className="font-mono-value text-text-dim">{formatDate(t.date)}</span>
      ),
    },
    {
      key: "description",
      label: "Descrição",
      sortable: true,
      render: (t: any) => <span className="font-medium text-white">{t.description}</span>,
    },
    {
      key: "category",
      label: "Categoria",
      render: (t: any) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${t.category.color}15`, color: t.category.color, border: `1px solid ${t.category.color}30` }}>
          <CategoryIcon name={t.category.name} size={12} />
          {t.category.name}
        </span>
      ),
    },
    {
      key: "account",
      label: "Conta",
      render: (t: any) => <span className="text-text-muted">{t.account.name}</span>,
    },
    {
      key: "amount",
      label: "Valor",
      sortable: true,
      className: "text-right",
      render: (t: any) => (
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
      className: "w-10 text-right",
      render: (t: any) => (
        <button
          onClick={() => handleDeleteClick(t.id)}
          className="text-text-dim hover:text-coral transition-colors"
          title="Excluir"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      ),
    },
  ];

  function renderMobileItem(t: any) {
    return (
      <div className="glass-panel p-4 flex items-center gap-3">
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

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{t.description}</p>
          <p className="text-xs text-text-dim mt-0.5 truncate">
            {t.category.name} <span className="text-white/20">•</span> {t.account.name}
          </p>
          <p className="text-[11px] text-text-muted font-mono-value mt-0.5">{formatDate(t.date)}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`font-mono-value text-sm font-medium ${
              t.type === "receita" ? "text-emerald drop-shadow-[0_0_8px_rgba(204,255,0,0.3)]" : "text-coral drop-shadow-[0_0_8px_rgba(255,0,85,0.3)]"
            }`}
          >
            {t.type === "receita" ? "+" : "−"}
            {formatCurrency(Number(t.amount))}
          </span>
          <button
            onClick={() => handleDeleteClick(t.id)}
            className="text-text-dim hover:text-coral transition-colors"
            title="Excluir"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="font-display text-4xl text-white tracking-tight">Transações</h1>
          <p className="text-sm text-text-dim mt-1">Gerencie suas receitas e despesas</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Nova Transação</Button>
      </motion.div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-4 items-center justify-between"
      >
        <div className="flex flex-wrap gap-4 items-center">
          <PeriodSelector month={month} year={year} />
          <div className="w-48">
            <Select
              options={[
                { value: "", label: "Todos os tipos" },
                { value: "receita", label: "Receitas" },
                { value: "despesa", label: "Despesas" },
              ]}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            />
          </div>
        </div>
        <Button
          variant="glass"
          size="sm"
          onClick={() => exportTransactionsToCSV(filtered)}
        >
          Exportar CSV
        </Button>
      </motion.div>

      {/* Tabela */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Table columns={columns} data={filtered} keyExtractor={(t) => t.id} renderMobileItem={renderMobileItem} />
      </motion.div>

      {/* Modal Nova Transação */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedType === "receita" ? "Nova Receita" : "Nova Despesa"}
        eyebrow="Transação"
        accent={selectedType === "receita" ? "emerald" : "coral"}
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="text-xs font-medium text-text-dim uppercase tracking-wider mb-2 block">
              Tipo
            </label>
            <div className="flex gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setSelectedType("despesa")}
                className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all cursor-pointer ${
                  selectedType === "despesa"
                    ? "bg-coral/15 text-coral border border-coral/30"
                    : "text-text-dim hover:text-white border border-transparent"
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
                    : "text-text-dim hover:text-white border border-transparent"
                }`}
              >
                + Receita
              </button>
            </div>
            <input type="hidden" name="type" value={selectedType} />
          </div>

          <Input name="description" label="Descrição" required placeholder="Ex: Supermercado" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input name="amount" label="Valor Total" type="number" step="0.01" required placeholder="0.00" />
            <Input name="date" label="Data" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              name="accountId"
              label="Conta"
              required
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-text-dim uppercase tracking-wider">
                  Categoria
                </label>
                {!isAddingCategory && (
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(true)}
                    className="text-xs text-blue hover:text-white transition-colors cursor-pointer"
                  >
                    + Nova
                  </button>
                )}
              </div>

              {isAddingCategory ? (
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-3">
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nome da categoria"
                      className="flex-1 min-w-0 px-3 py-2 text-sm bg-white/5 text-white border border-white/10 rounded-lg placeholder:text-text-muted focus:border-blue focus:outline-none"
                    />
                    <input
                      type="color"
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="w-10 h-10 p-1 bg-black/40 border border-white/10 rounded cursor-pointer shrink-0"
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

          {selectedType === "despesa" && (
            <Input name="installments" label="Parcelas" type="number" min="1" max="120" defaultValue="1" />
          )}

          <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={isLoading}>
              Salvar Transação
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog para exclusão */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        title="Excluir transação"
        message="Esta ação é irreversível. Deseja realmente excluir esta transação?"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </div>
  );
}
