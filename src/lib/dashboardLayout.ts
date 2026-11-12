/**
 * Layout do Dashboard: ordem dos blocos, quais estão escondidos, a largura
 * de cada um (em colunas de um grid de 24) e a altura, quando escolhida.
 * Salvo num cookie para o servidor já renderizar do jeito escolhido.
 * Formato: `3|` e os blocos na ordem, `id:largura` ou `id:largura:altura`,
 * com `!` na frente dos escondidos — `3|saldo:16,!kpis:24,patrimonio:14:420`.
 * `2|` é o formato de antes do resumo do período; sem prefixo, o de larguras
 * em 12 colunas (dobradas na leitura); os ainda mais antigos (sem ordem,
 * sem `!`, sem altura) continuam aceitos. Nos anteriores ao `3|`, o resumo
 * (que antes era só o saldo) vai para o topo no tamanho padrão.
 *
 * As larguras valem quando a área do Dashboard é larga (24 colunas). Mais
 * estreita, os blocos pequenos dividem a linha em dois e o resto ocupa a
 * largura toda; no celular, tudo um embaixo do outro.
 */
export const DASHBOARD_LAYOUT_COOKIE = "dash_layout";

export const DASHBOARD_BLOCKS = [
  { id: "saldo", label: "Resumo do Período", defaultSpan: 16 },
  { id: "insights", label: "Observações", defaultSpan: 8 },
  { id: "kpis", label: "Indicadores", defaultSpan: 24 },
  { id: "orcamento", label: "Orçamento", defaultSpan: 24 },
  { id: "patrimonio", label: "Evolução Patrimonial", defaultSpan: 14 },
  { id: "categorias", label: "Despesas por Categoria", defaultSpan: 10 },
  { id: "dividas", label: "Quitação de Dívidas", defaultSpan: 24 },
  { id: "parceladas", label: "Despesas Parceladas", defaultSpan: 8 },
  { id: "metas", label: "Metas", defaultSpan: 8 },
  { id: "recentes", label: "Transações Recentes", defaultSpan: 8 },
] as const;

export type DashboardBlockId = (typeof DASHBOARD_BLOCKS)[number]["id"];

export interface DashboardLayout {
  /** Todos os blocos, na ordem de exibição (inclusive os escondidos) */
  order: DashboardBlockId[];
  spans: Record<DashboardBlockId, number>;
  /** Altura exata em px (o que não couber rola); ausente = do tamanho do conteúdo */
  heights: Partial<Record<DashboardBlockId, number>>;
  hidden: DashboardBlockId[];
}

/** Largura: de 1/6 (4 colunas) à linha toda (24) */
export const MIN_SPAN = 4;
export const MAX_SPAN = 24;

/** Prefixo do formato atual do cookie (larguras em 24 colunas, com o resumo) */
const FORMAT_PREFIX = "3|";
/** Formato anterior: larguras em 24 colunas, saldo ainda sem o resumo */
const PREVIOUS_PREFIX = "2|";

/** Altura escolhida: de 80 a 1200px, em passos de 10px */
export const MIN_HEIGHT = 80;
export const MAX_HEIGHT = 1200;
export const HEIGHT_STEP = 10;

/** Atalhos de largura do modo de edição */
export const SPAN_PRESETS = [
  { span: 4, label: "⅙" },
  { span: 6, label: "¼" },
  { span: 8, label: "⅓" },
  { span: 12, label: "½" },
  { span: 16, label: "⅔" },
  { span: 18, label: "¾" },
  { span: 24, label: "Inteiro" },
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

  // Formato antigo: larguras em 12 colunas, que viram o dobro em 24
  const current = value.startsWith(FORMAT_PREFIX);
  const previous = value.startsWith(PREVIOUS_PREFIX);
  const spanScale = current || previous ? 1 : 2;
  const body = current || previous ? value.slice(2) : value;

  const order: DashboardBlockId[] = [];
  const hidden: DashboardBlockId[] = [];
  for (const entry of body.split(",")) {
    const [rawId, spanStr, heightStr] = entry.split(":");
    const isHidden = rawId?.startsWith("!");
    const id = isHidden ? rawId.slice(1) : rawId;
    if (!id || !isBlockId(id) || order.includes(id)) continue;
    order.push(id);
    if (isHidden) hidden.push(id);
    const span = Number(spanStr) * spanScale;
    if (Number.isInteger(span) && span >= MIN_SPAN && span <= MAX_SPAN) layout.spans[id] = span;
    const height = Number(heightStr);
    if (heightStr && Number.isInteger(height) && height >= MIN_HEIGHT && height <= MAX_HEIGHT) {
      layout.heights[id] = height;
    }
  }

  // Layout de antes do resumo: o bloco saldo virou o resumo do período, que
  // precisa de espaço — vai para o topo, visível, na largura padrão
  if (!current) {
    const at = order.indexOf("saldo");
    if (at !== -1) order.splice(at, 1);
    order.unshift("saldo");
    hidden.splice(0, hidden.length, ...hidden.filter((id) => id !== "saldo"));
    layout.spans.saldo = defaultLayout().spans.saldo;
    delete layout.heights.saldo;
  }

  BLOCK_IDS.forEach((id, defaultIndex) => {
    if (order.includes(id)) return;
    const before = BLOCK_IDS.slice(0, defaultIndex).reverse().find((prev) => order.includes(prev));
    order.splice(before ? order.indexOf(before) + 1 : 0, 0, id);
  });

  return { ...layout, order, hidden };
}

export function formatLayout(layout: DashboardLayout): string {
  return FORMAT_PREFIX + layout.order
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

/**
 * Layout salvo no cookie, lido no navegador. A página do dashboard pode vir
 * pré-carregada de antes de uma mudança de layout; lendo o cookie na hora,
 * o dashboard sempre abre com o arranjo atual. Null fora do navegador.
 */
export function readLayoutCookie(): DashboardLayout | null {
  if (typeof document === "undefined") return null;
  const prefix = `${DASHBOARD_LAYOUT_COOKIE}=`;
  const entry = document.cookie.split("; ").find((c) => c.startsWith(prefix));
  return entry ? parseLayout(entry.slice(prefix.length)) : null;
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
