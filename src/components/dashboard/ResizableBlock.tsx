"use client";

import { useRef, useState } from "react";
import { MAX_SPAN, MIN_SPAN, SPAN_PRESETS, clampSpan, spanFromPointer } from "@/lib/dashboardLayout";

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
  editing: boolean;
  /** Grid largo o bastante para as larguras valerem (12 colunas) */
  wide: boolean;
  /** Chamado durante o arraste (pré-visualização) */
  onResize: (span: number) => void;
  /** Chamado ao soltar ou ao escolher um atalho, com a largura final, para salvar */
  onResizeEnd: (span: number) => void;
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

/**
 * Item do grid do Dashboard. No modo de edição mostra o contorno e uma barra
 * com o nome do bloco, setas para mudar a ordem, atalhos de largura e o botão
 * de esconder. Com o grid largo, uma alça na borda direita também muda a
 * largura arrastando (ou pelas setas ← → do teclado).
 */
export default function ResizableBlock({
  label,
  span,
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
  const [dragging, setDragging] = useState(false);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !ref.current?.parentElement) return;
    const grid = ref.current.parentElement;
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const next = spanFromPointer(
      e.clientX,
      ref.current.getBoundingClientRect().left,
      grid.getBoundingClientRect().width,
      gap
    );
    if (next !== span) onResize(next);
  }

  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    onResizeEnd(span);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = clampSpan(span + (e.key === "ArrowRight" ? 1 : -1));
    if (next !== span) {
      onResize(next);
      onResizeEnd(next);
    }
  }

  return (
    <div
      ref={ref}
      // Na edição, a barra ganha uma faixa própria acima do conteúdo
      className={`relative ${spanClass(span)} transition-[grid-column,padding] duration-200 ${editing ? "pt-12" : ""}`}
    >
      <div
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
            className="absolute top-1.5 inset-x-1.5 z-10 flex flex-wrap items-center gap-1 p-1 rounded-lg bg-panel border border-fg/15 shadow-[0_8px_24px_-8px_var(--shadow)]"
          >
            <span className="px-1.5 text-xs font-medium text-fg truncate min-w-0 flex-1">{label}</span>

            <button type="button" onClick={onMoveBefore} disabled={!onMoveBefore} aria-label={`Mover ${label} para antes`} title="Mover para antes" className={toolButton}>
              <svg {...iconProps}>{wide ? <path d="M15 18l-6-6 6-6" /> : <path d="M18 15l-6-6-6 6" />}</svg>
            </button>
            <button type="button" onClick={onMoveAfter} disabled={!onMoveAfter} aria-label={`Mover ${label} para depois`} title="Mover para depois" className={toolButton}>
              <svg {...iconProps}>{wide ? <path d="M9 18l6-6-6-6" /> : <path d="M6 9l6 6 6-6" />}</svg>
            </button>

            {wide && (
              <div className="flex items-center gap-0.5 pl-1 ml-0.5 border-l border-fg/10" role="group" aria-label="Largura">
                {SPAN_PRESETS.map((p) => (
                  <button
                    key={p.span}
                    type="button"
                    onClick={() => onResizeEnd(p.span)}
                    aria-pressed={span === p.span}
                    title={`Largura: ${p.label === "Inteiro" ? "linha inteira" : p.label}`}
                    className={`${toolButton} text-[11px] font-medium ${span === p.span ? "!bg-blue !text-bg" : ""}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

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
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onKeyDown={handleKeyDown}
              className="group absolute top-0 -right-3 h-full w-6 flex items-center justify-center cursor-ew-resize touch-none z-10 focus:outline-none"
            >
              <span
                className={`h-12 w-1.5 rounded-full transition-all duration-200 group-hover:h-16 group-hover:bg-blue group-focus-visible:bg-blue group-focus-visible:h-16 ${
                  dragging ? "h-16 bg-blue" : "bg-fg/40"
                }`}
              />
              <span className="absolute bottom-3 right-4 px-1.5 py-0.5 rounded bg-panel border border-fg/15 font-mono-value text-[10px] text-blue pointer-events-none">
                {span}/{MAX_SPAN}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
