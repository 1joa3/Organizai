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
} from "chart.js";
import { formatCurrency } from "@/lib/formatters";

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
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted text-sm border border-dashed border-white/10 rounded-lg">
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
        borderColor: "#00E5FF", // Neon Cyan
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(0, 229, 255, 0.2)");
          gradient.addColorStop(1, "rgba(0, 229, 255, 0)");
          return gradient;
        },
        fill: true,
        tension: 0.4, // Smoother curves
        pointRadius: 0, // Hide points until hover
        pointHoverRadius: 6,
        pointBackgroundColor: "#00E5FF",
        pointBorderColor: "#FFFFFF",
        pointBorderWidth: 2,
        borderWidth: 2,
      },
      {
        label: "Investido",
        data: data.map((d) => d.investido),
        borderColor: "#FFB800", // Vibrant Gold
        backgroundColor: "transparent",
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: "#FFB800",
        pointBorderColor: "#FFFFFF",
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
        grid: { color: "rgba(255, 255, 255, 0.05)", drawBorder: false },
        ticks: {
          color: "#52525B",
          font: { family: "'Inter', sans-serif", size: 11 },
          padding: 10,
        },
        border: { display: false },
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.05)", drawBorder: false },
        ticks: {
          color: "#A1A1AA",
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
          color: "#A1A1AA",
          font: { family: "'Inter', sans-serif", size: 12, weight: 500 as const },
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          padding: 20,
        },
      },
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
    <div className="h-64 w-full">
      <Line data={chartData} options={options} />
    </div>
  );
}
