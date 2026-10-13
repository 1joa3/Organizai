"use client";

import { useRef, useState } from "react";
import { MAX_SPAN, MIN_SPAN, clampSpan, spanFromPointer } from "@/lib/dashboardLayout";

// Classes escritas por extenso para o Tailwind gerar todas
const SPAN_CLASS: Record<number, string> = {
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  9: "lg:col-span-9",
  10: "lg:col-span-10",
  11: "lg:col-span-11",
  12: "lg:col-span-12",
};

interface ResizableBlockProps {
  label: string;
  span: number;
  editing: boolean;
  /** Chamado durante o arraste (pré-visualização) */
  onResize: (span: number) => void;
  /** Chamado ao soltar, com a largura final, para salvar */
  onResizeEnd: (span: number) => void;
  children: React.ReactNode;
}

/**
 * Item do grid do Dashboard. No modo de edição mostra o contorno, o nome e
 * a largura do bloco e uma alça na borda direita: arrastar muda quantas das
 * 12 colunas ele ocupa. A alça também responde às setas ← → do teclado.
 */
export default function ResizableBlock({ label, span, editing, onResize, onResizeEnd, children }: ResizableBlockProps) {
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
    <div ref={ref} className={`relative col-span-12 ${SPAN_CLASS[span]} transition-[grid-column] duration-200`}>
      <div className={`@container h-full transition-opacity duration-200 ${editing ? "pointer-events-none select-none opacity-80" : ""}`}>
        {children}
      </div>

      {editing && (
        <>
          <div
            className={`absolute inset-0 rounded-xl border-2 border-dashed pointer-events-none transition-colors ${
              dragging ? "border-blue bg-blue/5" : "border-fg/20"
            }`}
          />
          <div className="absolute -top-3 left-4 flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-panel border border-fg/15 text-[11px] font-medium text-text-dim pointer-events-none shadow-sm">
            {label}
            <span className="font-mono-value text-blue">
              {span}/{MAX_SPAN}
            </span>
          </div>
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
          </div>
        </>
      )}
    </div>
  );
}
