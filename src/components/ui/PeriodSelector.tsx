"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LAST_MONTHS_OPTIONS,
  MONTH_NAMES,
  type Period,
  currentMonthPeriod,
  formatPeriod,
  isSamePeriod,
  parsePeriod,
  periodLabel,
  periodRange,
  savePeriodCookie,
  shiftPeriod,
  toISODate,
} from "@/lib/period";

interface PeriodSelectorProps {
  /** Período atual no formato de `formatPeriod` (ex: "2026-10", "last-3") */
  period: string;
}

type Tab = "month" | "year" | "custom";

const YEARS_PER_PAGE = 9;

const ChevronLeft = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronRight = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const CalendarIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const controlClass =
  "h-11 flex items-center justify-center rounded-lg border border-fg/10 bg-fg/5 text-fg hover:border-fg/20 hover:bg-fg/10 transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-fg/5 disabled:hover:border-fg/10";

function cellClass(selected: boolean, highlighted: boolean) {
  if (selected) return "bg-blue text-bg font-semibold";
  if (highlighted) return "text-blue border border-blue/40 hover:bg-fg/10";
  return "text-fg hover:bg-fg/10";
}

export default function PeriodSelector({ period: periodValue }: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  const period = parsePeriod(periodValue) ?? currentMonthPeriod();
  const today = currentMonthPeriod();
  const todayYear = new Date().getFullYear();
  const selectedYear = period.kind === "month" || period.kind === "year" ? period.year : todayYear;

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("month");
  const [viewYear, setViewYear] = useState(selectedYear);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  function openPopover() {
    const range = periodRange(period);
    const lastDay = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate() - 1);
    setTab(period.kind === "year" ? "year" : period.kind === "custom" ? "custom" : "month");
    setViewYear(selectedYear);
    setCustomFrom(toISODate(range.start));
    setCustomTo(toISODate(lastDay));
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function navigate(next: Period) {
    const value = formatPeriod(next);
    savePeriodCookie(next);
    setOpen(false);
    startTransition(() => router.push(`${pathname}?period=${value}`));
  }

  const prev = shiftPeriod(period, -1);
  const next = shiftPeriod(period, 1);
  const customValid = customFrom !== "" && customTo !== "" && customFrom <= customTo;

  // Página de anos que contém viewYear, terminando no ano seguinte ao atual
  const lastYearOfPage = todayYear + 1 - Math.floor((todayYear + 1 - viewYear) / YEARS_PER_PAGE) * YEARS_PER_PAGE;
  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => lastYearOfPage - YEARS_PER_PAGE + 1 + i);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => prev && navigate(prev)}
          disabled={!prev || isPending}
          aria-label={period.kind === "year" ? "Ano anterior" : "Mês anterior"}
          className={`${controlClass} w-11`}
        >
          {ChevronLeft}
        </button>

        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openPopover())}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={`${controlClass} gap-2.5 px-4 min-w-[200px] text-sm font-medium ${isPending ? "opacity-60" : ""}`}
        >
          <span className="text-text-dim">{CalendarIcon}</span>
          <span className="flex-1 text-left whitespace-nowrap">{periodLabel(period)}</span>
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" className={`text-text-dim transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => next && navigate(next)}
          disabled={!next || isPending}
          aria-label={period.kind === "year" ? "Próximo ano" : "Próximo mês"}
          className={`${controlClass} w-11`}
        >
          {ChevronRight}
        </button>

        {!isSamePeriod(period, today) && (
          <button
            type="button"
            onClick={() => navigate(today)}
            disabled={isPending}
            className="hidden sm:flex h-11 px-3 items-center text-xs font-medium text-blue hover:bg-blue/10 rounded-lg transition-colors cursor-pointer"
          >
            Mês atual
          </button>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Escolher período"
          className="absolute left-0 top-full mt-2 z-40 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-fg/10 bg-panel p-4 shadow-[0_16px_48px_-8px_var(--shadow)] space-y-4"
        >
          {/* Atalhos relativos */}
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-text-dim uppercase tracking-wider">Últimos</p>
            <div className="grid grid-cols-3 gap-2">
              {LAST_MONTHS_OPTIONS.map((months) => {
                const option: Period = { kind: "last", months };
                const selected = isSamePeriod(period, option);
                return (
                  <button
                    key={months}
                    type="button"
                    onClick={() => navigate(option)}
                    className={`py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                      selected ? "bg-blue text-bg border-blue" : "border-fg/10 text-text-dim hover:text-fg hover:bg-fg/5"
                    }`}
                  >
                    {months} meses
                  </button>
                );
              })}
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-1 p-1 bg-fg/5 rounded-lg border border-fg/10">
            {([
              ["month", "Mês"],
              ["year", "Ano"],
              ["custom", "Personalizado"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  tab === value ? "bg-fg/10 text-fg" : "text-text-muted hover:text-fg"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "month" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setViewYear(viewYear - 1)} aria-label="Ano anterior" className="w-8 h-8 flex items-center justify-center rounded-lg text-text-dim hover:text-fg hover:bg-fg/10 cursor-pointer">
                  {ChevronLeft}
                </button>
                <span className="font-mono-value text-sm text-fg">{viewYear}</span>
                <button type="button" onClick={() => setViewYear(viewYear + 1)} aria-label="Próximo ano" className="w-8 h-8 flex items-center justify-center rounded-lg text-text-dim hover:text-fg hover:bg-fg/10 cursor-pointer">
                  {ChevronRight}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MONTH_NAMES.map((name, i) => {
                  const option: Period = { kind: "month", year: viewYear, month: i + 1 };
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => navigate(option)}
                      className={`py-2 rounded-lg text-sm transition-colors cursor-pointer ${cellClass(isSamePeriod(period, option), isSamePeriod(today, option))}`}
                    >
                      {name.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "year" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setViewYear(viewYear - YEARS_PER_PAGE)} aria-label="Anos anteriores" className="w-8 h-8 flex items-center justify-center rounded-lg text-text-dim hover:text-fg hover:bg-fg/10 cursor-pointer">
                  {ChevronLeft}
                </button>
                <span className="font-mono-value text-sm text-fg">
                  {years[0]} – {years[years.length - 1]}
                </span>
                <button type="button" onClick={() => setViewYear(viewYear + YEARS_PER_PAGE)} aria-label="Próximos anos" className="w-8 h-8 flex items-center justify-center rounded-lg text-text-dim hover:text-fg hover:bg-fg/10 cursor-pointer">
                  {ChevronRight}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {years.map((year) => {
                  const option: Period = { kind: "year", year };
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => navigate(option)}
                      className={`py-2 rounded-lg text-sm font-mono-value transition-colors cursor-pointer ${cellClass(isSamePeriod(period, option), year === todayYear)}`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "custom" && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (customValid) navigate({ kind: "custom", from: customFrom, to: customTo });
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-medium text-text-dim uppercase tracking-wider">De</span>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full px-2.5 py-2 text-sm bg-fg/5 text-fg border border-fg/10 rounded-lg focus:border-blue focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-medium text-text-dim uppercase tracking-wider">Até</span>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom || undefined}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full px-2.5 py-2 text-sm bg-fg/5 text-fg border border-fg/10 rounded-lg focus:border-blue focus:outline-none"
                  />
                </label>
              </div>
              {customFrom && customTo && !customValid && (
                <p className="text-xs text-coral">A data inicial precisa ser antes da final.</p>
              )}
              <button
                type="submit"
                disabled={!customValid}
                className="w-full py-2 rounded-lg text-sm font-medium bg-fg text-bg hover:bg-fg/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Aplicar período
              </button>
            </form>
          )}

          {!isSamePeriod(period, today) && (
            <button
              type="button"
              onClick={() => navigate(today)}
              className="sm:hidden w-full py-2 rounded-lg text-xs font-medium text-blue hover:bg-blue/10 transition-colors cursor-pointer"
            >
              Voltar para o mês atual
            </button>
          )}
        </div>
      )}
    </div>
  );
}
