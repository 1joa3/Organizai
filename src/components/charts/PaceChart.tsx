"use client";

import { useState } from "react";
import type { Pace } from "@/lib/dashboardStory";
import { formatCurrency } from "@/lib/formatters";
import { parseISODate } from "@/lib/period";

interface PaceChartProps {
  pace: Pace;
  /** Primeiro dia do período ("2026-11-01"), para dar nome aos dias */
  rangeStart: string;
  currentLabel: string;
  previousLabel: string;
}

const W = 100;
const H = 40;

function dayDate(start: string, index: number) {
  const d = parseISODate(start) ?? new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + index);
}

const shortDate = (d: Date) => d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");

/**
 * Gasto acumulado do período (linha forte) contra o período anterior (linha
 * fraca), dia a dia. No período em andamento a linha vai até hoje e segue
 * tracejada até a projeção do fim do período.
 */
export default function PaceChart({ pace, rangeStart, currentLabel, previousLabel }: PaceChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const { days, elapsed, ongoing, current, previous, projection } = pace;
  const lastActual = ongoing ? elapsed : days;
  const end = projection ?? current[days - 1] ?? 0;

  const max = Math.max(1, ...current, ...previous.slice(0, days), end) * 1.08;
  const x = (i: number) => (days <= 1 ? W / 2 : (i / (days - 1)) * W);
  const y = (v: number) => H - (v / max) * H;
  const path = (values: number[]) => values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join("");

  const actual = current.slice(0, Math.max(lastActual, 1));
  const area = `${path(actual)}L${x(actual.length - 1).toFixed(2)},${H}L0,${H}Z`;
  const todayIndex = ongoing ? elapsed - 1 : null;

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHover(Math.round(ratio * (days - 1)));
  }

  const hoverIsFuture = hover !== null && ongoing && hover >= elapsed;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs text-text-dim">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full bg-blue" />
          {currentLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full bg-fg/30" />
          {previousLabel}
        </span>
        {projection !== null && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 border-t-2 border-dashed border-blue/60" />
            Projeção
          </span>
        )}
      </div>

      <div
        className="relative h-28 touch-pan-y"
        onPointerMove={onPointerMove}
        onPointerDown={onPointerMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Gasto acumulado: ${currentLabel} ${formatCurrency(pace.spentToDate)}, ${previousLabel} ${formatCurrency(pace.previousToDate)} no mesmo ponto`}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
          <defs>
            <linearGradient id="pace-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" x2={W} y1={H} y2={H} stroke="var(--fg)" strokeOpacity="0.1" vectorEffect="non-scaling-stroke" />
          {previous.length > 0 && (
            <path
              d={path(previous.slice(0, days))}
              fill="none"
              stroke="var(--fg)"
              strokeOpacity="0.3"
              strokeWidth="1.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path d={area} fill="url(#pace-fill)" />
          <path
            d={path(actual)}
            fill="none"
            stroke="var(--blue)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {todayIndex !== null && (
            <path
              d={`M${x(todayIndex).toFixed(2)},${y(current[todayIndex]).toFixed(2)}L${x(days - 1).toFixed(2)},${y(end).toFixed(2)}`}
              fill="none"
              stroke="var(--blue)"
              strokeOpacity="0.6"
              strokeWidth="2"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1="0"
              y2={H}
              stroke="var(--fg)"
              strokeOpacity="0.2"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* Pontos em HTML para não esticarem com o SVG */}
        {todayIndex !== null && (
          <span
            className="absolute w-2.5 h-2.5 -ml-[5px] -mt-[5px] rounded-full bg-blue ring-2 ring-bg pointer-events-none"
            style={{ left: `${x(todayIndex)}%`, top: `${(y(current[todayIndex]) / H) * 100}%` }}
          />
        )}
        {hover !== null && !hoverIsFuture && (
          <span
            className="absolute w-2 h-2 -ml-1 -mt-1 rounded-full bg-blue ring-2 ring-bg pointer-events-none"
            style={{ left: `${x(hover)}%`, top: `${(y(current[hover]) / H) * 100}%` }}
          />
        )}

        {hover !== null && (
          <div
            className="absolute bottom-full mb-2 z-10 px-3 py-2 rounded-lg border border-fg/10 text-xs whitespace-nowrap pointer-events-none shadow-[0_8px_24px_-8px_var(--shadow)]"
            style={{
              left: `${x(hover)}%`,
              transform: `translateX(${hover < days / 3 ? "0" : hover > (days * 2) / 3 ? "-100%" : "-50%"})`,
              background: "var(--tooltip-bg)",
            }}
          >
            <p className="text-text-dim mb-1">{shortDate(dayDate(rangeStart, hover))}</p>
            <p className="flex justify-between gap-4 text-fg">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue" />
                {hoverIsFuture ? "Lançado" : currentLabel}
              </span>
              <span className="font-mono-value">{formatCurrency(current[hover])}</span>
            </p>
            {hover < previous.length && (
              <p className="flex justify-between gap-4 text-fg mt-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-fg/30" />
                  {previousLabel}
                </span>
                <span className="font-mono-value">{formatCurrency(previous[hover])}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="relative h-4 mt-2 text-[11px] text-text-muted font-mono-value">
        <span className="absolute left-0">{shortDate(dayDate(rangeStart, 0))}</span>
        {todayIndex !== null && todayIndex > days * 0.15 && todayIndex < days * 0.85 && (
          <span className="absolute -translate-x-1/2 text-blue" style={{ left: `${x(todayIndex)}%` }}>
            hoje
          </span>
        )}
        <span className="absolute right-0">{shortDate(dayDate(rangeStart, days - 1))}</span>
      </div>
    </div>
  );
}
