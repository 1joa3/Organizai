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

/** Ponto da tela de onde a transição parte (o centro do botão clicado) */
export type Point = { x: number; y: number };

/** Origem da transição a partir do clique (ou do centro do botão, no teclado) */
export function originFromEvent(e: { clientX: number; clientY: number; detail: number; currentTarget: EventTarget | null }): Point | undefined {
  if (e.detail > 0) return { x: e.clientX, y: e.clientY };
  if (e.currentTarget instanceof Element) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return undefined;
}

/** Raio que cobre a tela toda a partir de (x, y) */
export function coverRadius({ x, y }: Point, width: number, height: number) {
  return Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
}

/**
 * Troca o tema com o novo se espalhando num círculo a partir de `origin`
 * (View Transitions API). Sem suporte no navegador, ou com "reduzir
 * movimento" ligado no sistema, troca na hora.
 */
export function transitionTheme(next: Theme, origin?: Point) {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (getEffectiveTheme() === next) {
    applyTheme(next);
    return;
  }
  if (!document.startViewTransition || reduce) {
    applyTheme(next);
    return;
  }

  const point = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const radius = coverRadius(point, window.innerWidth, window.innerHeight);

  // Durante a troca, sem as outras transições de cor: o círculo revela o
  // tema novo já pronto, não cores no meio do caminho
  root.dataset.themeTransition = "";
  const transition = document.startViewTransition(() => applyTheme(next));
  transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${point.x}px ${point.y}px)`,
            `circle(${radius}px at ${point.x}px ${point.y}px)`,
          ],
        },
        { duration: 600, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    })
    .catch(() => {});
  transition.finished.finally(() => delete root.dataset.themeTransition);
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
