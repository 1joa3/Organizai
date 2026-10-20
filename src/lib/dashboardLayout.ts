/**
 * Layout do Dashboard: ordem dos blocos, quais estão escondidos e a largura
 * de cada um, em colunas de um grid de 12. Salvo num cookie para o servidor
 * já renderizar do jeito escolhido. Formato: os blocos na ordem, `id:largura`,
 * com `!` na frente dos escondidos — `kpis:12,!saldo:5,patrimonio:7,...`.
 * O formato antigo (só larguras, sem ordem nem `!`) continua sendo aceito.
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
  hidden: DashboardBlockId[];
}

export const MIN_SPAN = 3;
export const MAX_SPAN = 12;

/** Atalhos de largura do modo de edição */
export const SPAN_PRESETS = [
  { span: 4, label: "⅓" },
  { span: 6, label: "½" },
  { span: 8, label: "⅔" },
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
    hidden: [],
  };
}

export function clampSpan(span: number): number {
  return Math.min(MAX_SPAN, Math.max(MIN_SPAN, Math.round(span)));
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
    const [rawId, spanStr] = entry.split(":");
    const isHidden = rawId?.startsWith("!");
    const id = isHidden ? rawId.slice(1) : rawId;
    if (!id || !isBlockId(id) || order.includes(id)) continue;
    order.push(id);
    if (isHidden) hidden.push(id);
    const span = Number(spanStr);
    if (Number.isInteger(span) && span >= MIN_SPAN && span <= MAX_SPAN) layout.spans[id] = span;
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
    .map((id) => `${layout.hidden.includes(id) ? "!" : ""}${id}:${layout.spans[id]}`)
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

export function setBlockSpan(layout: DashboardLayout, id: DashboardBlockId, span: number): DashboardLayout {
  return { ...layout, spans: { ...layout.spans, [id]: clampSpan(span) } };
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
