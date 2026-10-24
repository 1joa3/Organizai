/**
 * Layout do Dashboard: ordem dos blocos, quais estão escondidos, a largura
 * de cada um (em colunas de um grid de 12) e a altura, quando escolhida.
 * Salvo num cookie para o servidor já renderizar do jeito escolhido.
 * Formato: os blocos na ordem, `id:largura` ou `id:largura:altura`, com `!`
 * na frente dos escondidos — `kpis:12,!saldo:5,patrimonio:7:420,...`.
 * Os formatos antigos (sem ordem, sem `!`, sem altura) continuam aceitos.
 *
 * As larguras valem quando a área do Dashboard é larga (12 colunas). Mais
 * estreita, os blocos pequenos dividem a linha em dois e o resto ocupa a
 * largura toda; no celular, tudo um embaixo do outro.
 */
export const DASHBOARD_LAYOUT_COOKIE = "dash_layout";

export const DASHBOARD_BLOCKS = [
  { id: "kpis", label: "Indicadores", defaultSpan: 12 },
  { id: "saldo", label: "Saldo", defaultSpan: 5 },
  { id: "patrimonio", label: "Evolução Patrimonial", defaultSpan: 7 },
  { id: "dividas", label: "Quitação de Dívidas", defaultSpan: 12 },
  { id: "categorias", label: "Despesas por Categoria", defaultSpan: 4 },
  { id: "parceladas", label: "Despesas Parceladas", defaultSpan: 4 },
  { id: "metas", label: "Metas", defaultSpan: 4 },
  { id: "recentes", label: "Transações Recentes", defaultSpan: 4 },
] as const;

export type DashboardBlockId = (typeof DASHBOARD_BLOCKS)[number]["id"];

export interface DashboardLayout {
  /** Todos os blocos, na ordem de exibição (inclusive os escondidos) */
  order: DashboardBlockId[];
  spans: Record<DashboardBlockId, number>;
  /** Altura mínima em px; ausente = do tamanho do conteúdo */
  heights: Partial<Record<DashboardBlockId, number>>;
  hidden: DashboardBlockId[];
}

export const MIN_SPAN = 3;
export const MAX_SPAN = 12;

/** Altura escolhida: de 120 a 1200px, em passos de 10px */
export const MIN_HEIGHT = 120;
export const MAX_HEIGHT = 1200;
export const HEIGHT_STEP = 10;

/** Atalhos de largura do modo de edição */
export const SPAN_PRESETS = [
  { span: 3, label: "¼" },
  { span: 4, label: "⅓" },
  { span: 6, label: "½" },
  { span: 8, label: "⅔" },
  { span: 9, label: "¾" },
  { span: 12, label: "Inteiro" },
] as const;

const BLOCK_IDS = DASHBOARD_BLOCKS.map((b) => b.id) as DashboardBlockId[];

function isBlockId(id: string): id is DashboardBlockId {
  return (BLOCK_IDS as string[]).includes(id);
}

export function blockLabel(id: DashboardBlockId): string {
  return DASHBOARD_BLOCKS.find((b) => b.id === id)!.label;
}

export function defaultLayout(): DashboardLayout {
  return {
    order: [...BLOCK_IDS],
    spans: Object.fromEntries(DASHBOARD_BLOCKS.map((b) => [b.id, b.defaultSpan])) as DashboardLayout["spans"],
    heights: {},
    hidden: [],
  };
}

export function clampSpan(span: number): number {
  return Math.min(MAX_SPAN, Math.max(MIN_SPAN, Math.round(span)));
}

export function clampHeight(height: number): number {
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(height / HEIGHT_STEP) * HEIGHT_STEP));
}

/**
 * Lê o cookie. Entradas inválidas ou repetidas são ignoradas; blocos que não
 * aparecem (cookie antigo, ou bloco novo no app) entram na posição padrão,
 * logo depois do bloco que os antecede na ordem padrão.
 */
export function parseLayout(value: string | undefined): DashboardLayout {
  const layout = defaultLayout();
  if (!value) return layout;

  const order: DashboardBlockId[] = [];
  const hidden: DashboardBlockId[] = [];
  for (const entry of value.split(",")) {
    const [rawId, spanStr, heightStr] = entry.split(":");
    const isHidden = rawId?.startsWith("!");
    const id = isHidden ? rawId.slice(1) : rawId;
    if (!id || !isBlockId(id) || order.includes(id)) continue;
    order.push(id);
    if (isHidden) hidden.push(id);
    const span = Number(spanStr);
    if (Number.isInteger(span) && span >= MIN_SPAN && span <= MAX_SPAN) layout.spans[id] = span;
    const height = Number(heightStr);
    if (heightStr && Number.isInteger(height) && height >= MIN_HEIGHT && height <= MAX_HEIGHT) {
      layout.heights[id] = height;
    }
  }

  BLOCK_IDS.forEach((id, defaultIndex) => {
    if (order.includes(id)) return;
    const before = BLOCK_IDS.slice(0, defaultIndex).reverse().find((prev) => order.includes(prev));
    order.splice(before ? order.indexOf(before) + 1 : 0, 0, id);
  });

  return { ...layout, order, hidden };
}

export function formatLayout(layout: DashboardLayout): string {
  return layout.order
    .map((id) => {
      const height = layout.heights[id];
      return `${layout.hidden.includes(id) ? "!" : ""}${id}:${layout.spans[id]}${height ? `:${height}` : ""}`;
    })
    .join(",");
}

export function isDefaultLayout(layout: DashboardLayout): boolean {
  return formatLayout(layout) === formatLayout(defaultLayout());
}

/** Blocos visíveis, na ordem */
export function visibleBlocks(layout: DashboardLayout): DashboardBlockId[] {
  return layout.order.filter((id) => !layout.hidden.includes(id));
}

/**
 * Troca o bloco de lugar com o vizinho visível anterior (delta -1) ou
 * seguinte (+1). Escondidos no meio do caminho não contam como vizinhos.
 */
export function moveBlock(layout: DashboardLayout, id: DashboardBlockId, delta: -1 | 1): DashboardLayout {
  const visible = visibleBlocks(layout);
  const neighbor = visible[visible.indexOf(id) + delta];
  if (!neighbor) return layout;
  const order = [...layout.order];
  const a = order.indexOf(id);
  const b = order.indexOf(neighbor);
  [order[a], order[b]] = [order[b], order[a]];
  return { ...layout, order };
}

export type DropPosition = "before" | "after";

/**
 * Arrastar e soltar: tira o bloco do lugar e o põe antes ou depois do bloco
 * alvo. Soltar sobre si mesmo (ou num lugar que não muda nada) não altera.
 */
export function moveBlockTo(
  layout: DashboardLayout,
  id: DashboardBlockId,
  targetId: DashboardBlockId,
  position: DropPosition
): DashboardLayout {
  if (id === targetId) return layout;
  const order = layout.order.filter((b) => b !== id);
  const at = order.indexOf(targetId);
  if (at === -1) return layout;
  order.splice(position === "before" ? at : at + 1, 0, id);
  return order.every((b, i) => b === layout.order[i]) ? layout : { ...layout, order };
}

/**
 * Em que lado do bloco alvo o arrastado vai cair: blocos que dividem a linha
 * com outros usam a metade esquerda/direita; os que ocupam a linha toda, a
 * metade de cima/baixo.
 */
export function dropPosition(
  pointer: { x: number; y: number },
  rect: { left: number; top: number; width: number; height: number },
  horizontal: boolean
): DropPosition {
  const before = horizontal ? pointer.x < rect.left + rect.width / 2 : pointer.y < rect.top + rect.height / 2;
  return before ? "before" : "after";
}

export function setBlockSpan(layout: DashboardLayout, id: DashboardBlockId, span: number): DashboardLayout {
  return { ...layout, spans: { ...layout.spans, [id]: clampSpan(span) } };
}

/** Altura do bloco; null volta para o tamanho do conteúdo */
export function setBlockHeight(layout: DashboardLayout, id: DashboardBlockId, height: number | null): DashboardLayout {
  const heights = { ...layout.heights };
  if (height === null) delete heights[id];
  else heights[id] = clampHeight(height);
  return { ...layout, heights };
}

export function setBlockHidden(layout: DashboardLayout, id: DashboardBlockId, hide: boolean): DashboardLayout {
  const hidden = layout.hidden.filter((h) => h !== id);
  return { ...layout, hidden: hide ? [...hidden, id] : hidden };
}

/** Salva o layout no cookie (só no navegador). */
export function saveLayoutCookie(layout: DashboardLayout) {
  document.cookie = `${DASHBOARD_LAYOUT_COOKIE}=${formatLayout(layout)}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Converte a posição do ponteiro em largura do bloco: quantas colunas
 * cabem entre a borda esquerda do bloco e o ponteiro, arredondando para a
 * coluna mais próxima.
 */
export function spanFromPointer(pointerX: number, blockLeft: number, gridWidth: number, gap: number): number {
  const columnWidth = (gridWidth - gap * (MAX_SPAN - 1)) / MAX_SPAN;
  return clampSpan((pointerX - blockLeft + gap) / (columnWidth + gap));
}
