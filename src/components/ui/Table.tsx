"use client";

import { ReactNode, useState } from "react";
import { motion } from "framer-motion";

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  /** Optional card layout shown instead of the table below the `md` breakpoint. */
  renderMobileItem?: (item: T) => ReactNode;
}

type SortDirection = "asc" | "desc";

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "Nenhum dado encontrado",
  onRowClick,
  renderMobileItem,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortedData = sortKey
    ? [...data].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal == null || bVal == null) return 0;
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data;

  return (
    <>
      {/* Mobile card list */}
      {renderMobileItem && (
        <div className="md:hidden">
          {sortedData.length === 0 ? (
            <div className="glass-panel px-5 py-12 text-center text-text-muted text-sm">
              {emptyMessage}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedData.map((item, i) => (
                <motion.div
                  key={keyExtractor(item)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={onRowClick ? "cursor-pointer" : undefined}
                >
                  {renderMobileItem(item)}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Desktop table */}
      <div className={`overflow-x-auto glass-panel ${renderMobileItem ? "hidden md:block" : ""}`}>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  className={`
                    px-5 py-4 text-left text-xs font-medium text-text-dim uppercase tracking-wider
                    ${col.sortable ? "cursor-pointer select-none hover:text-white" : ""}
                    ${col.className ?? ""}
                  `}
                >
                  <span className="inline-flex items-center gap-1.5 transition-colors">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        className={`text-blue transition-transform ${sortDir === "asc" ? "rotate-180" : ""}`}
                      >
                        <path d="M6 8L2 4h8L6 8z" fill="currentColor" />
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((item, i) => (
                <motion.tr
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  key={keyExtractor(item)}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={`
                    border-b border-white/5 last:border-b-0
                    hover:bg-white/5 transition-colors duration-200
                    ${onRowClick ? "cursor-pointer" : ""}
                  `}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-5 py-4 ${col.className ?? ""}`}>
                      {col.render
                        ? col.render(item)
                        : (item[col.key] as ReactNode)}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
