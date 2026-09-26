"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import PeriodSelector from "@/components/ui/PeriodSelector";
import { createTransaction, deleteTransaction } from "./actions";
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

  // Filtros
  const [filterType, setFilterType] = useState<string>("");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        await createTransaction(formData);
      } finally {
        setIsLoading(false);
        setIsModalOpen(false);
      }
    });
  }

  function handleDelete(id: string) {
    if (confirm("Deseja realmente excluir esta transação?")) {
      startTransition(async () => {
        try {
          const result = await deleteTransaction(id);
          if (result?.error) {
            alert("Erro: " + result.error);
          }
        } catch (error) {
          console.error("Failed to delete transaction:", error);
          alert("Ocorreu um erro ao excluir a transação.");
        }
      });
    }
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
        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${t.category.color}15`, color: t.category.color, border: `1px solid ${t.category.color}30` }}>
          {t.category.icon} {t.category.name}
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
          onClick={() => handleDelete(t.id)}
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
        className="glass-card overflow-hidden"
      >
        <Table columns={columns} data={filtered} keyExtractor={(t) => t.id} />
      </motion.div>

      {/* Modal Nova Transação */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Transação"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <Input name="description" label="Descrição" required placeholder="Ex: Supermercado" />
          
          <div className="grid grid-cols-2 gap-4">
            <Input name="amount" label="Valor Total" type="number" step="0.01" required placeholder="0.00" />
            <Input name="date" label="Data" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              name="type"
              label="Tipo"
              required
              options={[
                { value: "despesa", label: "Despesa" },
                { value: "receita", label: "Receita" },
              ]}
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            />
            <Select
              name="accountId"
              label="Conta"
              required
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              name="categoryId"
              label="Categoria"
              required
              options={categories.map((c) => ({
                value: c.id,
                label: `${c.icon || ""} ${c.name}`,
              }))}
            />
            {selectedType === "despesa" && (
              <Input name="installments" label="Parcelas" type="number" min="1" max="120" defaultValue="1" />
            )}
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isLoading}>
              Salvar Transação
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
