"use client";

import { useEffect, useState } from "react";
import { applyTheme, getEffectiveTheme, subscribeToTheme, type Theme } from "@/lib/theme";

const SunIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

/** Tema efetivo atual; `null` até montar no navegador (o servidor não sabe o tema do sistema). */
export function useTheme(): [Theme | null, () => void] {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const update = () => setTheme(getEffectiveTheme());
    update();
    return subscribeToTheme(update);
  }, []);

  const toggle = () => applyTheme(getEffectiveTheme() === "dark" ? "light" : "dark");
  return [theme, toggle];
}

/** Ícone do tema para o qual o botão vai trocar. */
export function ThemeIcon({ theme }: { theme: Theme | null }) {
  return theme === "light" ? MoonIcon : SunIcon;
}

export function themeToggleLabel(theme: Theme | null) {
  return theme === "light" ? "Modo escuro" : "Modo claro";
}
