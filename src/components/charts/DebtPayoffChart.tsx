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

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface TimelinePoint {
  label: string;
  remaining: number;
}

interface DebtPayoffChartProps {
  timeline: TimelinePoint[];
}

export default function DebtPayoffChart({ timeline }: DebtPayoffChartProps) {
  if (timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm border border-dashed border-white/10 rounded-lg">
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
        backgroundColor: "rgba(251, 191, 36, 0.5)",
        hoverBackgroundColor: "#FBBF24",
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
          color: "#52525B",
          font: { family: "'Inter', sans-serif", size: 11 },
        },
        border: { display: false },
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.05)", drawBorder: false },
        ticks: {
          color: "#A1A1AA",
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
        backgroundColor: "rgba(20, 20, 25, 0.9)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        titleColor: "#FFFFFF",
        bodyColor: "#F8F9FA",
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
