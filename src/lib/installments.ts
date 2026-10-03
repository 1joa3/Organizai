/** Detecta se uma descrição é de uma parcela, ex: "Notebook (3/10)". */
export function parseInstallmentDescription(description: string) {
  const match = description.match(/^(.*)\s\((\d+)\/(\d+)\)$/);
  if (!match) return null;
  return { baseName: match[1], current: parseInt(match[2]), total: parseInt(match[3]) };
}

export function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
