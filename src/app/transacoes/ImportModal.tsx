"use client";

import Checkbox from "@/components/ui/Checkbox";
import GlideSelect from "@/components/reactbits/GlideSelect";
import { Fragment, useEffect, useState, useTransition, useMemo } from "react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { getImportDuplicateCandidates, importTransactions } from "./actions";
import { findDuplicates, type DuplicateMatch, type ExistingTransaction } from "@/lib/importDuplicates";
import {
  parseCSV,
  coerceDate,
  coerceAmount,
  guessColumn,
  expandInstallmentRow,
  detectInstallment,
  type InstallmentMatch,
} from "@/lib/csvImport";
import { formatCurrency, formatDate, formatDateShort, formatDateInput } from "@/lib/formatters";

const MAX_ROWS = 5000;
type TypeMode = "despesa" | "receita" | "signal";
type InputMode = "csv" | "manual";

interface ManualEntry {
  id: number;
  date: Date;
  description: string;
  amount: number;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; type: string }[];
}

// Ajustes feitos na pré-visualização, indexados pela linha original do
// arquivo (antes da expansão das parcelas) e guardados junto com as linhas a
// que se referem — se as linhas mudarem, os índices deixam de valer.
interface OverrideState {
  rows: unknown;
  // categoria escolhida para a linha (vale para todas as parcelas dela)
  categories: Record<number, string>;
  // parcela marcada/corrigida à mão; null = "não é parcela"
  installments: Record<number, InstallmentMatch | null>;
}

const NO_OVERRIDE_STATE: OverrideState = { rows: null, categories: {}, installments: {} };

// Escolha "importar/ignorar" das linhas que parecem já cadastradas, por
// chave de linha. Vale só para as linhas e a conta em que foi feita.
interface DuplicateChoiceState {
  rows: unknown;
  accountId: string;
  include: Record<string, boolean>;
}

const NO_DUPLICATE_CHOICES: DuplicateChoiceState = { rows: null, accountId: "", include: {} };

const DUPLICATE_LABEL: Record<DuplicateMatch["kind"], string> = {
  exact: "Já cadastrada",
  probable: "Parece já cadastrada",
  possible: "Possível duplicata",
};

// Exatas e parecidas começam ignoradas; "mesmo dia e valor, outro nome" é
// fraco demais para descartar sem o usuário confirmar.
const includeByDefault = (kind: DuplicateMatch["kind"]) => kind === "possible";

interface InstallmentEdit {
  index: number;
  current: string;
  total: string;
}

export default function ImportModal({ isOpen, onClose, accounts, categories }: ImportModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isImporting, setIsImporting] = useState(false);
  const toast = useToast();

  const [inputMode, setInputMode] = useState<InputMode>("csv");

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [dateCol, setDateCol] = useState(-1);
  const [descCol, setDescCol] = useState(-1);
  const [amountCol, setAmountCol] = useState(-1);

  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [manualDate, setManualDate] = useState(() => formatDateInput(new Date()));
  const [manualDescription, setManualDescription] = useState("");
  const [manualAmount, setManualAmount] = useState("");

  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [typeMode, setTypeMode] = useState<TypeMode>("despesa");
  const [detectInstallments, setDetectInstallments] = useState(true);
  // Categoria escolhida por linha, guardada junto com as linhas a que se refere
  const [overrideState, setOverrideState] = useState<OverrideState>(NO_OVERRIDE_STATE);
  const [installmentEdit, setInstallmentEdit] = useState<InstallmentEdit | null>(null);
  const [duplicateChoices, setDuplicateChoices] = useState<DuplicateChoiceState>(NO_DUPLICATE_CHOICES);
  // Transações já cadastradas no período do arquivo, guardadas com a busca que as trouxe
  const [lookup, setLookup] = useState<{ key: string; existing: ExistingTransaction[] } | null>(null);

  function reset() {
    setInputMode("csv");
    setOverrideState(NO_OVERRIDE_STATE);
    setInstallmentEdit(null);
    setDuplicateChoices(NO_DUPLICATE_CHOICES);
    setFileName(null);
    setParsed(null);
    setTruncated(false);
    setDateCol(-1);
    setDescCol(-1);
    setAmountCol(-1);
    setManualEntries([]);
    setManualDescription("");
    setManualAmount("");
    setTypeMode("despesa");
    setDetectInstallments(true);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function switchMode(mode: InputMode) {
    setInputMode(mode);
    setOverrideState(NO_OVERRIDE_STATE);
    setInstallmentEdit(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const { headers, rows } = parseCSV(text);

      if (headers.length === 0) {
        toast.error("Arquivo vazio", "Não encontrei nenhuma coluna nesse arquivo.");
        setFileName(null);
        return;
      }

      const limited = rows.slice(0, MAX_ROWS);
      setTruncated(rows.length > MAX_ROWS);
      setParsed({ headers, rows: limited });

      setDateCol(guessColumn(headers, ["data", "date"]));
      setDescCol(guessColumn(headers, ["descri", "title", "historico", "histórico", "lancamento", "lançamento", "memo"]));
      setAmountCol(guessColumn(headers, ["valor", "amount", "value", "preco", "preço"]));
    };
    reader.readAsText(file, "utf-8");
  }

  function handleAddManualEntry() {
    const date = coerceDate(manualDate);
    const amount = parseFloat(manualAmount.replace(",", "."));
    const description = manualDescription.trim();

    if (!description || !date || isNaN(amount) || amount <= 0) {
      toast.error("Dados inválidos", "Preencha descrição, valor e data corretamente.");
      return;
    }

    setManualEntries((prev) => [...prev, { id: Date.now() + Math.random(), date, description, amount }]);
    setManualDescription("");
    setManualAmount("");
  }

  function removeManualEntry(id: number) {
    setManualEntries((prev) => prev.filter((m) => m.id !== id));
  }

  const singleRows = useMemo(() => {
    if (inputMode === "manual") {
      return manualEntries.map((m) => ({
        date: m.date as Date | null,
        description: m.description,
        amount: m.amount as number | null,
        type: (typeMode === "signal" ? "despesa" : typeMode) as "despesa" | "receita",
        valid: true,
        manualId: m.id as number | undefined,
      }));
    }

    if (!parsed || dateCol < 0 || descCol < 0 || amountCol < 0) return [];
    return parsed.rows.map((r) => {
      const date = coerceDate(r[dateCol] ?? "");
      const amountRaw = coerceAmount(r[amountCol] ?? "");
      const description = (r[descCol] ?? "").trim();
      const valid = date !== null && amountRaw !== null && amountRaw !== 0 && description.length > 0;
      const type: "despesa" | "receita" =
        typeMode === "signal" ? ((amountRaw ?? 0) < 0 ? "despesa" : "receita") : typeMode;
      return {
        date,
        description,
        amount: amountRaw !== null ? Math.abs(amountRaw) : null,
        type,
        valid,
        manualId: undefined as number | undefined,
      };
    });
  }, [inputMode, manualEntries, parsed, dateCol, descCol, amountCol, typeMode]);

  // Remapeamento de colunas, troca de arquivo ou adição/remoção manual geram
  // outras linhas — aí os ajustes antigos são ignorados.
  const overrides = overrideState.rows === singleRows ? overrideState : NO_OVERRIDE_STATE;
  const editing = installmentEdit && installmentEdit.index < singleRows.length ? installmentEdit : null;

  const mappedRows = useMemo(() => {
    return singleRows.flatMap((r, sourceIndex) => {
      const base = { ...r, sourceIndex, installment: null as InstallmentMatch | null, isFirst: true };
      if (!r.valid || !r.date || r.amount === null) return [base];

      const info =
        sourceIndex in overrides.installments
          ? overrides.installments[sourceIndex]
          : detectInstallments
            ? detectInstallment(r.description)
            : null;
      if (!info) return [base];

      const expanded = expandInstallmentRow({ date: r.date, description: r.description, amount: r.amount, type: r.type }, info);
      return expanded.map((e, k) => ({
        ...base,
        ...e,
        installment: { ...info, current: info.current + k },
        isFirst: k === 0,
      }));
    });
  }, [singleRows, overrides, detectInstallments]);

  // Período coberto pelas linhas válidas — é o que buscamos no servidor
  const lookupKey = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const r of mappedRows) {
      if (!r.valid || !r.date) continue;
      min = Math.min(min, r.date.getTime());
      max = Math.max(max, r.date.getTime());
    }
    if (!accountId || min === Infinity) return null;
    return `${accountId}|${formatDateInput(new Date(min))}|${formatDateInput(new Date(max))}`;
  }, [mappedRows, accountId]);

  useEffect(() => {
    if (!lookupKey) return;
    let cancelled = false;
    const [account, from, to] = lookupKey.split("|");
    getImportDuplicateCandidates({ accountId: account, from, to })
      .then((res) => {
        if (!cancelled && "existing" in res) setLookup({ key: lookupKey, existing: res.existing });
      })
      .catch(() => {
        // Sem a busca a pré-visualização só não marca duplicatas; o servidor
        // ainda barra as cópias exatas na hora de importar.
      });
    return () => {
      cancelled = true;
    };
  }, [lookupKey]);

  const existing = lookup && lookup.key === lookupKey ? lookup.existing : null;
  const checkingDuplicates = lookupKey !== null && existing === null;

  const duplicates = useMemo(() => {
    if (!existing) return mappedRows.map(() => null);
    return findDuplicates(
      mappedRows.map((r) =>
        r.valid && r.date && r.amount !== null
          ? { date: r.date, description: r.description, amount: r.amount, type: r.type }
          : null
      ),
      existing
    );
  }, [mappedRows, existing]);

  const choices =
    duplicateChoices.rows === singleRows && duplicateChoices.accountId === accountId
      ? duplicateChoices
      : NO_DUPLICATE_CHOICES;

  function rowKey(r: (typeof mappedRows)[number]) {
    return `${r.sourceIndex}:${r.installment?.current ?? ""}`;
  }

  function isIncluded(i: number) {
    const dup = duplicates[i];
    if (!dup) return true;
    const key = rowKey(mappedRows[i]);
    return key in choices.include ? choices.include[key] : includeByDefault(dup.kind);
  }

  function setIncluded(indexes: number[], value: boolean) {
    const include = { ...choices.include };
    for (const i of indexes) include[rowKey(mappedRows[i])] = value;
    setDuplicateChoices({ rows: singleRows, accountId, include });
  }

  const duplicateIndexes = mappedRows.flatMap((_, i) => (duplicates[i] ? [i] : []));
  const ignoredCount = duplicateIndexes.filter((i) => !isIncluded(i)).length;

  const validCount = mappedRows.filter((r) => r.valid).length;
  const importCount = validCount - ignoredCount;
  const invalidCount = mappedRows.length - validCount;
  const installmentExtra = mappedRows.length - singleRows.length;
  const isMapped = dateCol >= 0 && descCol >= 0 && amountCol >= 0;
  const hasRows = inputMode === "csv" ? isMapped && mappedRows.length > 0 : manualEntries.length > 0;

  function setCategoryOverride(sourceIndex: number, value: string) {
    setOverrideState({ ...overrides, rows: singleRows, categories: { ...overrides.categories, [sourceIndex]: value } });
  }

  function setInstallmentOverride(sourceIndex: number, value: InstallmentMatch | null) {
    setOverrideState({ ...overrides, rows: singleRows, installments: { ...overrides.installments, [sourceIndex]: value } });
    setInstallmentEdit(null);
  }

  function startInstallmentEdit(sourceIndex: number, current: InstallmentMatch | null) {
    setInstallmentEdit({
      index: sourceIndex,
      current: String(current?.current ?? 1),
      total: String(current?.total ?? ""),
    });
  }

  function applyInstallmentEdit() {
    if (!editing) return;
    const current = parseInt(editing.current);
    const total = parseInt(editing.total);
    if (!(total >= 2 && current >= 1 && current <= total && total <= 120)) {
      toast.error("Parcela inválida", "Informe a parcela atual e o total (ex: 2 de 6).");
      return;
    }
    const description = singleRows[editing.index].description;
    const baseName = detectInstallment(description)?.baseName ?? description;
    setInstallmentOverride(editing.index, { baseName, current, total });
  }

  const filteredCategories = categories.filter((c) =>
    typeMode === "signal" ? true : c.type === typeMode
  );

  function getRowCategoryId(sourceIndex: number) {
    return overrides.categories[sourceIndex] ?? categoryId;
  }

  function handleImport() {
    if (!accountId || !categoryId) {
      toast.error("Faltam dados", "Selecione a conta e a categoria padrão antes de importar.");
      return;
    }
    const missingCategory = mappedRows.some((r, i) => r.valid && isIncluded(i) && !getRowCategoryId(r.sourceIndex));
    if (missingCategory) {
      toast.error("Faltam dados", "Alguma linha ficou sem categoria.");
      return;
    }

    const rowsToSend = mappedRows.flatMap((r, i) =>
      r.valid && isIncluded(i)
        ? [
            {
              date: formatDateInput(r.date!),
              description: r.description,
              amount: r.amount!,
              type: r.type,
              categoryId: getRowCategoryId(r.sourceIndex),
              // se apareceu como duplicata e continuou marcada, o usuário quer importar
              keepDuplicate: duplicates[i] !== null,
            },
          ]
        : []
    );

    if (rowsToSend.length === 0) {
      toast.error(
        "Nada para importar",
        ignoredCount > 0 ? "Todas as linhas já estão cadastradas." : "Nenhuma linha válida para importar."
      );
      return;
    }

    setIsImporting(true);
    startTransition(async () => {
      try {
        const result = await importTransactions({ accountId, rows: rowsToSend });
        if (result?.error) {
          toast.error("Erro ao importar", result.error);
        } else {
          const skipped = (result.skipped ?? 0) + ignoredCount;
          toast.success(
            "Importação concluída",
            `${result.imported} transações importadas${skipped ? `, ${skipped} já existiam e foram ignoradas` : ""}.`
          );
          handleClose();
        }
      } catch {
        toast.error("Erro ao importar", "Não foi possível importar.");
      } finally {
        setIsImporting(false);
      }
    });
  }

  function installmentButton(r: (typeof mappedRows)[number]) {
    if (!r.valid || !r.isFirst) return null;
    return (
      <button
        type="button"
        onClick={() => startInstallmentEdit(r.sourceIndex, r.installment)}
        className={`text-[11px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
          r.installment
            ? "border-blue/30 bg-blue/10 text-blue hover:bg-blue/20"
            : "border-fg/10 text-text-muted hover:text-fg hover:border-fg/30"
        }`}
        title={r.installment ? "Corrigir parcela" : "Marcar como compra parcelada"}
      >
        {r.installment ? `${r.installment.current}/${r.installment.total}` : "Parcelar"}
      </button>
    );
  }

  function duplicateBadge(i: number) {
    const dup = duplicates[i];
    if (!dup) return null;
    const included = isIncluded(i);
    const e = dup.existing;
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px]">
        <span
          className={dup.kind === "possible" ? "text-text-dim" : "text-amber"}
          title={`Já existe: ${e.description} · ${formatDate(e.date)} · ${formatCurrency(e.amount)}`}
        >
          {DUPLICATE_LABEL[dup.kind]}
          {dup.kind !== "exact" && <span className="text-text-muted">: {e.description}, {formatDateShort(e.date)}</span>}
        </span>
        <button
          type="button"
          onClick={() => setIncluded([i], !included)}
          className="text-blue hover:text-fg transition-colors cursor-pointer"
        >
          {included ? "Ignorar" : "Importar mesmo assim"}
        </button>
      </div>
    );
  }

  const columnOptions = (parsed?.headers ?? []).map((h, i) => ({
    value: String(i),
    label: h || `Coluna ${i + 1}`,
  }));

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Fatura" eyebrow="CSV / Extrato" accent="blue" maxWidth="max-w-2xl">
      <div className="space-y-5">
        {/* Toggle de modo */}
        <div className="flex gap-2 p-1 bg-fg/5 rounded-lg border border-fg/10">
          <button
            type="button"
            onClick={() => switchMode("csv")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
              inputMode === "csv" ? "bg-blue/15 text-blue border border-blue/30" : "text-text-dim hover:text-fg border border-transparent"
            }`}
          >
            Arquivo CSV
          </button>
          <button
            type="button"
            onClick={() => switchMode("manual")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
              inputMode === "manual" ? "bg-blue/15 text-blue border border-blue/30" : "text-text-dim hover:text-fg border border-transparent"
            }`}
          >
            Uma a uma
          </button>
        </div>

        {inputMode === "csv" ? (
          !parsed ? (
            <div>
              <label className="text-xs font-medium text-text-dim uppercase tracking-wider mb-2 block">
                Arquivo CSV
              </label>
              <label className="flex flex-col items-center justify-center gap-2 p-8 border border-dashed border-fg/15 rounded-lg cursor-pointer hover:border-blue/40 hover:bg-fg/5 transition-colors text-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
                  <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm text-text-dim">Clique para escolher um arquivo .csv</span>
                <span className="text-xs text-text-muted">Exportado do app do seu banco/cartão</span>
                <input type="file" accept=".csv,.txt" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-dim truncate">{fileName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFileName(null);
                    setParsed(null);
                    setDateCol(-1);
                    setDescCol(-1);
                    setAmountCol(-1);
                  }}
                  className="text-xs text-blue hover:text-fg transition-colors cursor-pointer shrink-0 ml-3"
                >
                  Trocar arquivo
                </button>
              </div>

              {truncated && (
                <p className="text-xs text-amber bg-amber/10 border border-amber/30 rounded-lg px-3 py-2">
                  Arquivo com mais de {MAX_ROWS} linhas — só as primeiras {MAX_ROWS} serão consideradas.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select label="Coluna Data" placeholder="Selecione" value={dateCol >= 0 ? String(dateCol) : ""} onChange={(e) => setDateCol(Number(e.target.value))} options={columnOptions} />
                <Select label="Coluna Descrição" placeholder="Selecione" value={descCol >= 0 ? String(descCol) : ""} onChange={(e) => setDescCol(Number(e.target.value))} options={columnOptions} />
                <Select label="Coluna Valor" placeholder="Selecione" value={amountCol >= 0 ? String(amountCol) : ""} onChange={(e) => setAmountCol(Number(e.target.value))} options={columnOptions} />
              </div>
            </>
          )
        ) : (
          <div className="space-y-3">
            <label className="text-xs font-medium text-text-dim uppercase tracking-wider block">
              Adicionar despesa
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3">
              <input
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="Descrição"
                className="w-full px-3 py-2.5 text-sm bg-fg/5 text-fg border border-fg/10 rounded-lg placeholder:text-text-muted focus:border-blue focus:outline-none"
              />
              <input
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full sm:w-28 px-3 py-2.5 text-sm bg-fg/5 text-fg border border-fg/10 rounded-lg placeholder:text-text-muted focus:border-blue focus:outline-none"
              />
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full sm:w-40 px-3 py-2.5 text-sm bg-fg/5 text-fg border border-fg/10 rounded-lg focus:border-blue focus:outline-none"
              />
            </div>
            <Button
              type="button"
              variant="glass"
              size="sm"
              onClick={() => {
                handleAddManualEntry();
              }}
            >
              + Adicionar
            </Button>
            {manualEntries.length > 0 && (
              <button
                type="button"
                onClick={() => setManualEntries([])}
                className="text-xs text-text-muted hover:text-coral transition-colors cursor-pointer ml-3"
              >
                Limpar todas
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Conta"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          />
          <Select
            label="Tipo"
            value={typeMode}
            onChange={(e) => {
              setTypeMode(e.target.value as TypeMode);
              setCategoryId("");
            }}
            options={
              inputMode === "manual"
                ? [
                    { value: "despesa", label: "Despesa" },
                    { value: "receita", label: "Receita" },
                  ]
                : [
                    { value: "despesa", label: "Despesa (todas)" },
                    { value: "receita", label: "Receita (todas)" },
                    { value: "signal", label: "Detectar pelo sinal do valor" },
                  ]
            }
          />
          <Select
            label="Categoria padrão"
            placeholder="Selecione"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>
        <p className="text-[11px] text-text-muted -mt-2">
          Aplica essa categoria a todas as linhas — dá pra ajustar linha a linha na pré-visualização abaixo.
        </p>

        <Checkbox
          checked={detectInstallments}
          onChange={setDetectInstallments}
          size={16}
          className="items-start! text-xs font-normal! leading-snug! [&>span:first-child]:mt-0.5"
          label={<>Detectar compra parcelada (ex: &ldquo;Loja - Parcela 2/6&rdquo;) e gerar as parcelas futuras automaticamente</>}
        />
        <p className="text-[11px] text-text-muted -mt-3 ml-5.5">
          Alguma compra não foi reconhecida? Use o botão &ldquo;Parcelar&rdquo; na linha dela, na pré-visualização.
        </p>

        {hasRows && (
          <div>
            <p className="text-xs font-medium text-text-dim uppercase tracking-wider mb-2">
              Pré-visualização ({validCount} válidas{invalidCount > 0 ? `, ${invalidCount} com erro (serão ignoradas)` : ""}
              {installmentExtra > 0 ? `, +${installmentExtra} parcelas futuras geradas` : ""})
            </p>
            {checkingDuplicates && (
              <p className="text-[11px] text-text-muted mb-2">Conferindo o que já está cadastrado nesta conta…</p>
            )}
            {duplicateIndexes.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-amber bg-amber/10 border border-amber/30 rounded-lg px-3 py-2 mb-2">
                <span className="flex-1 min-w-[200px]">
                  {duplicateIndexes.length === 1
                    ? "1 linha parece já estar cadastrada nesta conta"
                    : `${duplicateIndexes.length} linhas parecem já estar cadastradas nesta conta`}
                  {ignoredCount > 0 ? ` — ${ignoredCount} ${ignoredCount === 1 ? "será ignorada" : "serão ignoradas"}.` : "."}
                </span>
                {ignoredCount < duplicateIndexes.length && (
                  <button type="button" onClick={() => setIncluded(duplicateIndexes, false)} className="text-blue hover:text-fg cursor-pointer">
                    Ignorar todas
                  </button>
                )}
                {ignoredCount > 0 && (
                  <button type="button" onClick={() => setIncluded(duplicateIndexes, true)} className="text-blue hover:text-fg cursor-pointer">
                    Importar todas
                  </button>
                )}
              </div>
            )}
            <div className="glass-panel overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <tbody>
                  {mappedRows.map((r, i) => (
                    <Fragment key={i}>
                    <tr className={`border-b border-fg/5 last:border-b-0 ${!r.valid || !isIncluded(i) ? "opacity-50" : ""}`}>
                      <td className="hidden sm:table-cell px-3 py-2 font-mono-value text-text-dim whitespace-nowrap">
                        {r.date ? formatDate(r.date) : "—"}
                      </td>
                      <td className="px-3 py-2 text-fg max-w-[160px]">
                        <p className={`truncate ${!isIncluded(i) ? "line-through" : ""}`}>{r.description || "—"}</p>
                        {duplicateBadge(i)}
                        {/* No celular a data e o botão de parcela ficam aqui, para a tabela caber na tela */}
                        <div className="sm:hidden flex items-center gap-2 mt-1">
                          <span className="font-mono-value text-text-dim whitespace-nowrap">{r.date ? formatDateShort(r.date) : "—"}</span>
                          {installmentButton(r)}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        {r.valid ? (
                          <GlideSelect
                            size="sm"
                            ariaLabel="Categoria da linha"
                            value={getRowCategoryId(r.sourceIndex)}
                            onChange={(v) => setCategoryOverride(r.sourceIndex, v)}
                            options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
                            menuWidth={160}
                            className="min-w-[88px] max-w-[110px] sm:max-w-[130px]"
                            triggerClassName="bg-fg/5 border border-fg/10 rounded px-1.5 py-1 text-[11px] text-fg hover:border-fg/20 aria-expanded:border-blue focus-visible:border-blue"
                          />
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className={`px-3 py-2 font-mono-value text-right whitespace-nowrap ${r.type === "receita" ? "text-emerald" : "text-coral"}`}>
                        {r.amount !== null ? formatCurrency(r.amount) : "inválido"}
                      </td>
                      <td className="hidden sm:table-cell px-2 py-2 whitespace-nowrap text-right">{installmentButton(r)}</td>
                      {inputMode === "manual" && (
                        <td className="px-2 py-2 w-6">
                          {r.manualId !== undefined && (
                            <button
                              type="button"
                              onClick={() => removeManualEntry(r.manualId!)}
                              className="text-text-dim hover:text-coral transition-colors cursor-pointer"
                              title="Remover"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                    {r.isFirst && editing?.index === r.sourceIndex && (
                      <tr className="border-b border-fg/5 bg-fg/5">
                        <td colSpan={6} className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-dim">
                            <span>Parcela</span>
                            <input
                              value={editing.current}
                              onChange={(e) => setInstallmentEdit({ ...editing, current: e.target.value })}
                              inputMode="numeric"
                              className="w-12 px-1.5 py-1 bg-fg/5 border border-fg/10 rounded text-fg text-center focus:border-blue focus:outline-none"
                            />
                            <span>de</span>
                            <input
                              value={editing.total}
                              onChange={(e) => setInstallmentEdit({ ...editing, total: e.target.value })}
                              onKeyDown={(e) => e.key === "Enter" && applyInstallmentEdit()}
                              inputMode="numeric"
                              autoFocus
                              className="w-12 px-1.5 py-1 bg-fg/5 border border-fg/10 rounded text-fg text-center focus:border-blue focus:outline-none"
                            />
                            <button type="button" onClick={applyInstallmentEdit} className="text-blue hover:text-fg cursor-pointer">
                              Aplicar
                            </button>
                            {r.installment && (
                              <button
                                type="button"
                                onClick={() => setInstallmentOverride(r.sourceIndex, null)}
                                className="text-text-muted hover:text-coral cursor-pointer"
                              >
                                Não é parcelada
                              </button>
                            )}
                            <button type="button" onClick={() => setInstallmentEdit(null)} className="text-text-muted hover:text-fg cursor-pointer ml-auto">
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-fg/10 flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancelar
          </Button>
          {hasRows && (
            <Button type="button" loading={isImporting || isPending} disabled={importCount === 0} onClick={handleImport}>
              Importar {importCount > 0 ? `(${importCount})` : ""}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
