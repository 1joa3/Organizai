"use client";

import Spotlight from "@/components/reactbits/Spotlight";

/**
 * Brilho que segue o ponteiro dentro de um cartão (Spotlight, do
 * SpotlightCard do React Bits). Vai como primeiro filho de um cartão
 * `relative` com .glass-card. Na cor do texto, então serve aos dois temas.
 */
export default function CardSpotlight({ size = 320 }: { size?: number }) {
  return <Spotlight spotlightColor="var(--fg)" intensity={0.07} spotlightSize={size} borderGlow={0.45} proximity={60} />;
}
