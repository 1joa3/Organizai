"use client";

import GlideSelect from "@/components/reactbits/GlideSelect";
import { useEffect, useRef, useState } from "react";
import {
  HEIGHT_STEP,
  MAX_SPAN,
  MIN_SPAN,
  SPAN_PRESETS,
  clampHeight,
  clampSpan,
  spanFromPointer,
  type DropPosition,
} from "@/lib/dashboardLayout";

// Classes escritas por extenso para o Tailwind gerar todas. As larguras
// valem quando o grid (container "dash") tem ≥ 56rem, não pela tela: assim o
// menu lateral aberto não espreme os blocos.
const SPAN_CLASS: Record<number, string> = {
  4: "@4xl/dash:col-span-4",
  5: "@4xl/dash:col-span-5",
  6: "@4xl/dash:col-span-6",
  7: "@4xl/dash:col-span-7",
  8: "@4xl/dash:col-span-8",
  9: "@4xl/dash:col-span-9",
  10: "@4xl/dash:col-span-10",
  11: "@4xl/dash:col-span-11",
  12: "@4xl/dash:col-span-12",
  13: "@4xl/dash:col-span-13",
  14: "@4xl/dash:col-span-14",
  15: "@4xl/dash:col-span-15",
  16: "@4xl/dash:col-span-16",
  17: "@4xl/dash:col-span-17",
  18: "@4xl/dash:col-span-18",
  19: "@4xl/dash:col-span-19",
  20: "@4xl/dash:col-span-20",
  21: "@4xl/dash:col-span-21",
  22: "@4xl/dash:col-span-22",
  23: "@4xl/dash:col-span-23",
  24: "@4xl/dash:col-span-24",
};

/** No grid médio (≥ 42rem), blocos de até 1/3 dividem a linha em dois. */
function spanClass(span: number) {
  return `col-span-24 ${span <= 8 ? "@2xl/dash:col-span-12" : ""} ${SPAN_CLASS[span]}`;
}

/** Largura como o usuário entende: fração conhecida ou porcentagem da linha. */
function spanLabel(span: number) {
  return SPAN_PRESETS.find((p) => p.span === span)?.label ?? `${Math.round((span / MAX_SPAN) * 100)}%`;
}

interface ResizableBlockProps {
  /** Vai no data-block-id, para o Dashboard achar o bloco sob o ponteiro */
  blockId: string;
  label: string;
  span: number;
  /** Altura escolhida, em px (o que não couber rola); ausente = do tamanho do conteúdo */
  height?: number;
  editing: boolean;
  /** Grid largo o bastante para as larguras valerem (12 colunas) */
  wide: boolean;
  /**
   * Grid em linhas finas (DASH_ROW px): cada bloco ocupa quantas linhas
   * precisar para a própria altura, sem esticar os vizinhos. Falso até o
   * navegador assumir (na renderização do servidor, o grid é o comum).
   */
  masonry: boolean;
  /** Durante o arraste (pré-visualização); height null = automática */
  onResize: (size: { span: number; height: number | null }) => void;
  /** Ao soltar ou escolher um atalho, com o tamanho final, para salvar */
  onResizeEnd: (size: { span: number; height: number | null }) => void;
  /** Ausente = já é o primeiro / o último */
  onMoveBefore?: () => void;
  onMoveAfter?: () => void;
  onHide: () => void;
  /** Arrastar e soltar para reordenar (coordenadas do ponteiro na tela) */
  onReorderStart: (pointer: { x: number; y: number }) => void;
  onReorderMove: (pointer: { x: number; y: number }) => void;
  /** drop false = cancelado (Esc) */
  onReorderEnd: (drop: boolean) => void;
  /** "dragging" = este é o bloco arrastado; before/after = vai cair ao lado deste */
  reorder: "dragging" | DropPosition | null;
  /** Lado em que o indicador de soltar aparece: esquerda/direita ou cima/baixo */
  dropAxis: "horizontal" | "vertical";
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

/** Altura de cada linha do grid do Dashboard no modo masonry, em px */
export const DASH_ROW = 4;

/**
 * Item do grid do Dashboard. No modo de edição mostra o contorno e uma barra
 * com uma alça para arrastar o bloco a outra posição, o nome, setas para
 * mudar a ordem, atalhos de largura, altura
 * automática e o botão de esconder. Duas alças:
 * - borda direita (grid largo): arrasta a largura; setas ← → no teclado;
 * - canto inferior direito: arrasta largura e altura juntas, como uma
 *   janela (no grid estreito, só a altura); setas ← → ↑ ↓ no teclado.
 * Com altura escolhida, o bloco fica exatamente dela: os gráficos crescem ou
 * encolhem para caber, e o que ainda não couber rola dentro do cartão.
 */
export default function ResizableBlock({
  blockId,
  label,
  span,
  height,
  editing,
  wide,
  masonry,
  onResize,
  onResizeEnd,
  onMoveBefore,
  onMoveAfter,
  onHide,
  onReorderStart,
  onReorderMove,
  onReorderEnd,
  reorder,
  dropAxis,
  children,
}: ResizableBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DragMode | null>(null);
  const [rows, setRows] = useState<number | null>(null);

  // Mede a altura real do bloco e ocupa as linhas do grid que ela pede,
  // mais o espaço entre blocos (o grid não tem gap vertical nesse modo).
  useEffect(() => {
    const el = ref.current;
    if (!masonry || !el?.parentElement) return;
    const grid = el.parentElement;
    const observer = new ResizeObserver(() => {
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
      setRows(Math.ceil((el.offsetHeight + gap) / DASH_ROW));
    });
    // border-box: a faixa da barra de edição é padding e também conta
    observer.observe(el, { box: "border-box" });
    return () => observer.disconnect();
  }, [masonry]);
  const current = { span, height: height ?? null };

  // Cada alça diz qual é pelo data-mode
  const modeOf = (el: HTMLElement) => el.dataset.mode as DragMode;

  // O arraste em andamento e o último tamanho vão também em refs: os eventos
  // de ponteiro podem chegar antes de o React redesenhar (arraste rápido)
  const dragRef = useRef<{ mode: DragMode; size: { span: number; height: number | null } } | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const mode = modeOf(e.currentTarget);
    dragRef.current = { mode, size: current };
    setDragging(mode);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || !ref.current?.parentElement || !contentRef.current) return;
    let nextSpan = drag.size.span;
    if (wide) {
      const grid = ref.current.parentElement;
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
      nextSpan = spanFromPointer(e.clientX, ref.current.getBoundingClientRect().left, grid.getBoundingClientRect().width, gap);
    }
    const nextHeight =
      drag.mode === "corner" ? clampHeight(e.clientY - contentRef.current.getBoundingClientRect().top) : drag.size.height;
    if (nextSpan !== drag.size.span || nextHeight !== drag.size.height) {
      drag.size = { span: nextSpan, height: nextHeight };
      onResize(drag.size);
    }
  }

  function handlePointerUp() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setDragging(null);
    onResizeEnd(drag.size);
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

  // A alça de arrastar captura o ponteiro: o Dashboard acompanha onde ele
  // está e decide onde o bloco cai.
  const reorderEvents = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.focus();
      onReorderStart({ x: e.clientX, y: e.clientY });
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (reorder === "dragging") onReorderMove({ x: e.clientX, y: e.clientY });
    },
    onPointerUp: () => {
      if (reorder === "dragging") onReorderEnd(true);
    },
    onPointerCancel: () => {
      if (reorder === "dragging") onReorderEnd(false);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape" && reorder === "dragging") onReorderEnd(false);
    },
  };

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
      data-block-id={blockId}
      style={masonry && rows ? { gridRowEnd: `span ${rows}` } : undefined}
      // Na edição, a barra ganha uma faixa própria acima do conteúdo
      className={`relative ${spanClass(span)} transition-[grid-column,padding,opacity] duration-200 ${editing ? "pt-12" : ""} ${
        reorder === "dragging" ? "opacity-40" : ""
      }`}
    >
      <div
        ref={contentRef}
        // Com altura escolhida: a única linha do grid tem exatamente essa
        // altura, o cartão estica até ela e rola o que passar; os gráficos
        // perdem a altura mínima de sempre (--chart-min) para poder encolher.
        style={height ? ({ height, "--chart-min": "4rem" } as React.CSSProperties) : undefined}
        className={`@container grid transition-opacity ${
          height ? "grid-rows-[minmax(0,1fr)] [&>*]:min-h-0 [&>*]:overflow-auto" : "grid-rows-[1fr]"
        } duration-200 ${
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
              dragging || reorder === "dragging" ? "border-blue bg-blue/5" : "border-fg/20"
            }`}
          />

          {/* Onde o bloco arrastado vai cair: uma barra no vão ao lado deste */}
          {(reorder === "before" || reorder === "after") && (
            <div
              className={`absolute z-30 rounded-full bg-blue shadow-[0_0_12px_var(--blue)] pointer-events-none ${
                dropAxis === "horizontal"
                  ? `top-0 bottom-0 w-1 ${reorder === "before" ? "-left-2.5 sm:-left-3.5" : "-right-2.5 sm:-right-3.5"}`
                  : `left-0 right-0 h-1 ${reorder === "before" ? "-top-2.5 sm:-top-3.5" : "-bottom-2.5 sm:-bottom-3.5"}`
              }`}
            />
          )}

          {/* Barra de edição */}
          <div
            role="toolbar"
            aria-label={`Ajustar ${label}`}
            className="absolute top-1.5 inset-x-1.5 z-10 flex items-center gap-1 p-1 rounded-lg bg-panel border border-fg/15 shadow-[0_8px_24px_-8px_var(--shadow)]"
          >
            <div
              {...reorderEvents}
              tabIndex={-1}
              title="Arraste para mudar o bloco de lugar"
              aria-label={`Arrastar ${label} para outra posição`}
              className={`${toolButton} touch-none focus:outline-none ${
                reorder === "dragging" ? "cursor-grabbing text-blue bg-blue/10" : "cursor-grab"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="9" cy="6" r="1.6" />
                <circle cx="15" cy="6" r="1.6" />
                <circle cx="9" cy="12" r="1.6" />
                <circle cx="15" cy="12" r="1.6" />
                <circle cx="9" cy="18" r="1.6" />
                <circle cx="15" cy="18" r="1.6" />
              </svg>
            </div>
            <span className="px-1 text-xs font-medium text-fg truncate min-w-0 flex-1">{label}</span>

            <button type="button" onClick={onMoveBefore} disabled={!onMoveBefore} aria-label={`Mover ${label} para antes`} title="Mover para antes" className={toolButton}>
              <svg {...iconProps}>{wide ? <path d="M15 18l-6-6 6-6" /> : <path d="M18 15l-6-6-6 6" />}</svg>
            </button>
            <button type="button" onClick={onMoveAfter} disabled={!onMoveAfter} aria-label={`Mover ${label} para depois`} title="Mover para depois" className={toolButton}>
              <svg {...iconProps}>{wide ? <path d="M9 18l6-6-6-6" /> : <path d="M6 9l6 6 6-6" />}</svg>
            </button>

            {wide && (
              // Lista em vez de botões: cabe na barra até dos blocos de ¼
              <div className="relative ml-0.5 pl-1 border-l border-fg/10 flex items-center" title="Largura do bloco">
                <GlideSelect
                  size="sm"
                  ariaLabel={`Largura de ${label}`}
                  value={String(span)}
                  onChange={(v) => onResizeEnd({ ...current, span: Number(v) })}
                  options={Array.from({ length: MAX_SPAN - MIN_SPAN + 1 }, (_, i) => MIN_SPAN + i).map((n) => ({
                    value: String(n),
                    label: spanLabel(n),
                  }))}
                  menuWidth={96}
                  menuMaxHeight={240}
                  align="right"
                  triggerClassName="h-7 rounded-md pl-2 pr-1.5 font-mono-value text-[11px] text-text-dim hover:text-fg hover:bg-fg/10 aria-expanded:bg-fg/10 aria-expanded:text-fg focus-visible:ring-1 focus-visible:ring-blue"
                />
              </div>
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
              aria-valuetext={`${spanLabel(span)} da linha`}
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
            aria-valuetext={`${wide ? `${spanLabel(span)} da linha, ` : ""}${height ? `${height}px de altura` : "altura automática"}`}
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
            {wide ? `${spanLabel(span)} · ` : ""}
            {height ? `${height}px` : "auto"}
          </span>
        </>
      )}
    </div>
  );
}
