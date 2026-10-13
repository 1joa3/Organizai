/**
 * Largura de cada bloco do Dashboard, em colunas de um grid de 12.
 * Salva num cookie (`saldo:5,patrimonio:7,...`) para o servidor já
 * renderizar no tamanho escolhido. Vale a partir de telas largas (lg);
 * no celular os blocos sempre ocupam a largura toda.
 */
export const DASHBOARD_LAYOUT_COOKIE = "dash_layout";

export const DASHBOARD_BLOCKS = [
  { id: "saldo", label: "Saldo", defaultSpan: 5 },
  { id: "patrimonio", label: "Evolução Patrimonial", defaultSpan: 7 },
  { id: "dividas", label: "Quitação de Dívidas", defaultSpan: 12 },
  { id: "categorias", label: "Despesas por Categoria", defaultSpan: 4 },
  { id: "parceladas", label: "Despesas Parceladas", defaultSpan: 4 },
  { id: "metas", label: "Metas", defaultSpan: 4 },
  { id: "recentes", label: "Transações Recentes", defaultSpan: 4 },
] as const;

export type DashboardBlockId = (typeof DASHBOARD_BLOCKS)[number]["id"];
export type DashboardLayout = Record<DashboardBlockId, number>;

export const MIN_SPAN = 3;
export const MAX_SPAN = 12;

export function defaultLayout(): DashboardLayout {
  return Object.fromEntries(DASHBOARD_BLOCKS.map((b) => [b.id, b.defaultSpan])) as DashboardLayout;
}

export function clampSpan(span: number): number {
  return Math.min(MAX_SPAN, Math.max(MIN_SPAN, Math.round(span)));
}

/** Lê o cookie; blocos ausentes ou com valor inválido ficam no tamanho padrão. */
export function parseLayout(value: string | undefined): DashboardLayout {
  const layout = defaultLayout();
  if (!value) return layout;
  for (const entry of value.split(",")) {
    const [id, spanStr] = entry.split(":");
    const span = Number(spanStr);
    if (id in layout && Number.isInteger(span) && span >= MIN_SPAN && span <= MAX_SPAN) {
      layout[id as DashboardBlockId] = span;
    }
  }
  return layout;
}

export function formatLayout(layout: DashboardLayout): string {
  return DASHBOARD_BLOCKS.map((b) => `${b.id}:${layout[b.id]}`).join(",");
}

export function isDefaultLayout(layout: DashboardLayout): boolean {
  return DASHBOARD_BLOCKS.every((b) => layout[b.id] === b.defaultSpan);
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
