"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";
import { formatCurrency } from "@/lib/formatters";
import { useThemeColors, withAlpha } from "./useThemeColors";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface CategoryTrendChartProps {
  /** Primeiro dia de cada mês, em ISO */
  months: string[];
  series: { categoryId: string; name: string; color: string; values: number[] }[];
  /** Categoria em destaque; as outras ficam apagadas. null = todas iguais */
  highlightId: string | null;
}

export default function CategoryTrendChart({ months, series, highlightId }: CategoryTrendChartProps) {
  const colors = useThemeColors();

  if (series.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-64 text-text-muted text-sm border border-dashed border-fg/10 rounded-lg">
        Sem despesas nos últimos meses
      </div>
    );
  }

  const chartData = {
    labels: months.map((m) => new Date(m).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })),
    datasets: series.map((s) => {
      const dimmed = highlightId !== null && s.categoryId !== highlightId;
      return {
        label: s.name,
        data: s.values,
        backgroundColor: withAlpha(s.color, dimmed ? 0.12 : 0.75),
        hoverBackgroundColor: s.color,
        borderColor: colors.bg, // separa as fatias empilhadas
        borderWidth: { top: 1, bottom: 0, left: 0, right: 0 },
        borderRadius: 3,
        borderSkipped: false,
        maxBarThickness: 36,
      };
    }),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: {
          color: colors["text-muted"],
          font: { family: "'Inter', sans-serif", size: 11 },
        },
        border: { display: false },
      },
      y: {
        stacked: true,
        grid: { color: withAlpha(colors.fg, 0.05) },
        ticks: {
          color: colors["text-dim"],
          font: { family: "'JetBrains Mono', monospace", size: 11 },
          callback: function (value: number | string) {
            const num = typeof value === "string" ? parseFloat(value) : value;
            if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
            return value;
          },
        },
        border: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: colors["tooltip-bg"],
        borderColor: colors.border,
        borderWidth: 1,
        titleColor: colors.fg,
        bodyColor: colors.text,
        titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: 600 as const },
        bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
        padding: 12,
        cornerRadius: 8,
        boxPadding: 4,
        // Só as categorias com gasto no mês, e só a destacada quando houver uma
        filter: (item: { parsed: { y: number | null }; datasetIndex: number }) =>
          (item.parsed.y ?? 0) > 0 && (highlightId === null || series[item.datasetIndex].categoryId === highlightId),
        callbacks: {
          label: function (context: { dataset: { label?: string }; parsed: { y: number | null } }) {
            return ` ${context.dataset.label}: ${formatCurrency(context.parsed.y ?? 0)}`;
          },
        },
      },
    },
  };

  return (
    // Altura mínima de sempre; cresce junto quando o bloco fica mais alto
    <div className="relative h-full min-h-64 w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}
