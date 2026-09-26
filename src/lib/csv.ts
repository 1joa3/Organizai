import { formatDateInput } from "./formatters";

interface CsvTransaction {
  date: string;
  description: string;
  category: { name: string };
  account: { name: string };
  type: string;
  amount: number;
}

function escapeCsvField(value: string): string {
  if (/[";\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function transactionsToCSV(transactions: CsvTransaction[]): string {
  const header = ["Data", "Descrição", "Categoria", "Conta", "Tipo", "Valor"];
  const rows = transactions.map((t) => [
    formatDateInput(t.date),
    escapeCsvField(t.description),
    escapeCsvField(t.category.name),
    escapeCsvField(t.account.name),
    t.type,
    t.amount.toFixed(2).replace(".", ","),
  ]);

  return [header, ...rows].map((row) => row.join(";")).join("\n");
}

export function exportTransactionsToCSV(transactions: CsvTransaction[], filename = "transacoes.csv") {
  const csv = transactionsToCSV(transactions);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
