"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme, ThemeIcon, themeToggleLabel } from "./ThemeToggle";
import { LogoMark } from "./Logo";
import Avatar from "./Avatar";
import { signOut } from "@/lib/authActions";

export interface SidebarUser {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
  user: SidebarUser;
}

const ProfileIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
  </svg>
);

const LogoutIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

const PlusIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** Abre a janela de nova transação (Transações lê o `?nova=1` e abre sozinha) */
export const NEW_TRANSACTION_HREF = "/transacoes?nova=1";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/transacoes",
    label: "Transações",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 014-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 01-4 4H3" />
      </svg>
    ),
  },
  /* {
    href: "/investimentos",
    label: "Investimentos",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
        <polyline points="16,7 22,7 22,13" />
      </svg>
    ),
  }, */
  {
    href: "/metas",
    label: "Metas",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
];

// Larguras: fechado 80px (w-20), aberto 256px (w-64). Os ícones ficam
// sempre no mesmo lugar (centralizados na faixa de 80px); ao abrir, só os
// textos aparecem com fade, sem nada pular de posição.
function labelClass(isExpanded: boolean) {
  return `whitespace-nowrap transition-opacity ${
    isExpanded ? "opacity-100 duration-300 delay-100" : "opacity-0 duration-150"
  }`;
}

export default function Sidebar({ isExpanded, onToggle, user }: SidebarProps) {
  const pathname = usePathname();
  const [theme, toggleTheme] = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!userMenuRef.current?.contains(target) && !userButtonRef.current?.contains(target)) setUserMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [userMenuOpen]);

  return (
    <aside
      className={`hidden md:block fixed left-0 top-0 h-screen z-50 bg-panel/80 backdrop-blur-3xl border-r border-fg/5 shadow-[4px_0_24px_var(--shadow)] transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isExpanded ? "w-64" : "w-20"
      }`}
    >
      <div className="h-full flex flex-col overflow-hidden">
        {/* Logo e o botão de recolher, na mesma linha. Fechado, a logo some
            e fica só o botão, no lugar dela */}
        <div className="h-20 pl-5 pr-3 flex items-center gap-3 shrink-0">
          <div className={`flex items-center gap-3 min-w-0 flex-1 ${isExpanded ? "" : "hidden"}`}>
            <LogoMark size={36} />
            <span className={`font-display text-xl tracking-tight text-fg ${labelClass(isExpanded)}`}>
              Organiz
              <span className="bg-gradient-to-br from-blue to-emerald bg-clip-text text-transparent">AI</span>
            </span>
          </div>
          <button
            onClick={onToggle}
            className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-text-muted hover:text-fg hover:bg-fg/5 transition-colors cursor-pointer ${
              isExpanded ? "" : "-ml-0.5"
            }`}
            aria-label={isExpanded ? "Recolher menu" : "Expandir menu"}
            aria-expanded={isExpanded}
            title={isExpanded ? "Recolher menu" : "Expandir menu"}
          >
            {/* Ícone de painel lateral: a faixa da esquerda cheia quando aberto */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="M9 4v16" />
              {isExpanded && <path d="M5.5 8h1M5.5 11h1" />}
            </svg>
          </button>
        </div>

        {/* Ação principal, sempre à mão */}
        <div className="px-3 pt-2 pb-4">
          <Link
            prefetch
            href={NEW_TRANSACTION_HREF}
            title={!isExpanded ? "Nova transação" : undefined}
            className="flex items-center gap-3 h-11 pl-[16px] rounded-xl bg-blue text-bg text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition-[filter,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
          >
            <span className="shrink-0">{PlusIcon}</span>
            <span className={labelClass(isExpanded)}>Nova transação</span>
          </Link>
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-3 space-y-1" aria-label="Principal">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                prefetch
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                title={!isExpanded ? item.label : undefined}
                className={`relative flex items-center gap-3 h-11 pl-[18px] rounded-xl text-sm font-medium transition-colors duration-200 group focus-visible:outline-2 focus-visible:outline-blue ${
                  isActive ? "text-fg" : "text-text-muted hover:text-fg hover:bg-fg/5"
                }`}
              >
                {/* Fundo e barra da página atual, que deslizam até o item escolhido */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-fg/[0.07] rounded-xl pointer-events-none"
                    initial={false}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  >
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-blue" />
                  </motion.div>
                )}

                <span
                  className={`relative z-10 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-active:scale-95 ${
                    isActive ? "text-blue" : ""
                  }`}
                >
                  {item.icon}
                </span>
                <span className={`relative z-10 ${labelClass(isExpanded)}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Usuário: abre o menu com perfil, tema e sair (funciona aberto ou fechado) */}
        <div className="px-3 py-4 border-t border-fg/5">
          <button
            ref={userButtonRef}
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            title={!isExpanded ? (user.name ?? user.email ?? undefined) : undefined}
            className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors duration-200 cursor-pointer hover:bg-fg/5 ${
              userMenuOpen ? "bg-fg/5" : ""
            }`}
          >
            <Avatar name={user.name} email={user.email} url={user.avatarUrl} size={40} />
            <span className={`min-w-0 flex-1 ${labelClass(isExpanded)}`}>
              <span className="block text-sm font-semibold text-fg truncate">{user.name ?? "Minha conta"}</span>
              <span className="block text-[11px] text-text-muted truncate mt-0.5">{user.email}</span>
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`shrink-0 text-text-muted transition-transform duration-200 ${labelClass(isExpanded)} ${userMenuOpen ? "rotate-180" : ""}`}
            >
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {userMenuOpen && (
          <motion.div
            ref={userMenuRef}
            role="menu"
            // "Menu dropdown" da transitions.dev: cresce do canto do botão
            // (0,97 → 1) em 250ms e fecha em 150ms
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, scale: 0.99, transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] } }}
            className="absolute bottom-6 left-full ml-3 w-60 rounded-xl border border-fg/10 bg-panel p-1.5 shadow-[0_16px_48px_-8px_var(--shadow)] z-50 origin-bottom-left"
          >
            <div className="px-3 py-2.5 border-b border-fg/5 mb-1">
              <p className="text-sm font-semibold text-fg truncate">{user.name ?? "Minha conta"}</p>
              <p className="text-xs text-text-muted truncate">{user.email}</p>
            </div>
            <Link
              prefetch
              href="/perfil"
              role="menuitem"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-dim hover:text-fg hover:bg-fg/5 transition-colors"
            >
              {ProfileIcon}
              Meu perfil
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-dim hover:text-fg hover:bg-fg/5 transition-colors cursor-pointer"
            >
              <ThemeIcon theme={theme} />
              {themeToggleLabel(theme)}
            </button>
            <div className="my-1 h-px bg-fg/5" />
            <form action={signOut}>
              <button
                type="submit"
                role="menuitem"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-dim hover:text-coral hover:bg-coral/10 transition-colors cursor-pointer"
              >
                {LogoutIcon}
                Sair
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

export function MobileBottomNav({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const onProfile = pathname === "/perfil";
  // Com foto de perfil, ela entra num círculo no lugar do ícone de Perfil
  const profileIcon = user.avatarUrl ? (
    <Avatar
      name={user.name}
      email={user.email}
      url={user.avatarUrl}
      size={26}
      className={`ring-2 ${onProfile ? "ring-blue" : "ring-fg/15"} transition-[box-shadow]`}
    />
  ) : (
    ProfileIcon
  );
  const items = [...navItems, { href: "/perfil", label: "Perfil", icon: profileIcon }];
  // Duas abas de cada lado e o "+" no meio, ao alcance do polegar
  const middle = Math.ceil(items.length / 2);

  // O tema fica em Perfil → Aparência: aqui só o que é navegação
  return (
    <nav
      aria-label="Principal"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-panel/90 backdrop-blur-3xl border-t border-fg/5 shadow-[0_-4px_24px_var(--shadow)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-stretch justify-around px-2 py-1.5">
        {items.map((item, i) => {
          const isActive = pathname === item.href;
          const tab = (
            <Link
              prefetch
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex-1 flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition-colors duration-300 rounded-xl focus-visible:outline-2 focus-visible:outline-blue ${
                isActive ? "text-blue" : "text-text-muted active:text-fg"
              }`}
            >
              <span className="relative flex items-center justify-center w-14 h-8 rounded-full">
                {/* Indicador que desliza até a aba tocada */}
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-active"
                    className="absolute inset-0 rounded-full bg-blue/10"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <motion.span className="relative" whileTap={{ scale: 0.85 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                  {item.icon}
                </motion.span>
              </span>
              {item.label}
            </Link>
          );
          if (i !== middle) return tab;
          return [
            <Link
              prefetch
              key="nova"
              href={NEW_TRANSACTION_HREF}
              aria-label="Nova transação"
              className="relative flex-1 flex items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-blue"
            >
              <motion.span
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue text-bg shadow-[0_6px_20px_-6px_color-mix(in_srgb,var(--blue)_70%,transparent)]"
              >
                {PlusIcon}
              </motion.span>
            </Link>,
            tab,
          ];
        })}
      </div>
    </nav>
  );
}
