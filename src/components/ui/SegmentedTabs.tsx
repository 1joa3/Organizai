"use client";

import { useLayoutEffect, useRef } from "react";

export interface TabOption<T extends string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
  /** Cor da aba quando escolhida (variável CSS, ex. "var(--coral)") */
  tone?: string;
}

interface SegmentedTabsProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Ocupa a largura toda, com as abas divididas por igual */
  full?: boolean;
  className?: string;
  /** Classes de cada aba (tamanho do texto etc.) */
  tabClassName?: string;
}

/**
 * Abas com a pílula que desliza até a escolhida ("Tabs sliding", da
 * transitions.dev — CSS em app/transitions.css). A pílula mede a aba e vai
 * até ela com transform + width.
 */
export default function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  full = false,
  className = "",
  tabClassName = "text-xs font-medium",
}: SegmentedTabsProps<T>) {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  useLayoutEffect(() => {
    const bar = barRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;
    const move = (animate: boolean) => {
      const tab = bar.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!tab) {
        pill.style.opacity = "0";
        return;
      }
      if (!animate) {
        const prev = pill.style.transition;
        pill.style.transition = "none";
        pill.style.transform = `translateX(${tab.offsetLeft}px)`;
        pill.style.width = `${tab.offsetWidth}px`;
        void pill.offsetWidth;
        pill.style.transition = prev;
      } else {
        pill.style.transform = `translateX(${tab.offsetLeft}px)`;
        pill.style.width = `${tab.offsetWidth}px`;
      }
      // A altura acompanha a aba (o CSS original fixa 30px)
      pill.style.top = `${tab.offsetTop}px`;
      pill.style.height = `${tab.offsetHeight}px`;
      pill.style.opacity = "1";
      const tone = options.find((o) => o.value === value)?.tone;
      pill.style.background = tone ? `color-mix(in srgb, ${tone} 16%, transparent)` : "";
    };
    move(placed.current);
    placed.current = true;
    // Mudou o tamanho (fonte carregou, tela girou): reposiciona sem animar
    const observer = new ResizeObserver(() => move(false));
    observer.observe(bar);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options.length]);

  return (
    <div
      ref={barRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`t-tabs ${full ? "flex! w-full" : ""} ${className}`}
    >
      <span ref={pillRef} className="t-tabs-pill" aria-hidden="true" />
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={opt.value === value}
          disabled={opt.disabled}
          onClick={() => onChange(opt.value)}
          className={`t-tab ${full ? "flex-1" : ""} ${tabClassName}`}
          style={opt.tone && opt.value === value ? { color: opt.tone } : undefined}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
