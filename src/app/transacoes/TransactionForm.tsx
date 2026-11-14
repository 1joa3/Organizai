"use client";

import { useState, useTransition } from "react";
import type { Account, Category } from "@prisma/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import SegmentedTabs from "@/components/ui/SegmentedTabs";
import SearchSelect from "@/components/ui/SearchSelect";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { useToast } from "@/components/ui/Toast";
import { createAccount, createCategory, createTransaction, updateTransaction } from "./actions";
import { formatDateInput } from "@/lib/formatters";
import { moneyValue } from "@/lib/moneyInput";
import AmountField from "@/components/ui/AmountField";
import { MAX_INSTALLMENTS } from "@/lib/validation";
import type { SerializedTransaction } from "@/lib/types";

type TxType = "despesa" | "receita";

interface TransactionFormProps {
  /** Ausente = nova transação */
  editing: SerializedTransaction | null;
  accounts: Account[];
  categories: Category[];
  onDone: () => void;
  onDelete: (t: SerializedTransaction) => void;
}

/** Cores para categorias criadas aqui (a primeira que ninguém usa) */
const CATEGORY_PALETTE = ["#60A5FA", "#34D399", "#F87171", "#FBBF24", "#A78BFA", "#F472B6", "#22D3EE", "#FB923C", "#A3E635", "#94A3B8"];

const ACCOUNT_TYPE_LABEL: Record<string, string> = { corrente: "Corrente", "poupança": "Poupança", carteira: "Carteira" };

const label = "text-xs font-medium text-text-dim uppercase tracking-wider";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatDateInput(d);
}

/**
 * Formulário da janela de transação. O valor vem primeiro e em destaque;
 * categoria e conta se escolhem num campo com busca (que também cria um
 * item novo com o nome digitado); a data tem atalhos "Hoje"/"Ontem"; e
 * parcelas, o campo numérico de sempre. Os botões ficam presos no rodapé.
 */
export default function TransactionForm({ editing, accounts, categories, onDone, onDelete }: TransactionFormProps) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<TxType>((editing?.type as TxType) ?? "despesa");
  const [amount, setAmount] = useState(() => moneyValue(editing?.amount));
  const [date, setDate] = useState(() => (editing ? formatDateInput(editing.date) : daysAgo(0)));
  const [accountId, setAccountId] = useState(editing?.accountId ?? accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "");
  // Categorias/contas criadas aqui, até a lista do servidor chegar atualizada
  const [extraCategories, setExtraCategories] = useState<Category[]>([]);
  const [extraAccounts, setExtraAccounts] = useState<Account[]>([]);

  const allCategories = [...categories, ...extraCategories.filter((c) => !categories.some((k) => k.id === c.id))];
  const allAccounts = [...accounts, ...extraAccounts.filter((a) => !accounts.some((k) => k.id === a.id))];
  const typeCategories = allCategories.filter((c) => c.type === type);
  // Categoria de outro tipo (trocou Despesa ↔ Receita): precisa escolher de novo
  const validCategory = typeCategories.some((c) => c.id === categoryId) ? categoryId : "";

  const canSplit = type === "despesa" && !editing;

  async function createCategoryNamed(name: string): Promise<string | null> {
    const used = new Set(allCategories.map((c) => c.color.toUpperCase()));
    const color = CATEGORY_PALETTE.find((c) => !used.has(c.toUpperCase())) ?? CATEGORY_PALETTE[allCategories.length % CATEGORY_PALETTE.length];
    const formData = new FormData();
    formData.set("name", name);
    formData.set("type", type);
    formData.set("color", color);
    const result = await createCategory(formData);
    if (result?.error || !result?.category) {
      toast.error("Não foi possível criar a categoria", result?.error);
      return null;
    }
    setExtraCategories((prev) => [...prev, result.category as Category]);
    toast.success(`Categoria “${name}” criada`);
    return result.category.id;
  }

  async function createAccountNamed(name: string): Promise<string | null> {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("type", "corrente");
    const result = await createAccount(formData);
    if (result?.error || !result?.account) {
      toast.error("Não foi possível criar a conta", result?.error);
      return null;
    }
    setExtraAccounts((prev) => [...prev, result.account as Account]);
    toast.success(`Conta “${name}” criada`);
    return result.account.id;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = editing ? await updateTransaction(editing.id, formData) : await createTransaction(formData);
        if (result?.error) {
          toast.error("Não foi possível salvar", result.error);
          return;
        }
        const installments = Number(formData.get("installments") ?? 1);
        toast.success(editing ? "Transação atualizada" : installments > 1 ? `Compra em ${installments}x registrada` : "Transação registrada");
        onDone();
      } catch {
        toast.error("Não foi possível salvar", "Confira sua conexão e tente de novo.");
      } finally {
        setSaving(false);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <SegmentedTabs
        full
        ariaLabel="Tipo"
        value={type}
        onChange={setType}
        tabClassName="text-sm font-semibold h-10!"
        options={[
          { value: "despesa", label: "− Despesa", tone: "var(--coral)" },
          { value: "receita", label: "+ Receita", tone: "var(--emerald)" },
        ]}
      />
      <input type="hidden" name="type" value={type} />

      {/* Valor em destaque: é o que mais importa e o primeiro a digitar */}
      <AmountField
        label={canSplit ? "Valor total" : "Valor"}
        name="amount"
        required
        autoFocus={!editing}
        value={amount}
        onChange={setAmount}
        prefix={type === "receita" ? "+ R$" : "− R$"}
        prefixClassName={type === "receita" ? "text-emerald" : "text-coral"}
      />

      <Input
        name="description"
        label="Descrição"
        required
        placeholder={type === "receita" ? "Ex: Salário" : "Ex: Supermercado"}
        defaultValue={editing?.description ?? ""}
        autoComplete="off"
      />

      {/* Categoria e conta: campo com busca, que também cria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-4">
        <div>
          <span className={`${label} block mb-2`}>Categoria</span>
          <SearchSelect
            ariaLabel="Categoria"
            placeholder="Escolher categoria"
            searchPlaceholder="Buscar ou criar categoria"
            name="categoryId"
            required
            value={validCategory}
            onChange={setCategoryId}
            onCreate={createCategoryNamed}
            createNoun="categoria"
            options={typeCategories.map((c) => ({
              value: c.id,
              label: c.name,
              color: c.color,
              icon: <CategoryIcon name={c.name} size={14} />,
            }))}
          />
        </div>
        <div>
          <span className={`${label} block mb-2`}>Conta</span>
          <SearchSelect
            ariaLabel="Conta"
            placeholder="Escolher conta"
            searchPlaceholder="Buscar ou criar conta"
            name="accountId"
            required
            value={accountId}
            onChange={setAccountId}
            onCreate={createAccountNamed}
            createNoun="conta"
            options={allAccounts.map((a) => ({ value: a.id, label: a.name, hint: ACCOUNT_TYPE_LABEL[a.type] }))}
          />
        </div>
      </div>

      {/* Data, com atalhos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="tx-date" className={label}>
            Data
          </label>
          <div className="flex gap-1">
            {[
              ["Hoje", 0],
              ["Ontem", 1],
            ].map(([text, n]) => {
              const value = daysAgo(n as number);
              return (
                <button
                  key={text}
                  type="button"
                  onClick={() => setDate(value)}
                  aria-pressed={date === value}
                  className={`h-6 px-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    date === value ? "bg-blue/15 text-blue" : "text-text-dim hover:text-fg hover:bg-fg/5"
                  }`}
                >
                  {text}
                </button>
              );
            })}
          </div>
        </div>
        <Input id="tx-date" name="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {/* Parcelas: o campo de sempre, só para despesa nova */}
      {canSplit && (
        <Input
          name="installments"
          label="Parcelas"
          type="number"
          min="1"
          max={String(MAX_INSTALLMENTS)}
          defaultValue="1"
          inputMode="numeric"
          hint="Uma parcela por mês, a partir da data. Deixe 1 para à vista."
        />
      )}

      {/* Rodapé preso embaixo da janela: os botões ficam sempre à vista */}
      <div className="sticky -bottom-5 sm:-bottom-6 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-4 bg-panel border-t border-fg/10 flex items-center justify-end gap-3">
        {editing && (
          <Button variant="ghost" type="button" onClick={() => onDelete(editing)} className="mr-auto text-coral! hover:bg-coral/10!">
            Excluir
          </Button>
        )}
        <Button variant="ghost" type="button" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {editing ? "Salvar" : "Registrar"}
        </Button>
      </div>
    </form>
  );
}
