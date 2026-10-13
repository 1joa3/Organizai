"use client";

import { useEffect, useState } from "react";
import { subscribeToTheme } from "@/lib/theme";

const TOKENS = ["text", "text-dim", "text-muted", "fg", "bg", "border", "tooltip-bg", "blue", "amber"] as const;
type Token = (typeof TOKENS)[number];
export type ThemeColors = Record<Token, string>;

// Valores do tema escuro, usados no primeiro render (antes de ler o CSS)
const DEFAULT_COLORS: ThemeColors = {
  text: "#F8F9FA",
  "text-dim": "#A1A1AA",
  "text-muted": "#52525B",
  fg: "#FFFFFF",
  bg: "#030303",
  border: "rgba(255, 255, 255, 0.08)",
  "tooltip-bg": "rgba(20, 20, 25, 0.9)",
  blue: "#00E5FF",
  amber: "#FFB800",
};

function readColors(): ThemeColors {
  const style = getComputedStyle(document.documentElement);
  const colors = { ...DEFAULT_COLORS };
  for (const token of TOKENS) {
    const value = style.getPropertyValue(`--${token}`).trim();
    if (value) colors[token] = value;
  }
  return colors;
}

/**
 * Cores do tema atual para o Chart.js, que não entende variáveis CSS.
 * Re-renderiza o gráfico quando o usuário troca de tema.
 */
export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_COLORS);

  useEffect(() => {
    const update = () => setColors(readColors());
    update();
    return subscribeToTheme(update);
  }, []);

  return colors;
}

/** Aplica transparência a uma cor hex (#RGB ou #RRGGBB). */
export function withAlpha(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return hex;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
