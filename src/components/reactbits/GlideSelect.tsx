'use client';

/*
 * GlideSelect — React Bits (https://reactbits.dev), de David Haz.
 * Licença MIT + Commons Clause: uso livre como parte do app; não pode ser
 * vendido/redistribuído como componente avulso. Copyright (c) 2026 David Haz.
 * Adaptado para os formulários do app:
 * - o menu abre num portal com posição fixa (não é cortado por janelas com
 *   rolagem) e rola quando há muitas opções;
 * - escolher é por clique/toque na opção (o "arrastar para escolher" do
 *   original impedia rolar a lista no celular);
 * - ícones em SVG próprio (sem @hugeicons) e cores nas variáveis do tema;
 * - o botão aceita classes para ficar com a cara dos outros campos;
 * - abrir/fechar nos tempos e escalas do "Menu dropdown" da transitions.dev.
 */

import React, { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface GlideSelectOption {
  value: string;
  label: ReactNode;
  tag?: string;
}

export interface GlideSelectProps {
  options: (string | GlideSelectOption)[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, option: GlideSelectOption) => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Largura mínima do menu (o padrão é a do botão) */
  menuWidth?: number;
  /** Altura máxima do menu antes de rolar */
  menuMaxHeight?: number;
  placement?: 'top' | 'bottom';
  align?: 'left' | 'right';
  popDuration?: number;
  glideDuration?: number;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
  className?: string;
  /** Classes do botão (substituem a aparência padrão) */
  triggerClassName?: string;
  invalid?: boolean;
}

type Phase = 'closed' | 'open' | 'closing';

const SIZES: Record<string, { row: number; font: number }> = {
  sm: { row: 28, font: 12 },
  md: { row: 34, font: 13 },
  lg: { row: 40, font: 14 }
};
const GAP = 1;
const MENU_GAP = 6;
const STYLE = '@keyframes gs-swap{from{opacity:.6;filter:blur(2px)}}';

const norm = (o: string | GlideSelectOption): GlideSelectOption => (typeof o === 'string' ? { value: o, label: o } : o);
const textOf = (it: GlideSelectOption) => (typeof it.label === 'string' ? it.label : it.value);
const typeaheadIndex = (items: GlideSelectOption[], from: number, ch: string) => {
  const c = ch.toLowerCase();
  const n = items.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (textOf(items[i]).toLowerCase().startsWith(c)) return i;
  }
  return from;
};

const Chevron = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const Tick = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

const DEFAULT_TRIGGER =
  'inline-flex items-center gap-1.5 px-2.5 rounded-md bg-fg/5 text-fg hover:bg-fg/10 aria-expanded:bg-fg/10';

const GlideSelect: React.FC<GlideSelectProps> = ({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Selecione',
  size = 'md',
  menuWidth = 0,
  menuMaxHeight = 280,
  placement = 'bottom',
  align = 'left',
  popDuration = 250,
  glideDuration = 220,
  disabled = false,
  ariaLabel,
  id: idProp,
  className = '',
  triggerClassName,
  invalid = false
}) => {
  const items = options.map(norm);
  const [inner, setInner] = useState(defaultValue ?? '');
  const current = value ?? inner;
  const selected = items.findIndex(it => it.value === current);
  const [phase, setPhase] = useState<Phase>('closed');
  const [active, setActive] = useState<number | null>(null);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number; side: 'top' | 'bottom' } | null>(
    null
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const instant = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoId = useId();
  const id = idProp ?? autoId;
  const S = SIZES[size] ?? SIZES.md;
  const step = S.row + GAP;
  // Fecha mais rápido do que abre ("Menu dropdown" da transitions.dev: 250ms / 150ms)
  const popOut = Math.round(popDuration * 0.6);

  // Posição do menu: abaixo do botão, ou acima quando não cabe
  const place = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const height = Math.min(menuMaxHeight, items.length * step + 8);
    const below = window.innerHeight - r.bottom;
    const side: 'top' | 'bottom' =
      placement === 'bottom'
        ? below < height + MENU_GAP && r.top > below
          ? 'top'
          : 'bottom'
        : r.top < height + MENU_GAP && below > r.top
          ? 'bottom'
          : 'top';
    const width = Math.max(r.width, menuWidth);
    const left = Math.min(Math.max(8, align === 'left' ? r.left : r.right - width), window.innerWidth - width - 8);
    setPos(
      side === 'bottom'
        ? { left, top: r.bottom + MENU_GAP, width, side }
        : { left, bottom: window.innerHeight - r.top + MENU_GAP, width, side }
    );
  };

  useLayoutEffect(() => {
    if (phase !== 'open') return;
    const el = menuRef.current;
    if (!el) return;
    el.style.transitionDuration = instant.current ? '0ms' : '';
    el.dataset.state = 'closed';
    void el.offsetHeight;
    el.dataset.state = 'open';
    const p = pillRef.current;
    if (p) {
      p.style.transition = 'none';
      p.style.transform = `translateY(${Math.max(0, selected) * step}px)`;
      p.style.opacity = '0';
      void p.offsetHeight;
      p.style.transition = '';
    }
    // Opção escolhida visível ao abrir
    const list = listRef.current;
    if (list && selected >= 0) list.scrollTop = Math.max(0, selected * step - list.clientHeight / 2 + step / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pos === null]);

  useLayoutEffect(() => {
    const p = pillRef.current;
    if (!p || phase !== 'open') return;
    if (active === null) {
      p.style.opacity = '0';
      return;
    }
    const jump = instant.current || p.style.opacity !== '1';
    p.style.transitionDuration = jump ? '0ms, 150ms' : '';
    p.style.transform = `translateY(${active * step}px)`;
    p.style.opacity = '1';
    instant.current = false;
    // Navegando pelo teclado, mantém a opção ativa à vista
    const list = listRef.current;
    if (list) {
      const top = active * step;
      if (top < list.scrollTop) list.scrollTop = top;
      else if (top + step > list.scrollTop + list.clientHeight) list.scrollTop = top + step - list.clientHeight + 8;
    }
  }, [active, phase, step]);

  const open = (viaKey: boolean) => {
    if (disabled) return;
    clearTimeout(closeTimer.current);
    instant.current = true;
    place();
    setActive(selected >= 0 ? selected : viaKey ? 0 : null);
    setPhase('open');
  };
  const close = (mode: 'instant' | 'pop') => {
    setActive(null);
    clearTimeout(closeTimer.current);
    const el = menuRef.current;
    if (mode === 'instant' || !el) {
      setPhase('closed');
      return;
    }
    el.style.transitionDuration = '';
    el.dataset.state = 'closed';
    setPhase('closing');
    closeTimer.current = setTimeout(() => setPhase('closed'), popOut + 20);
  };
  const pick = (i: number, viaKey: boolean) => {
    const it = items[i];
    if (!it) {
      close('instant');
      return;
    }
    if (it.value !== current) {
      if (value === undefined) setInner(it.value);
      onChange?.(it.value, it);
      if (!viaKey && rootRef.current) rootRef.current.dataset.swap = '';
    }
    close('pop');
    triggerRef.current?.focus({ preventScroll: true });
  };

  const onTriggerKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const k = e.key;
    const n = items.length;
    const cur = active ?? Math.max(0, selected);
    if (phase !== 'open') {
      if (k === 'Enter' || k === ' ' || k === 'ArrowDown' || k === 'ArrowUp') {
        e.preventDefault();
        open(true);
      }
      return;
    }
    const go = (i: number) => {
      e.preventDefault();
      instant.current = true;
      setActive(Math.min(n - 1, Math.max(0, i)));
    };
    if (k === 'ArrowDown' || k === 'ArrowUp') go(active === null ? cur : cur + (k === 'ArrowDown' ? 1 : -1));
    else if (k === 'Home' || k === 'End') go(k === 'Home' ? 0 : n - 1);
    else if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      pick(cur, true);
    } else if (k === 'Escape' || k === 'Tab') {
      // preventDefault avisa a janela (Modal) para não fechar junto
      if (k === 'Escape') e.preventDefault();
      close('instant');
    } else if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) go(typeaheadIndex(items, cur, k));
  };

  useEffect(() => {
    if (phase === 'closed') return undefined;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close('pop');
    };
    // Rolar a página (fora do menu) ou mudar o tamanho da tela reposiciona
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      place();
    };
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', place);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  useEffect(() => {
    if (disabled && phase !== 'closed') close('instant');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const onListOver = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-index]');
    if (!row) return;
    const i = Number(row.dataset.index);
    if (i !== active) setActive(i);
  };

  const origin = `${pos?.side === 'top' ? 'bottom' : 'top'} ${align}`;
  const vars = {
    '--gs-row': `${S.row}px`,
    '--gs-font': `${S.font}px`,
    '--gs-pop': `${popDuration}ms`,
    '--gs-pop-out': `${popOut}ms`,
    '--gs-glide': `${glideDuration}ms`,
    '--gs-origin': origin
  } as CSSProperties;

  const menu =
    phase !== 'closed' && pos ? (
      <div
        ref={menuRef}
        className="fixed z-[80] scale-[0.97] p-1 opacity-0 rounded-xl border border-fg/10 bg-option shadow-[0_16px_40px_-8px_var(--shadow)] [transform-origin:var(--gs-origin)] [transition:opacity_var(--gs-pop)_cubic-bezier(0.23,1,0.32,1),transform_var(--gs-pop)_cubic-bezier(0.23,1,0.32,1)] data-[state=open]:scale-100 data-[state=open]:opacity-100 data-[state=closed]:pointer-events-none data-[state=closed]:[transition-duration:var(--gs-pop-out)] motion-reduce:[transform:none]! motion-reduce:[transition:opacity_var(--gs-pop)_ease]"
        style={{ ...vars, left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width }}
        data-state="open"
      >
        <div
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={ariaLabel}
          className="group/list relative grid gap-px overflow-y-auto overscroll-contain"
          style={{ maxHeight: menuMaxHeight - 8 }}
          data-live={active !== null ? '' : undefined}
          onPointerOver={onListOver}
          onPointerLeave={() => setActive(null)}
        >
          <span
            ref={pillRef}
            className="pointer-events-none absolute top-0 right-0 left-0 opacity-0 h-[var(--gs-row)] rounded-lg bg-fg/10 [transition:transform_var(--gs-glide)_cubic-bezier(0.23,1,0.32,1),opacity_150ms_ease] motion-reduce:[transition:opacity_150ms_ease]"
            aria-hidden="true"
          />
          {items.map((it, i) => (
            <div
              key={it.value}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === selected}
              data-index={i}
              onClick={() => pick(i, false)}
              className="relative z-[1] flex cursor-pointer items-center gap-2 pr-2 pl-2.5 select-none [-webkit-tap-highlight-color:transparent] h-[var(--gs-row)] rounded-lg text-fg text-[length:var(--gs-font)] [transition:background-color_150ms_ease] aria-selected:bg-fg/[0.06] group-data-[live]/list:aria-selected:bg-transparent"
            >
              <span className="min-w-0 flex-1 truncate">{it.label}</span>
              {it.tag ? <span className="shrink-0 text-text-muted text-[11px]">{it.tag}</span> : null}
              <span
                className="inline-flex shrink-0 invisible text-blue data-[on]:visible"
                data-on={i === selected ? '' : undefined}
                aria-hidden="true"
              >
                <Tick />
              </span>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div
      ref={rootRef}
      className={`group relative data-[disabled]:opacity-50 ${className}`}
      data-disabled={disabled ? '' : undefined}
      style={vars}
      onAnimationEnd={e => {
        if (e.animationName === 'gs-swap' && rootRef.current) delete rootRef.current.dataset.swap;
      }}
    >
      <style>{STYLE}</style>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={phase === 'open'}
        aria-controls={`${id}-list`}
        aria-activedescendant={active !== null ? `${id}-${active}` : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className={`group/trigger relative w-full cursor-pointer touch-manipulation text-left select-none outline-none [-webkit-tap-highlight-color:transparent] [transition:background-color_100ms_ease,border-color_150ms_ease,transform_160ms_cubic-bezier(0.23,1,0.32,1)] disabled:cursor-default enabled:active:scale-[0.99] motion-reduce:enabled:active:scale-100 ${triggerClassName ?? DEFAULT_TRIGGER}`}
        onPointerDown={e => {
          if (e.button !== 0 || disabled) return;
          e.preventDefault();
          e.currentTarget.focus({ preventScroll: true });
          if (phase === 'open') close('pop');
          else open(false);
        }}
        onKeyDown={onTriggerKey}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            className="min-w-0 flex-1 truncate data-[empty]:text-text-muted group-data-[swap]:animate-[gs-swap_160ms_ease] motion-reduce:group-data-[swap]:animate-none"
            key={current}
            data-empty={selected < 0 ? '' : undefined}
          >
            {selected >= 0 ? items[selected].label : placeholder}
          </span>
          <span
            className="inline-flex shrink-0 text-text-muted [transition:transform_200ms_cubic-bezier(0.23,1,0.32,1)] group-aria-expanded/trigger:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          >
            <Chevron />
          </span>
        </span>
      </button>
      {menu && createPortal(menu, document.body)}
    </div>
  );
};

export default GlideSelect;
