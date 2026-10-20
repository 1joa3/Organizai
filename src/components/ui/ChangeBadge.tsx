/**
 * Variação de gasto contra o período anterior (0.25 = +25%). Para despesa,
 * subir é ruim (coral) e cair é bom (verde). null = não houve gasto antes.
 */
export default function ChangeBadge({ change, className = "" }: { change: number | null; className?: string }) {
  if (change === null) return <span className={`text-[10px] text-text-muted ${className}`}>novo</span>;
  const rounded = Math.round(change * 100);
  if (rounded === 0) return <span className={`font-mono-value text-[10px] text-text-muted ${className}`}>= 0%</span>;
  const up = rounded > 0;
  return (
    <span
      className={`font-mono-value text-[10px] ${up ? "text-coral" : "text-emerald"} ${className}`}
      title="Variação contra o período anterior"
    >
      {up ? "▲" : "▼"} {Math.abs(rounded)}%
    </span>
  );
}
