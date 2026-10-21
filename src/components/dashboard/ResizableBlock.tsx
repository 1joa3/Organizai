"use client";

import { useRef, useState } from "react";
import {
  HEIGHT_STEP,
  MAX_SPAN,
  MIN_SPAN,
  SPAN_PRESETS,
  clampHeight,
  clampSpan,
  spanFromPointer,
} from "@/lib/dashboardLayout";

// Classes escritas por extenso para o Tailwind gerar todas. As larguras
// valem quando o grid (container "dash") tem ≥ 56rem, não pela tela: assim o
// menu lateral aberto não espreme os blocos.
const SPAN_CLASS: Record<number, string> = {
  3: "@4xl/dash:col-span-3",
  4: "@4xl/dash:col-span-4",
  5: "@4xl/dash:col-span-5",
  6: "@4xl/dash:col-span-6",
  7: "@4xl/dash:col-span-7",
  8: "@4xl/dash:col-span-8",
  9: "@4xl/dash:col-span-9",
  10: "@4xl/dash:col-span-10",
  11: "@4xl/dash:col-span-11",
  12: "@4xl/dash:col-span-12",
};

/** No grid médio (≥ 42rem), blocos de até 1/3 dividem a linha em dois. */
function spanClass(span: number) {
  return `col-span-12 ${span <= 4 ? "@2xl/dash:col-span-6" : ""} ${SPAN_CLASS[span]}`;
}

interface ResizableBlockProps {
  label: string;
  span: number;
  /** Altura mínima escolhida, em px; ausente = do tamanho do conteúdo */
  height?: number;
  editing: boolean;
  /** Grid largo o bastante para as larguras valerem (12 colunas) */
  wide: boolean;
  /** Durante o arraste (pré-visualização); height null = automática */
  onResize: (size: { span: number; height: number | null }) => void;
  /** Ao soltar ou escolher um atalho, com o tamanho final, para salvar */
  onResizeEnd: (size: { span: number; height: number | null }) => void;
  /** Ausente = já é o primeiro / o último */
  onMoveBefore?: () => void;
  onMoveAfter?: () => void;
  onHide: () => void;
  children: React.ReactNode;
}

const iconProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const toolButton =
  "h-7 min-w-7 px-1.5 flex items-center justify-center rounded-md text-text-dim hover:text-fg hover:bg-fg/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent";

type DragMode = "width" | "corner";

/**
 * Item do grid do Dashboard. No modo de edição mostra o contorno e uma barra
 * com o nome do bloco, setas para mudar a ordem, atalhos de largura, altura
 * automática e o botão de esconder. Duas alças:
 * - borda direita (grid largo): arrasta a largura; setas ← → no teclado;
 * - canto inferior direito: arrasta largura e altura juntas, como uma
 *   janela (no grid estreito, só a altura); setas ← → ↑ ↓ no teclado.
 * A altura é mínima: o bloco nunca corta o conteúdo, e os gráficos crescem
 * para ocupar o espaço extra.
 */
export default function ResizableBlock({
  label,
  span,
  height,
  editing,
  wide,
  onResize,
  onResizeEnd,
  onMoveBefore,
  onMoveAfter,
  onHide,
  children,
}: ResizableBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DragMode | null>(null);
  const current = { span, height: height ?? null };

  // Cada alça diz qual é pelo data-mode
  const modeOf = (el: HTMLElement) => el.dataset.mode as DragMode;

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(modeOf(e.currentTarget));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !ref.current?.parentElement || !contentRef.current) return;
    let nextSpan = span;
    if (wide) {
      const grid = ref.current.parentElement;
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
      nextSpan = spanFromPointer(e.clientX, ref.current.getBoundingClientRect().left, grid.getBoundingClientRect().width, gap);
    }
    const nextHeight =
      dragging === "corner" ? clampHeight(e.clientY - contentRef.current.getBoundingClientRect().top) : current.height;
    if (nextSpan !== span || nextHeight !== current.height) onResize({ span: nextSpan, height: nextHeight });
  }

  function handlePointerUp() {
    if (!dragging) return;
    setDragging(null);
    onResizeEnd(current);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const horizontal = wide && (e.key === "ArrowLeft" || e.key === "ArrowRight");
    const vertical = modeOf(e.currentTarget) === "corner" && (e.key === "ArrowUp" || e.key === "ArrowDown");
    if (!horizontal && !vertical) return;
    e.preventDefault();
    const next = { ...current };
    if (horizontal) next.span = clampSpan(span + (e.key === "ArrowRight" ? 1 : -1));
    if (vertical) {
      // Sem altura escolhida, parte da altura atual do conteúdo
      const base = current.height ?? contentRef.current?.getBoundingClientRect().height ?? 0;
      next.height = clampHeight(base + (e.key === "ArrowDown" ? 2 : -2) * HEIGHT_STEP);
    }
    onResize(next);
    onResizeEnd(next);
  }

  const handleEvents = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
    onKeyDown: handleKeyDown,
  };

  return (
    <div
      ref={ref}
      // Na edição, a barra ganha uma faixa própria acima do conteúdo
      className={`relative ${spanClass(span)} transition-[grid-column,padding] duration-200 ${editing ? "pt-12" : ""}`}
    >
      <div
        ref={contentRef}
        style={height ? { minHeight: height } : undefined}
        className={`@container h-full transition-opacity duration-200 ${
          editing ? "pointer-events-none select-none opacity-50" : ""
        }`}
        aria-hidden={editing || undefined}
      >
        {children}
      </div>

      {editing && (
        <>
          <div
            className={`absolute inset-0 rounded-xl border-2 border-dashed pointer-events-none transition-colors ${
              dragging ? "border-blue bg-blue/5" : "border-fg/20"
            }`}
          />

          {/* Barra de edição */}
          <div
            role="toolbar"
            aria-label={`Ajustar ${label}`}
            className="absolute top-1.5 inset-x-1.5 z-10 flex items-center gap-1 p-1 rounded-lg bg-panel border border-fg/15 shadow-[0_8px_24px_-8px_var(--shadow)]"
          >
            <span className="px-1.5 text-xs font-medium text-fg truncate min-w-0 flex-1">{label}</span>

            <button type="button" onClick={onMoveBefore} disabled={!onMoveBefore} aria-label={`Mover ${label} para antes`} title="Mover para antes" className={toolButton}>
              <svg {...iconProps}>{wide ? <path d="M15 18l-6-6 6-6" /> : <path d="M18 15l-6-6-6 6" />}</svg>
            </button>
            <button type="button" onClick={onMoveAfter} disabled={!onMoveAfter} aria-label={`Mover ${label} para depois`} title="Mover para depois" className={toolButton}>
              <svg {...iconProps}>{wide ? <path d="M9 18l6-6-6-6" /> : <path d="M6 9l6 6 6-6" />}</svg>
            </button>

            {wide && (
              // Lista em vez de botões: cabe na barra até dos blocos de ¼
              <label className="relative ml-0.5 pl-1 border-l border-fg/10 flex items-center" title="Largura do bloco">
                <span className="sr-only">Largura de {label}</span>
                <select
                  value={span}
                  onChange={(e) => onResizeEnd({ ...current, span: Number(e.target.value) })}
                  className="h-7 appearance-none rounded-md bg-transparent pl-2 pr-6 font-mono-value text-[11px] text-text-dim hover:text-fg hover:bg-fg/10 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-blue"
                >
                  {Array.from({ length: MAX_SPAN - MIN_SPAN + 1 }, (_, i) => MIN_SPAN + i).map((n) => {
                    const preset = SPAN_PRESETS.find((p) => p.span === n);
                    return (
                      <option key={n} value={n} className="bg-panel text-fg">
                        {preset ? preset.label : `${n}/${MAX_SPAN}`}
                      </option>
                    );
                  })}
                </select>
                <svg width="10" height="10" viewBox="0 0 12 8" fill="none" className="absolute right-1.5 pointer-events-none text-text-muted">
                  <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </label>
            )}

            <button
              type="button"
              onClick={() => onResizeEnd({ ...current, height: null })}
              disabled={!height}
              aria-label={`Altura automática para ${label}`}
              title={height ? "Voltar à altura automática" : "Altura automática (arraste o canto para mudar)"}
              className={`${toolButton} ml-0.5 pl-1 border-l border-fg/10 rounded-l-none`}
            >
              <svg {...iconProps}>
                <path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" />
              </svg>
            </button>

            <button type="button" onClick={onHide} aria-label={`Esconder ${label}`} title="Esconder bloco" className={`${toolButton} hover:!text-coral hover:!bg-coral/10 ml-0.5`}>
              <svg {...iconProps}>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M1 1l22 22" />
              </svg>
            </button>
          </div>

          {wide && (
            <div
              role="slider"
              tabIndex={0}
              aria-label={`Largura de ${label}`}
              aria-valuemin={MIN_SPAN}
              aria-valuemax={MAX_SPAN}
              aria-valuenow={span}
              aria-valuetext={`${span} de ${MAX_SPAN} colunas`}
              data-mode="width"
              {...handleEvents}
              className="group absolute top-12 bottom-8 -right-3 w-6 flex items-center justify-center cursor-ew-resize touch-none z-10 focus:outline-none"
            >
              <span
                className={`h-12 w-1.5 rounded-full transition-all duration-200 group-hover:h-16 group-hover:bg-blue group-focus-visible:bg-blue group-focus-visible:h-16 ${
                  dragging === "width" ? "h-16 bg-blue" : "bg-fg/40"
                }`}
              />
            </div>
          )}

          {/* Canto: largura e altura juntas */}
          <div
            role="slider"
            tabIndex={0}
            aria-label={`Tamanho de ${label}${wide ? " (setas mudam largura e altura)" : " (setas ↑ ↓ mudam a altura)"}`}
            aria-valuenow={height ?? 0}
            aria-valuetext={`${wide ? `${span} de ${MAX_SPAN} colunas, ` : ""}${height ? `${height}px de altura` : "altura automática"}`}
            data-mode="corner"
            {...handleEvents}
            className={`group absolute -bottom-2 -right-2 w-7 h-7 flex items-center justify-center rounded-md border bg-panel touch-none z-20 focus:outline-none focus-visible:border-blue ${
              wide ? "cursor-nwse-resize" : "cursor-ns-resize"
            } ${dragging === "corner" ? "border-blue text-blue" : "border-fg/20 text-text-dim hover:border-blue hover:text-blue"}`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M11 4L4 11M11 8L8 11" />
            </svg>
          </div>

          {/* Tamanho atual, perto do canto */}
          <span className="absolute bottom-2 right-8 px-1.5 py-0.5 rounded bg-panel border border-fg/15 font-mono-value text-[10px] text-blue pointer-events-none z-10">
            {wide ? `${span}/${MAX_SPAN} · ` : ""}
            {height ? `${height}px` : "auto"}
          </span>
        </>
      )}
    </div>
  );
}
