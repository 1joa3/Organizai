/** Menu lateral aberto/fechado, em cookie para o servidor já renderizar certo. */
export const SIDEBAR_COOKIE = "sidebar";

export function parseSidebarCookie(value: string | undefined): boolean {
  return value === "open";
}

export function saveSidebarCookie(expanded: boolean) {
  document.cookie = `${SIDEBAR_COOKIE}=${expanded ? "open" : "closed"}; path=/; max-age=31536000; samesite=lax`;
}
