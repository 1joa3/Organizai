/**
 * "Error state shake" da transitions.dev (CSS em app/transitions.css): o
 * elemento balança de lado quando algo dá errado.
 */
export const SHAKE_EVENT = "app:shake";

/** Balança um elemento (precisa da classe .t-shake) */
export function shake(el: Element | null | undefined) {
  if (!el) return;
  el.classList.remove("is-shaking");
  void (el as HTMLElement).offsetWidth; // reinicia a animação se já estava balançando
  el.classList.add("is-shaking");
  el.addEventListener("animationend", () => el.classList.remove("is-shaking"), { once: true });
}

/** Pede para a janela aberta balançar (ex.: o servidor recusou o que foi enviado) */
export function requestShake() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SHAKE_EVENT));
}
