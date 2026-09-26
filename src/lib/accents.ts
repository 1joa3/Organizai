/**
 * Semantic accent tokens shared by Modal, ConfirmDialog and Toast.
 * Maps to the CSS custom properties in globals.css so every popup stays
 * in sync with the palette automatically if the theme ever changes.
 */
export type Accent = "emerald" | "coral" | "amber" | "blue";

export const ACCENT_VAR: Record<Accent, string> = {
  emerald: "var(--emerald)",
  coral: "var(--coral)",
  amber: "var(--amber)",
  blue: "var(--blue)",
};

export const ACCENT_CLASS: Record<
  Accent,
  { text: string; bg: string; bgSoft: string; borderSoft: string }
> = {
  emerald: { text: "text-emerald", bg: "bg-emerald", bgSoft: "bg-emerald/10", borderSoft: "border-emerald/30" },
  coral: { text: "text-coral", bg: "bg-coral", bgSoft: "bg-coral/10", borderSoft: "border-coral/30" },
  amber: { text: "text-amber", bg: "bg-amber", bgSoft: "bg-amber/10", borderSoft: "border-amber/30" },
  blue: { text: "text-blue", bg: "bg-blue", bgSoft: "bg-blue/10", borderSoft: "border-blue/30" },
};
