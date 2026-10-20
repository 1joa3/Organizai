"use client";

import { useState } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import CategoryIcon from "@/components/ui/CategoryIcon";
import ChangeBadge from "@/components/ui/ChangeBadge";
import { formatCurrency } from "@/lib/formatters";
import { useThemeColors } from "./useThemeColors";

ChartJS.register(ArcElement, Tooltip, Legend);

interface CategoryData {
  name: string;
  color: string;
  total: number;
  /** Variação contra o período anterior; ausente = não mostra */
  change?: number | null;
}

interface DonutCategoriesProps {
  data: CategoryData[];
  /** Variação do total contra o período anterior, mostrada no centro */
  totalChange?: number | null;
  /** Se passado, cada categoria ganha um botão para abrir o detalhe */
  onDetails?: (name: string) => void;
}

export default function DonutCategories({ data, totalChange, onDetails }: DonutCategoriesProps) {
  const colors = useThemeColors();
  // Categorias escondidas pela legenda, por nome: continuam escondidas ao trocar de período
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  function toggle(name: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-56 text-text-muted text-sm border border-dashed border-fg/10 rounded-lg">
        Sem dados para exibir
      </div>
    );
  }

  // Aumentar o brilho das cores originais para o tema dark neon
  const glowColors = data.map(d => d.color);

  const chartData = {
    labels: data.map((d) => d.name),
    datasets: [
      {
        // Escondida = valor 0, para o Chart.js animar a fatia encolhendo/voltando
        data: data.map((d) => (hidden.has(d.name) ? 0 : d.total)),
        backgroundColor: glowColors,
        borderColor: colors.bg, // mesma cor do fundo, para criar os espaços
        // Sem borda nas fatias zeradas, senão sobra um risco no anel
        borderWidth: data.map((d) => (hidden.has(d.name) ? 0 : 4)),
        hoverBorderColor: colors.fg,
        hoverBorderWidth: 1,
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "75%", // Thinner donut
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: colors["tooltip-bg"],
        borderColor: colors.border,
        borderWidth: 1,
        titleColor: colors.fg,
        bodyColor: colors["text-dim"],
        titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: 600 as const },
        bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4,
        callbacks: {
          label: function (context: { parsed: number }) {
            return ` ${formatCurrency(context.parsed)}`;
          },
        },
      },
    },
  };

  const visible = data.filter((d) => !hidden.has(d.name));
  const total = visible.reduce((sum, d) => sum + d.total, 0);
  const hiddenCount = data.length - visible.length;

  return (
    // Lado a lado só quando sobra espaço para a legenda (bloco ≥ 32rem);
    // abaixo disso a legenda vai para baixo do donut, na largura toda
    <div className="flex flex-col @lg:flex-row items-center @lg:items-stretch gap-6 h-full">
      <div className="w-44 h-44 relative shrink-0 @lg:self-center">
        <Doughnut data={chartData} options={options} />
        {/* Centro do donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase tracking-widest text-text-muted font-medium mb-1">
            {hiddenCount > 0 ? "Selecionado" : "Total"}
          </span>
          <span className="font-mono-value text-base text-fg drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            {formatCurrency(total)}
          </span>
          {hiddenCount === 0 && totalChange !== undefined && (
            <span className="mt-1 flex items-center gap-1">
              <ChangeBadge change={totalChange} />
              <span className="text-[10px] text-text-muted">vs. anterior</span>
            </span>
          )}
        </div>
      </div>

      {/* Legenda: cada item liga/desliga a categoria no gráfico */}
      <div className="flex flex-col gap-1 flex-1 w-full min-w-0">
        <div className="flex items-center justify-between gap-2 h-5 px-1.5 whitespace-nowrap">
          <span className="text-[11px] text-text-muted truncate">
            {hiddenCount > 0 ? `${visible.length} de ${data.length}` : "Clique para filtrar"}
          </span>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setHidden(new Set())}
              className="text-[11px] font-medium text-blue hover:underline cursor-pointer shrink-0"
            >
              Mostrar todas
            </button>
          )}
        </div>
        <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto">
          {data.map((d) => {
            const isHidden = hidden.has(d.name);
            const percentage = !isHidden && total > 0 ? `${((d.total / total) * 100).toFixed(1)}%` : "—";
            return (
              <div key={d.name} className="flex items-center gap-1 min-w-0">
                <button
                  type="button"
                  onClick={() => toggle(d.name)}
                  aria-pressed={!isHidden}
                  title={isHidden ? `Mostrar ${d.name}` : `Esconder ${d.name}`}
                  className={`group flex-1 min-w-0 flex items-center gap-2.5 text-left px-1.5 py-1.5 rounded-lg transition-all duration-300 cursor-pointer hover:bg-fg/5 ${
                    isHidden ? "opacity-45" : ""
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all duration-300"
                    style={
                      isHidden
                        ? { border: "1px dashed var(--text-muted)", color: "var(--text-muted)" }
                        : { backgroundColor: `${d.color}15`, border: `1px solid ${d.color}30`, color: d.color }
                    }
                  >
                    <CategoryIcon name={d.name} size={12} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={`text-sm font-medium truncate transition-colors ${
                          isHidden ? "text-text-muted line-through" : "text-text-dim group-hover:text-fg"
                        }`}
                      >
                        {d.name}
                      </span>
                      <span className={`font-mono-value text-sm shrink-0 transition-colors ${isHidden ? "text-text-muted" : "text-fg"}`}>
                        {formatCurrency(d.total)}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="font-mono-value text-[10px] text-text-muted">{percentage}</span>
                      {!isHidden && d.change !== undefined && <ChangeBadge change={d.change} />}
                    </span>
                  </span>
                </button>
                {onDetails && (
                  <button
                    type="button"
                    onClick={() => onDetails(d.name)}
                    aria-label={`Ver despesas de ${d.name}`}
                    title={`Ver despesas de ${d.name}`}
                    className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md text-text-muted hover:text-blue hover:bg-blue/10 transition-colors cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
