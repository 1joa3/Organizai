"use client";

import SoftAurora from "@/components/reactbits/SoftAurora";
import { useCssVar } from "@/lib/useCssVar";

/**
 * Fundo das telas de entrada: aurora suave nas cores do app (SoftAurora do
 * React Bits). Só aqui — no resto do app não há fundo animado.
 */
export default function AuthBackground() {
  const bg = useCssVar("--bg", "#030303");
  const blue = useCssVar("--blue", "#00E5FF");
  const light = /^#(f|e)/i.test(bg);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
      <SoftAurora
        key={light ? "light" : "dark"}
        color1={light ? "#0B0B0F" : "#f7f7f7"}
        color2={blue}
        speed={0.45}
        brightness={light ? 0.9 : 0.85}
        lightMode={light}
        opacity={0.55}
        enableMouseInteraction
        clickPulse={false}
      />
    </div>
  );
}
