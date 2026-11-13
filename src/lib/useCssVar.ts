"use client";

import { useSyncExternalStore } from "react";

/** Assina as trocas de tema (atributo data-theme e o tema do sistema). */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

/**
 * Valor atual de uma variável CSS do tema (ex.: "--blue" → "#00E5FF"), para
 * o que não lê CSS sozinho, como desenho em canvas. `fallback` no servidor.
 */
export function useCssVar(name: string, fallback: string) {
  return useSyncExternalStore(
    subscribe,
    () => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback,
    () => fallback
  );
}
