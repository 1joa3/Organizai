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

/** Categorias listadas antes do "Ver todas" */
const LEGEND_LIMIT = 6;

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
  const [showAll, setShowAll] = useState(false);

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
      <div className="flex items-center justify-center h-full min-h-56 text-text-muted text-sm border border-dashed border-fg/10 rounded-lg">
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
  // Sem rolagem dentro do cartão: as maiores primeiro, o resto num clique
  const listed = showAll ? data : data.slice(0, LEGEND_LIMIT);
  const extra = data.length - LEGEND_LIMIT;

  return (
    // Lado a lado só quando sobra espaço para a legenda (bloco ≥ 32rem);
    // abaixo disso a legenda vai para baixo do donut, na largura toda
    <div className="flex flex-col @lg:flex-row items-center gap-6 h-full">
      {/* Cresce com o bloco: mais largo ou mais alto, rosca maior */}
      <div className="w-44 h-44 @lg:w-48 @lg:h-48 @3xl:w-60 @3xl:h-60 relative shrink-0 self-center">
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

      {/* Legenda em colunas alinhadas (subgrid): ícone · nome e barra · valor e % · detalhes.
          Clicar na linha liga/desliga a categoria no gráfico */}
      <div className="@container/legend flex-1 w-full min-w-0 self-stretch flex flex-col justify-center">
        {/* Só aparece filtrando: sem filtro, ícone e valor já dizem o que é cada coluna */}
        {hiddenCount > 0 && (
          <div className="flex items-center justify-between gap-2 mb-1.5 px-2 text-xs text-text-muted">
            <span>
              {visible.length} de {data.length} categorias no gráfico
            </span>
            <button type="button" onClick={() => setHidden(new Set())} className="text-blue hover:underline cursor-pointer">
              Mostrar todas
            </button>
          </div>
        )}

        {/* Lista muito estreita (< 17rem): some a coluna do ícone — a cor já está na barra — e o nome ganha o espaço */}
        <ul
          className={`grid gap-y-0.5 ${
            onDetails
              ? "grid-cols-[minmax(0,1fr)_auto_2rem] @[17rem]/legend:grid-cols-[2.25rem_minmax(0,1fr)_auto_2rem]"
              : "grid-cols-[minmax(0,1fr)_auto_0.25rem] @[17rem]/legend:grid-cols-[2.25rem_minmax(0,1fr)_auto_0.25rem]"
          }`}
        >
          {listed.map((d) => {
            const isHidden = hidden.has(d.name);
            const share = !isHidden && total > 0 ? d.total / total : 0;
            return (
              <li key={d.name} className="col-span-full grid grid-cols-subgrid items-center gap-x-3 rounded-lg hover:bg-fg/[0.04] transition-colors">
                <button
                  type="button"
                  onClick={() => toggle(d.name)}
                  aria-pressed={!isHidden}
                  title={isHidden ? `Mostrar ${d.name} no gráfico` : `Esconder ${d.name} do gráfico`}
                  className={`group col-span-2 @[17rem]/legend:col-span-3 grid grid-cols-subgrid items-center gap-x-3 py-2 text-left cursor-pointer transition-opacity duration-300 ${
                    isHidden ? "opacity-45" : ""
                  }`}
                >
                  <span
                    // A coluna já inclui o recuo de 0.5rem à esquerda (padding num subgrid não soma à coluna)
                    className="hidden @[17rem]/legend:flex ml-2 w-7 h-7 rounded-md items-center justify-center transition-all duration-300"
                    style={
                      isHidden
                        ? { border: "1px dashed var(--text-muted)", color: "var(--text-muted)" }
                        : { backgroundColor: `${d.color}15`, border: `1px solid ${d.color}30`, color: d.color }
                    }
                  >
                    <CategoryIcon name={d.name} size={13} />
                  </span>

                  <span className="min-w-0 pl-2 @[17rem]/legend:pl-0">
                    <span
                      className={`block text-sm font-medium truncate transition-colors ${
                        isHidden ? "text-text-muted line-through" : "text-text-dim group-hover:text-fg"
                      }`}
                    >
                      {d.name}
                    </span>
                    {/* Barra da fatia: mesma escala para todas as linhas */}
                    <span className="mt-1.5 block h-1 rounded-full bg-fg/5 overflow-hidden">
                      <span
                        className="block h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${share * 100}%`, backgroundColor: d.color }}
                      />
                    </span>
                  </span>

                  <span className="text-right">
                    <span className={`block font-mono-value text-sm tabular-nums transition-colors ${isHidden ? "text-text-muted" : "text-fg"}`}>
                      {formatCurrency(d.total)}
                    </span>
                    <span className="mt-0.5 flex items-center justify-end gap-1.5 font-mono-value text-[10px] text-text-muted tabular-nums">
                      {isHidden ? "oculta" : `${(share * 100).toFixed(1).replace(".", ",")}%`}
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
                    className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-blue hover:bg-blue/10 transition-colors cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {extra > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            aria-expanded={showAll}
            className="mt-1.5 self-start px-2 py-1 rounded-md text-xs font-medium text-blue hover:bg-blue/10 transition-colors cursor-pointer"
          >
            {showAll ? "Mostrar menos" : `Ver todas (+${extra})`}
          </button>
        )}
      </div>
    </div>
  );
}
