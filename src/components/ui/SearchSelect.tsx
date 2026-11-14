"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { shake } from "@/lib/shake";

export interface SearchOption {
  value: string;
  label: string;
  /** Ícone à esquerda (ex.: o da categoria) */
  icon?: ReactNode;
  /** Cor do círculo do ícone */
  color?: string;
  /** Texto pequeno à direita (ex.: tipo da conta) */
  hint?: string;
}

interface SearchSelectProps {
  options: SearchOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Texto do campo de busca */
  searchPlaceholder?: string;
  /** Nome no formulário (campo escondido) */
  name?: string;
  required?: boolean;
  ariaLabel: string;
  /** Criar um item novo com o texto digitado; devolve o valor criado (ou null se falhou) */
  onCreate?: (label: string) => Promise<string | null>;
  /** "categoria", "conta": aparece em "Criar categoria “X”" */
  createNoun?: string;
}

/** Sem acento e em minúsculas, para a busca ignorar "ç", "ã"... */
function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

const MENU_MAX = 320;
const MENU_MIN_W = 300;
const GAP = 6;

/**
 * Campo de escolha com busca: o botão mostra o item escolhido (com ícone);
 * ao abrir, um painel com busca e a lista, que cabe 5 ou 50 itens. Se o
 * texto não existir, oferece criar ali mesmo. Teclado: ↑ ↓ Enter Esc.
 */
export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Buscar…",
  name,
  required,
  ariaLabel,
  onCreate,
  createNoun = "item",
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  const selected = options.find((o) => o.value === value);
  const q = normalize(query);
  const filtered = q ? options.filter((o) => normalize(o.label).includes(q)) : options;
  const exact = options.some((o) => normalize(o.label) === q);
  const canCreate = !!onCreate && q.length > 0 && !exact;
  // Itens navegáveis: os filtrados e, por último, o "Criar"
  const count = filtered.length + (canCreate ? 1 : 0);

  function place() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - GAP - 8;
    const above = r.top - GAP - 8;
    const openBelow = below >= Math.min(MENU_MAX, 240) || below >= above;
    const maxHeight = Math.min(MENU_MAX, openBelow ? below : above);
    // Pelo menos MENU_MIN_W de largura (o campo pode ser estreito), sem sair da tela
    const width = Math.min(Math.max(r.width, MENU_MIN_W), window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    setPos(
      openBelow
        ? { left, width, top: r.bottom + GAP, maxHeight }
        : { left, width, bottom: window.innerHeight - r.top + GAP, maxHeight }
    );
  }

  function openPanel() {
    place();
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function close(focusTrigger = true) {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus({ preventScroll: true });
  }

  function pick(v: string) {
    onChange(v);
    close();
  }

  async function create() {
    if (!onCreate || creating) return;
    setCreating(true);
    const created = await onCreate(query.trim());
    setCreating(false);
    if (created) pick(created);
  }

  // Foco na busca ao abrir e item ativo à vista
  useLayoutEffect(() => {
    if (open) searchRef.current?.focus({ preventScroll: true });
  }, [open]);
  useLayoutEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  // Fecha ao clicar fora; reposiciona ao rolar ou redimensionar
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      place();
    };
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  function onSearchKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(count - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active < filtered.length) pick(filtered[active].value);
      else if (canCreate) void create();
    } else if (e.key === "Escape") {
      // preventDefault avisa a janela (Modal) para não fechar junto
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  const iconCircle = (o: SearchOption, size = "w-7 h-7") =>
    o.icon ? (
      <span
        className={`${size} rounded-full flex items-center justify-center shrink-0`}
        style={o.color ? { backgroundColor: `${o.color}26`, color: o.color } : undefined}
        aria-hidden
      >
        {o.icon}
      </span>
    ) : null;

  const panel =
    open && pos ? (
      <div
        ref={panelRef}
        className="fixed z-[80] flex flex-col rounded-xl border border-fg/10 bg-option shadow-[0_16px_40px_-8px_var(--shadow)] overflow-hidden"
        style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
      >
        <div className="p-2 border-b border-fg/[0.06] shrink-0">
          <div className="relative">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKey}
              placeholder={searchPlaceholder}
              role="combobox"
              aria-expanded
              aria-controls={`${id}-list`}
              aria-activedescendant={count > 0 ? `${id}-${active}` : undefined}
              aria-label={`Buscar ${ariaLabel.toLowerCase()}`}
              className="w-full h-10 pl-9 pr-3 text-sm bg-fg/5 text-fg placeholder:text-text-muted rounded-lg border border-transparent focus:border-blue/60 outline-none!"
            />
          </div>
        </div>
        <ul ref={listRef} id={`${id}-list`} role="listbox" aria-label={ariaLabel} className="flex-1 overflow-y-auto overscroll-contain p-1">
          {filtered.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-${i}`}
              data-index={i}
              role="option"
              aria-selected={o.value === value}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(o.value)}
              className={`flex items-center gap-2.5 px-2.5 h-11 rounded-lg cursor-pointer text-sm ${
                i === active ? "bg-fg/[0.08]" : ""
              } ${o.value === value ? "text-fg font-medium" : "text-text-dim"}`}
            >
              {iconCircle(o)}
              <span className="flex-1 truncate">{o.label}</span>
              {o.hint && <span className="text-xs text-text-muted">{o.hint}</span>}
              {o.value === value && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue shrink-0" aria-hidden>
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </li>
          ))}
          {filtered.length === 0 && !canCreate && (
            <li className="px-3 py-6 text-center text-sm text-text-muted">Nada encontrado</li>
          )}
          {canCreate && (
            <li
              id={`${id}-${filtered.length}`}
              data-index={filtered.length}
              role="option"
              aria-selected={false}
              onPointerEnter={() => setActive(filtered.length)}
              onClick={() => void create()}
              className={`flex items-center gap-2.5 px-2.5 h-11 rounded-lg cursor-pointer text-sm text-blue ${
                active === filtered.length ? "bg-blue/10" : ""
              }`}
            >
              <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-blue/15" aria-hidden>
                {creating ? (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                )}
              </span>
              <span className="truncate">
                Criar {createNoun} “{query.trim()}”
              </span>
            </li>
          )}
        </ul>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative t-shake">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            openPanel();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selected ? `${ariaLabel}: ${selected.label}` : ariaLabel}
        className={`w-full h-[46px] flex items-center gap-2.5 pl-2 pr-3 text-sm text-left bg-fg/5 border rounded-lg transition-colors cursor-pointer ${
          open ? "border-blue ring-4 ring-blue/10" : "border-fg/10 hover:border-fg/20"
        }`}
      >
        {selected ? (
          <>
            {iconCircle(selected) ?? <span className="w-1" />}
            <span className="flex-1 truncate text-fg">{selected.label}</span>
          </>
        ) : (
          <span className="flex-1 truncate pl-2 text-text-muted">{placeholder}</span>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {/* Obrigatório: sem escolha, o envio para e o campo balança */}
      {name && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          name={name}
          value={value}
          required={required}
          onChange={() => {}}
          onInvalid={(e) => shake(e.currentTarget.parentElement)}
          className="absolute inset-x-0 bottom-0 h-px opacity-0 pointer-events-none"
        />
      )}
      {panel && createPortal(panel, document.body)}
    </div>
  );
}
