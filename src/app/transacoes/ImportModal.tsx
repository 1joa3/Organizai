"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { importTransactions } from "./actions";
import { parseCSV, coerceDate, coerceAmount, guessColumn, expandInstallmentRow } from "@/lib/csvImport";
import { formatCurrency, formatDate, formatDateInput } from "@/lib/formatters";

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
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({});

  function reset() {
    setInputMode("csv");
    setCategoryOverrides({});
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
    setCategoryOverrides({});
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

  const mappedRows = useMemo(() => {
    const withOrigin = singleRows.map((r) => ({ ...r, manualId: r.manualId }));
    if (!detectInstallments) return withOrigin;
    return withOrigin.flatMap((r) => {
      if (!r.valid || !r.date || r.amount === null) return [r];
      const expanded = expandInstallmentRow({ date: r.date, description: r.description, amount: r.amount, type: r.type });
      if (expanded.length === 1) return [r];
      return expanded.map((e) => ({ ...e, valid: true, manualId: r.manualId }));
    });
  }, [singleRows, detectInstallments]);

  const validCount = mappedRows.filter((r) => r.valid).length;
  const invalidCount = mappedRows.length - validCount;
  const installmentExtra = mappedRows.length - singleRows.length;
  const isMapped = dateCol >= 0 && descCol >= 0 && amountCol >= 0;
  const hasRows = inputMode === "csv" ? isMapped && mappedRows.length > 0 : manualEntries.length > 0;

  // Linhas podem mudar de forma (expansão de parcelas, remapeamento de
  // colunas, adição/remoção manual) — os índices de override deixam de
  // fazer sentido, então limpa.
  useEffect(() => {
    setCategoryOverrides({});
  }, [singleRows, detectInstallments]);

  const filteredCategories = categories.filter((c) =>
    typeMode === "signal" ? true : c.type === typeMode
  );

  function getRowCategoryId(index: number) {
    return categoryOverrides[index] ?? categoryId;
  }

  function handleImport() {
    if (!accountId || !categoryId) {
      toast.error("Faltam dados", "Selecione a conta e a categoria padrão antes de importar.");
      return;
    }
    const missingCategory = mappedRows.some((r, i) => r.valid && !getRowCategoryId(i));
    if (missingCategory) {
      toast.error("Faltam dados", "Alguma linha ficou sem categoria.");
      return;
    }

    const rowsToSend = mappedRows
      .map((r, i) => ({ ...r, categoryId: getRowCategoryId(i) }))
      .filter((r) => r.valid)
      .map((r) => ({
        date: r.date!.toISOString(),
        description: r.description,
        amount: r.amount!,
        type: r.type,
        categoryId: r.categoryId,
      }));

    if (rowsToSend.length === 0) {
      toast.error("Nada para importar", "Nenhuma linha válida para importar.");
      return;
    }

    setIsImporting(true);
    startTransition(async () => {
      try {
        const result = await importTransactions({ accountId, rows: rowsToSend });
        if (result?.error) {
          toast.error("Erro ao importar", result.error);
        } else {
          toast.success(
            "Importação concluída",
            `${result.imported} transações importadas${result.skipped ? `, ${result.skipped} já existiam e foram ignoradas` : ""}.`
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

  const columnOptions = (parsed?.headers ?? []).map((h, i) => ({
    value: String(i),
    label: h || `Coluna ${i + 1}`,
  }));

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Fatura" eyebrow="CSV / Extrato" accent="blue" maxWidth="max-w-2xl">
      <div className="space-y-5">
        {/* Toggle de modo */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => switchMode("csv")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
              inputMode === "csv" ? "bg-blue/15 text-blue border border-blue/30" : "text-text-dim hover:text-white border border-transparent"
            }`}
          >
            Importar arquivo CSV
          </button>
          <button
            type="button"
            onClick={() => switchMode("manual")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
              inputMode === "manual" ? "bg-blue/15 text-blue border border-blue/30" : "text-text-dim hover:text-white border border-transparent"
            }`}
          >
            Adicionar uma a uma
          </button>
        </div>

        {inputMode === "csv" ? (
          !parsed ? (
            <div>
              <label className="text-xs font-medium text-text-dim uppercase tracking-wider mb-2 block">
                Arquivo CSV
              </label>
              <label className="flex flex-col items-center justify-center gap-2 p-8 border border-dashed border-white/15 rounded-lg cursor-pointer hover:border-blue/40 hover:bg-white/5 transition-colors text-center">
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
                  className="text-xs text-blue hover:text-white transition-colors cursor-pointer shrink-0 ml-3"
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
                className="w-full px-3 py-2.5 text-sm bg-white/5 text-white border border-white/10 rounded-lg placeholder:text-text-muted focus:border-blue focus:outline-none"
              />
              <input
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full sm:w-28 px-3 py-2.5 text-sm bg-white/5 text-white border border-white/10 rounded-lg placeholder:text-text-muted focus:border-blue focus:outline-none"
              />
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full sm:w-40 px-3 py-2.5 text-sm bg-white/5 text-white border border-white/10 rounded-lg focus:border-blue focus:outline-none"
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

        <label className="flex items-center gap-2 text-xs text-text-dim cursor-pointer select-none">
          <input
            type="checkbox"
            checked={detectInstallments}
            onChange={(e) => setDetectInstallments(e.target.checked)}
            className="w-3.5 h-3.5 accent-blue cursor-pointer"
          />
          Detectar compra parcelada (ex: "Loja - Parcela 2/6") e gerar as parcelas futuras automaticamente
        </label>

        {hasRows && (
          <div>
            <p className="text-xs font-medium text-text-dim uppercase tracking-wider mb-2">
              Pré-visualização ({validCount} válidas{invalidCount > 0 ? `, ${invalidCount} com erro (serão ignoradas)` : ""}
              {installmentExtra > 0 ? `, +${installmentExtra} parcelas futuras geradas` : ""})
            </p>
            <div className="glass-panel overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <tbody>
                  {mappedRows.map((r, i) => (
                    <tr key={i} className={`border-b border-white/5 last:border-b-0 ${!r.valid ? "opacity-50" : ""}`}>
                      <td className="px-3 py-2 font-mono-value text-text-dim whitespace-nowrap">
                        {r.date ? formatDate(r.date) : "—"}
                      </td>
                      <td className="px-3 py-2 text-white truncate max-w-[160px]">{r.description || "—"}</td>
                      <td className="px-2 py-2">
                        {r.valid ? (
                          <select
                            value={getRowCategoryId(i)}
                            onChange={(e) =>
                              setCategoryOverrides((prev) => ({ ...prev, [i]: e.target.value }))
                            }
                            className="w-full max-w-[130px] bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[11px] text-white focus:border-blue focus:outline-none cursor-pointer"
                          >
                            {filteredCategories.map((c) => (
                              <option key={c.id} value={c.id} className="bg-[#13161D]">
                                {c.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className={`px-3 py-2 font-mono-value text-right whitespace-nowrap ${r.type === "receita" ? "text-emerald" : "text-coral"}`}>
                        {r.amount !== null ? formatCurrency(r.amount) : "inválido"}
                      </td>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancelar
          </Button>
          {hasRows && (
            <Button type="button" loading={isImporting || isPending} disabled={validCount === 0} onClick={handleImport}>
              Importar {validCount > 0 ? `(${validCount})` : ""}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
