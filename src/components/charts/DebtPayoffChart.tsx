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

interface TimelinePoint {
  label: string;
  remaining: number;
}

interface DebtPayoffChartProps {
  timeline: TimelinePoint[];
}

export default function DebtPayoffChart({ timeline }: DebtPayoffChartProps) {
  const colors = useThemeColors();

  if (timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm border border-dashed border-fg/10 rounded-lg">
        Nenhuma dívida parcelada em aberto
      </div>
    );
  }

  const chartData = {
    labels: timeline.map((t) => t.label),
    datasets: [
      {
        label: "Saldo devedor",
        data: timeline.map((t) => t.remaining),
        backgroundColor: withAlpha(colors.amber, 0.5),
        hoverBackgroundColor: colors.amber,
        borderRadius: 4,
        maxBarThickness: 28,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: {
          color: colors["text-muted"],
          font: { family: "'Inter', sans-serif", size: 11 },
        },
        border: { display: false },
      },
      y: {
        grid: { color: withAlpha(colors.fg, 0.05), drawBorder: false },
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
        callbacks: {
          label: function (context: { parsed: { y: number | null } }) {
            return ` Saldo devedor: ${formatCurrency(context.parsed.y ?? 0)}`;
          },
        },
      },
    },
  };

  return (
    <div className="h-48 w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}
