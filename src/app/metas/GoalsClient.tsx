"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import GoalProgressBar from "@/components/charts/GoalProgressBar";
import { createGoal, addAmountToGoal } from "./actions";
import { formatCurrency } from "@/lib/formatters";

export default function GoalsClient({ goals }: { goals: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    await createGoal(formData);
    setIsLoading(false);
    setIsModalOpen(false);
  }

  async function handleAddAmount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedGoal) return;
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    await addAmountToGoal(selectedGoal.id, formData);
    setIsLoading(false);
    setIsAddModalOpen(false);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="font-display text-4xl text-white tracking-tight">Metas</h1>
          <p className="text-sm text-text-dim mt-1">Planeje e acompanhe seus objetivos</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Nova Meta</Button>
      </motion.div>

      {/* Grid de Metas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {goals.map((goal, i) => (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card p-6 flex flex-col justify-between group"
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <h3 className="font-display text-xl text-white">{goal.name}</h3>
                <span className="text-xs text-text-dim uppercase tracking-wider font-medium bg-black/40 px-2 py-1 rounded">
                  Alvo: {formatCurrency(Number(goal.targetAmount))}
                </span>
              </div>
              
              <GoalProgressBar
                current={Number(goal.currentAmount)}
                target={Number(goal.targetAmount)}
                color={goal.color}
                height={12}
              />
              
              <div className="flex justify-between items-center mt-3">
                <span className="text-sm font-mono-value text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                  {formatCurrency(Number(goal.currentAmount))}
                </span>
                {goal.deadline && (
                  <span className="text-xs text-text-dim">
                    Prazo: {new Date(goal.deadline).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/5 flex justify-end">
              <Button
                variant="glass"
                size="sm"
                onClick={() => {
                  setSelectedGoal(goal);
                  setIsAddModalOpen(true);
                }}
              >
                Registrar Aporte
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {goals.length === 0 && (
        <div className="flex items-center justify-center py-20 text-text-muted border border-dashed border-white/10 rounded-xl glass-panel">
          Nenhuma meta cadastrada
        </div>
      )}

      {/* Modal Nova Meta */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Meta">
        <form onSubmit={handleCreate} className="space-y-5">
          <Input name="name" label="Nome da Meta" required placeholder="Ex: Reserva de Emergência" />
          
          <div className="grid grid-cols-2 gap-4">
            <Input name="targetAmount" label="Valor Alvo" type="number" step="0.01" required />
            <Input name="currentAmount" label="Valor Atual (Opcional)" type="number" step="0.01" defaultValue="0" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input name="deadline" label="Prazo (Opcional)" type="date" />
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-text-dim uppercase tracking-wider">Cor de Destaque</label>
              <div className="flex items-center gap-3">
                <input type="color" name="color" defaultValue="#00E5FF" className="w-10 h-10 p-1 bg-black/40 border border-white/10 rounded cursor-pointer" />
                <span className="text-xs text-text-muted">Selecione uma cor neon</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={isLoading}>Criar Meta</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Aporte */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={`Aporte: ${selectedGoal?.name}`}>
        <form onSubmit={handleAddAmount} className="space-y-5">
          <Input name="amount" label="Valor do Aporte" type="number" step="0.01" required autoFocus />
          <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={isLoading}>Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
