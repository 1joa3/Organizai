"use client";

import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { formatCurrency } from "@/lib/formatters";
import { useThemeColors } from "./useThemeColors";

ChartJS.register(ArcElement, Tooltip, Legend);

interface CategoryData {
  name: string;
  color: string;
  total: number;
}

interface DonutCategoriesProps {
  data: CategoryData[];
}

export default function DonutCategories({ data }: DonutCategoriesProps) {
  const colors = useThemeColors();

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
        data: data.map((d) => d.total),
        backgroundColor: glowColors,
        borderColor: colors.bg, // mesma cor do fundo, para criar os espaços
        borderWidth: 4,
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

  const total = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="flex flex-col xl:flex-row items-center gap-8 h-full">
      <div className="w-48 h-48 relative shrink-0">
        <Doughnut data={chartData} options={options} />
        {/* Centro do donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase tracking-widest text-text-muted font-medium mb-1">Total</span>
          <span className="font-mono-value text-lg text-fg drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Legenda customizada */}
      <div className="flex flex-col gap-3 flex-1 w-full max-h-48 overflow-y-auto pr-2 custom-scrollbar">
        {data.map((d) => {
          const percentage = ((d.total / total) * 100).toFixed(1);
          return (
            <div key={d.name} className="group">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${d.color}15`, border: `1px solid ${d.color}30`, color: d.color }}
                  >
                    <CategoryIcon name={d.name} size={11} />
                  </span>
                  <span className="text-sm font-medium text-text-dim group-hover:text-fg transition-colors truncate">{d.name}</span>
                </div>
                <span className="font-mono-value text-[10px] text-text-muted shrink-0">
                  {percentage}%
                </span>
              </div>
              <span className="font-mono-value text-sm text-fg block mt-0.5 pl-5">
                {formatCurrency(d.total)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
