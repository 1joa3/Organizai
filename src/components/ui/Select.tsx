"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  options: SelectOption[];
  /** Texto exibido quando nada está selecionado (valor ""). */
  placeholder?: string;
  /** Controlado: valor atual. Sem ele, o componente guarda o próprio estado (use `defaultValue`). */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Envia o valor em formulários, como um <select name> faria. */
  name?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  size?: "md" | "sm";
  className?: string;
  "aria-label"?: string;
}

const noopSubscribe = () => () => {};

const MAX_LIST_HEIGHT = 280;
const GAP = 6;

const sizeClass = {
  md: "px-4 py-3 text-sm rounded-lg",
  sm: "px-2.5 py-1.5 text-xs rounded-md",
};

const CheckIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

/**
 * Dropdown com o visual do app (a lista do <select> nativo é desenhada pelo
 * sistema e ignora o tema). A lista vai para um portal com posição fixa para
 * não ser cortada por modais ou tabelas com scroll.
 */
export default function Select({
  label,
  error,
  options,
  placeholder,
  value,
  defaultValue,
  onChange,
  name,
  required,
  disabled,
  id,
  size = "md",
  className = "",
  "aria-label": ariaLabel,
}: SelectProps) {
  const autoId = useId();
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-") || autoId;
  const listId = `${selectId}-list`;

  const [internal, setInternal] = useState(defaultValue ?? "");
  const raw = value !== undefined ? value : internal;
  // Como o <select> nativo: valor que sumiu das opções cai na primeira (ou no placeholder)
  const current = options.some((o) => o.value === raw) ? raw : placeholder !== undefined ? "" : (options[0]?.value ?? "");
  const selected = options.find((o) => o.value === current);

  const [open, setOpen] = useState(false);
  // Portal só no cliente (no servidor não existe document.body)
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: "", timer: 0 });

  function choose(next: string) {
    if (value === undefined) setInternal(next);
    if (next !== current) onChange?.(next);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function openList() {
    if (disabled || options.length === 0) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  }

  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - GAP * 2;
    const above = rect.top - GAP * 2;
    const flip = below < Math.min(MAX_LIST_HEIGHT, 160) && above > below;
    const width = Math.max(rect.width, 160);
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    setPos(
      flip
        ? { left, width, bottom: window.innerHeight - rect.top + GAP, maxHeight: Math.min(MAX_LIST_HEIGHT, above) }
        : { left, width, top: rect.bottom + GAP, maxHeight: Math.min(MAX_LIST_HEIGHT, below) }
    );
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Mantém a opção ativa visível ao navegar pelo teclado
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active, pos]);

  function findByTyping(key: string) {
    const t = typeahead.current;
    window.clearTimeout(t.timer);
    t.text += key.toLowerCase();
    t.timer = window.setTimeout(() => (t.text = ""), 600);
    const start = open ? active : options.findIndex((o) => o.value === current);
    const ordered = [...options.slice(start + 1), ...options.slice(0, start + 1)];
    const match = ordered.find((o) => o.label.toLowerCase().startsWith(t.text));
    return match ? options.indexOf(match) : -1;
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    const last = options.length - 1;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const i = findByTyping(e.key);
        if (i >= 0 && options[i].value !== current) {
          if (value === undefined) setInternal(options[i].value);
          onChange?.(options[i].value);
        }
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (active >= 0) choose(options[active].value);
        break;
      case "Escape":
        // Não deixa o Esc chegar no modal por trás
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const i = findByTyping(e.key);
          if (i >= 0) setActive(i);
        }
    }
  }

  const list = (
    <AnimatePresence>
      {open && pos && (
        <motion.ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={label ? `${selectId}-label` : undefined}
          aria-label={label ? undefined : ariaLabel ?? placeholder}
          initial={{ opacity: 0, y: pos.top !== undefined ? -4 : 4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: pos.top !== undefined ? -4 : 4, scale: 0.98 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
          className={`z-[60] overflow-y-auto overscroll-contain rounded-xl border border-fg/10 bg-panel p-1.5 shadow-[0_16px_48px_-8px_var(--shadow)] ${
            pos.top !== undefined ? "origin-top" : "origin-bottom"
          }`}
          // Mantém o foco no botão ao clicar na lista
          onMouseDown={(e) => e.preventDefault()}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === current;
            return (
              <li
                key={opt.value}
                id={`${selectId}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(opt.value)}
                onMouseMove={() => active !== i && setActive(i)}
                className={`flex items-center justify-between gap-3 rounded-lg cursor-pointer select-none transition-colors ${
                  size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
                } ${i === active ? "bg-fg/[0.07] text-fg" : "text-text-dim"} ${isSelected ? "text-fg font-medium" : ""}`}
              >
                <span className="truncate">{opt.label}</span>
                <span className={`shrink-0 text-blue ${isSelected ? "" : "invisible"}`}>{CheckIcon}</span>
              </li>
            );
          })}
        </motion.ul>
      )}
    </AnimatePresence>
  );

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          id={`${selectId}-label`}
          htmlFor={selectId}
          className="text-xs font-medium text-text-dim uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          id={selectId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && active >= 0 ? `${selectId}-opt-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-label={label ? undefined : ariaLabel ?? placeholder}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onKeyDown}
          className={`
            w-full flex items-center gap-3 text-left
            ${sizeClass[size]}
            bg-fg/5 border
            hover:border-fg/20 hover:bg-fg/10
            focus:outline-none focus-visible:border-blue focus-visible:ring-4 focus-visible:ring-blue/10
            transition-all duration-200
            cursor-pointer shadow-inner
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-fg/5 disabled:hover:border-fg/10
            ${open ? "border-blue ring-4 ring-blue/10" : "border-fg/10"}
            ${error ? "border-coral focus-visible:border-coral focus-visible:ring-coral/10" : ""}
            ${className}
          `}
        >
          <span className={`flex-1 truncate ${selected ? "text-fg" : "text-text-muted"}`}>
            {selected?.label ?? placeholder ?? ""}
          </span>
          <svg
            width={size === "sm" ? 10 : 12}
            height={size === "sm" ? 7 : 8}
            viewBox="0 0 12 8"
            fill="none"
            className={`shrink-0 text-text-dim transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {name && (
          // Input invisível: envia o valor no FormData e participa da validação `required`
          <input
            tabIndex={-1}
            aria-hidden
            name={name}
            value={current}
            required={required}
            onChange={() => {}}
            onFocus={() => buttonRef.current?.focus()}
            className="absolute inset-x-0 bottom-0 h-px opacity-0 pointer-events-none"
          />
        )}
      </div>
      {error && <span className="text-xs text-coral font-medium">{error}</span>}
      {mounted && createPortal(list, document.body)}
    </div>
  );
}
