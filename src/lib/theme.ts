/**
 * Tema escolhido pelo usuário, salvo em cookie para o servidor já renderizar
 * o <html data-theme> certo (sem "piscar" o tema errado ao carregar).
 * Sem cookie, o CSS segue o tema do sistema (prefers-color-scheme).
 */
export type Theme = "light" | "dark";

export const THEME_COOKIE = "theme";

export function parseThemeCookie(value: string | undefined): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

/** Tema efetivo no navegador: a escolha salva ou, sem ela, o do sistema. */
export function getEffectiveTheme(): Theme {
  const chosen = parseThemeCookie(document.documentElement.dataset.theme);
  if (chosen) return chosen;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/** Chama `callback` sempre que o tema efetivo puder ter mudado. Retorna o cleanup. */
export function subscribeToTheme(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = window.matchMedia("(prefers-color-scheme: light)");
  media.addEventListener("change", callback);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", callback);
  };
}
