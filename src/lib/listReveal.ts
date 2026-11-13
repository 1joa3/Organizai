/**
 * Entrada dos itens de lista, no estilo do AnimatedList do React Bits: cada
 * item sobe e cresce um pouco quando entra na tela (não todos de uma vez
 * com atraso crescente, o que deixava listas longas aparecendo por segundos).
 */
export function listReveal(index: number) {
  return {
    initial: { opacity: 0, y: 14, scale: 0.98 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: { once: true, margin: "0px 0px -24px 0px" },
    transition: { type: "spring" as const, stiffness: 260, damping: 26, delay: Math.min(index, 8) * 0.035 },
  };
}
