"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { createInvestment } from "./actions";
import { formatCurrency, formatReturn } from "@/lib/formatters";

export default function InvestmentsClient({ investments }: { investments: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    await createInvestment(formData);
    setIsLoading(false);
    setIsModalOpen(false);
  }

  // Agrupar por tipo
  const grouped = investments.reduce((acc: any, inv: any) => {
    if (!acc[inv.assetType]) acc[inv.assetType] = [];
    acc[inv.assetType].push(inv);
    return acc;
  }, {});

  const typeLabels: Record<string, string> = {
    renda_fixa: "Renda Fixa",
    renda_variavel: "Renda Variável",
    fundo: "Fundos de Investimento",
    cripto: "Criptoativos",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="font-display text-4xl text-white tracking-tight">Investimentos</h1>
          <p className="text-sm text-text-dim mt-1">Acompanhe sua carteira</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Novo Aporte</Button>
      </motion.div>

      {/* Lista por tipo */}
      {Object.keys(typeLabels).map((type, i) => {
        const items = grouped[type] || [];
        if (items.length === 0) return null;

        return (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider border-b border-white/5 pb-2">
              {typeLabels[type]}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((inv: any) => {
                const invested = Number(inv.investedAmount);
                const current = Number(inv.currentAmount);
                const rentabilidade = ((current - invested) / invested) * 100;

                return (
                  <div key={inv.id} className="glass-card p-5 group relative overflow-hidden">
                    {/* Hover highlight */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-medium text-white text-lg">{inv.asset}</h3>
                        <span
                          className={`text-xs font-mono-value px-2 py-1 rounded bg-black/40 border ${
                            rentabilidade >= 0 ? "text-emerald border-emerald/20" : "text-coral border-coral/20"
                          }`}
                        >
                          {formatReturn(rentabilidade)}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] text-text-dim uppercase tracking-wider mb-0.5">Saldo Atual</p>
                          <p className="font-mono-value text-xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                            {formatCurrency(current)}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-white/5">
                          <p className="text-[10px] text-text-dim uppercase tracking-wider mb-0.5">Total Investido</p>
                          <p className="font-mono-value text-sm text-text-muted">
                            {formatCurrency(invested)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      {investments.length === 0 && (
        <div className="flex items-center justify-center py-20 text-text-muted border border-dashed border-white/10 rounded-xl glass-panel">
          Nenhum investimento cadastrado
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Aporte" eyebrow="Investimento" accent="amber">
        <form onSubmit={handleCreate} className="space-y-5">
          <Input name="asset" label="Ativo" required placeholder="Ex: Tesouro Selic 2029" />
          
          <Select
            name="assetType"
            label="Tipo de Ativo"
            required
            options={[
              { value: "renda_fixa", label: "Renda Fixa" },
              { value: "renda_variavel", label: "Renda Variável" },
              { value: "fundo", label: "Fundo de Investimento" },
              { value: "cripto", label: "Criptoativo" },
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input name="investedAmount" label="Valor Investido" type="number" step="0.01" required />
            <Input name="currentAmount" label="Valor Atual" type="number" step="0.01" required />
          </div>

          <Input name="date" label="Data do Aporte" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />

          <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={isLoading}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
