"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  type ScriptableContext,
} from "chart.js";
import { formatCurrency } from "@/lib/formatters";
import { useThemeColors, withAlpha } from "./useThemeColors";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

interface PatrimonyData {
  label: string;
  saldo: number;
  investido: number;
}

interface LinePatrimonyProps {
  data: PatrimonyData[];
}

export default function LinePatrimony({ data }: LinePatrimonyProps) {
  const colors = useThemeColors();

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-64 text-text-muted text-sm border border-dashed border-fg/10 rounded-lg">
        Sem dados para exibir
      </div>
    );
  }

  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: "Saldo Acumulado",
        data: data.map((d) => d.saldo),
        borderColor: colors.blue,
        backgroundColor: (context: ScriptableContext<"line">) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, withAlpha(colors.blue, 0.2));
          gradient.addColorStop(1, withAlpha(colors.blue, 0));
          return gradient;
        },
        fill: true,
        tension: 0.4, // Smoother curves
        pointRadius: 0, // Hide points until hover
        pointHoverRadius: 6,
        pointBackgroundColor: colors.blue,
        pointBorderColor: colors.bg,
        pointBorderWidth: 2,
        borderWidth: 2,
      },
      {
        label: "Investido",
        data: data.map((d) => d.investido),
        borderColor: colors.amber,
        backgroundColor: "transparent",
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: colors.amber,
        pointBorderColor: colors.bg,
        pointBorderWidth: 2,
        borderWidth: 2,
        borderDash: [5, 5],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    scales: {
      x: {
        grid: { color: withAlpha(colors.fg, 0.05), drawBorder: false },
        ticks: {
          color: colors["text-muted"],
          font: { family: "'Inter', sans-serif", size: 11 },
          padding: 10,
        },
        border: { display: false },
      },
      y: {
        grid: { color: withAlpha(colors.fg, 0.05), drawBorder: false },
        ticks: {
          color: colors["text-dim"],
          font: { family: "'JetBrains Mono', monospace", size: 11 },
          padding: 10,
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
      legend: {
        display: true,
        position: "top" as const,
        align: "end" as const,
        labels: {
          color: colors["text-dim"],
          font: { family: "'Inter', sans-serif", size: 12, weight: 500 as const },
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          padding: 20,
        },
      },
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
        usePointStyle: true,
        callbacks: {
          label: function (context: { dataset: { label?: string }; parsed: { y: number | null } }) {
            const label = context.dataset.label || "";
            const value = context.parsed.y;
            return ` ${label}: ${formatCurrency(value ?? 0)}`;
          },
        },
      },
    },
  };

  return (
    // Altura mínima de sempre; cresce junto quando o bloco fica mais alto
    <div className="relative h-full min-h-64 w-full">
      <Line data={chartData} options={options} />
    </div>
  );
}
