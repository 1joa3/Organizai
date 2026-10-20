"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme, ThemeIcon, themeToggleLabel } from "./ThemeToggle";
import { LogoMark } from "./Logo";
import { signOut } from "@/lib/authActions";

export interface SidebarUser {
  name: string | null;
  email: string | null;
}

interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
  user: SidebarUser;
}

function initials(user: SidebarUser) {
  const source = user.name?.trim() || user.email || "?";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (user.name && parts[1] ? parts[1][0] : "")).toUpperCase();
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
  {
    href: "/categorias",
    label: "Categorias",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.2 15.9A10 10 0 1 1 8 2.8" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
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
      {/* Botão abrir/fechar */}
      <button
        onClick={onToggle}
        className="absolute -right-3.5 top-10 w-7 h-7 bg-panel border border-fg/10 rounded-full flex items-center justify-center text-text-dim hover:text-fg hover:border-fg/30 hover:scale-110 transition-all duration-200 z-50 cursor-pointer"
        aria-label={isExpanded ? "Recolher menu" : "Expandir menu"}
        aria-expanded={isExpanded}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-300 ${isExpanded ? "rotate-0" : "rotate-180"}`}
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="h-full flex flex-col overflow-hidden">
        {/* Logo */}
        <div className="h-24 px-5 flex items-center gap-3 shrink-0">
          <LogoMark size={40} />
          <span className={`font-display text-2xl tracking-tight text-fg ${labelClass(isExpanded)}`}>
            Organiz
            <span className="bg-gradient-to-br from-blue to-emerald bg-clip-text text-transparent">AI</span>
          </span>
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-3 py-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!isExpanded ? item.label : undefined}
                className={`relative flex items-center gap-3 h-12 pl-[18px] rounded-xl text-sm font-medium transition-colors duration-200 group ${
                  isActive ? "text-fg" : "text-text-muted hover:text-fg"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-fg/[0.08] border border-fg/10 rounded-xl pointer-events-none"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}

                {!isActive && (
                  <div className="absolute inset-0 bg-fg/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl pointer-events-none" />
                )}

                <span className={`relative z-10 shrink-0 ${isActive ? "text-blue drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]" : ""}`}>
                  {item.icon}
                </span>
                <span className={`relative z-10 ${labelClass(isExpanded)}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Tema */}
        <div className="px-3">
          <button
            onClick={toggleTheme}
            title={!isExpanded ? themeToggleLabel(theme) : undefined}
            aria-label={themeToggleLabel(theme)}
            className="w-full flex items-center gap-3 h-12 pl-[18px] rounded-xl text-sm font-medium text-text-muted hover:text-fg hover:bg-fg/5 transition-colors duration-200 cursor-pointer"
          >
            <span className="shrink-0">
              <ThemeIcon theme={theme} />
            </span>
            <span className={labelClass(isExpanded)}>{themeToggleLabel(theme)}</span>
          </button>
        </div>

        {/* Usuário: abre o menu com "Meu perfil" e "Sair" (funciona aberto ou fechado) */}
        <div className="px-3 py-6">
          <button
            ref={userButtonRef}
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            title={!isExpanded ? (user.name ?? user.email ?? undefined) : undefined}
            className={`w-full flex items-center gap-3 p-2 rounded-xl border text-left transition-colors duration-300 cursor-pointer hover:bg-fg/5 ${
              isExpanded || userMenuOpen ? "bg-bg-surface border-border" : "bg-transparent border-transparent"
            }`}
          >
            <span className="shrink-0 w-10 h-10 rounded-full bg-fg/10 flex items-center justify-center border border-fg/5">
              <span className="text-sm font-mono-value text-fg">{initials(user)}</span>
            </span>
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
            initial={{ opacity: 0, x: -6, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-6 left-full ml-3 w-60 rounded-xl border border-fg/10 bg-panel p-1.5 shadow-[0_16px_48px_-8px_var(--shadow)] z-50 origin-bottom-left"
          >
            <div className="px-3 py-2.5 border-b border-fg/5 mb-1">
              <p className="text-sm font-semibold text-fg truncate">{user.name ?? "Minha conta"}</p>
              <p className="text-xs text-text-muted truncate">{user.email}</p>
            </div>
            <Link
              href="/perfil"
              role="menuitem"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-dim hover:text-fg hover:bg-fg/5 transition-colors"
            >
              {ProfileIcon}
              Meu perfil
            </Link>
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

export function MobileBottomNav() {
  const pathname = usePathname();
  const [theme, toggleTheme] = useTheme();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-panel/90 backdrop-blur-3xl border-t border-fg/5 shadow-[0_-4px_24px_var(--shadow)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-medium transition-colors duration-300 ${isActive ? "text-blue" : "text-text-muted"
                }`}
            >
              <span className={isActive ? "drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]" : ""}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={toggleTheme}
          aria-label={themeToggleLabel(theme)}
          className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-medium text-text-muted transition-colors duration-300 cursor-pointer"
        >
          <ThemeIcon theme={theme} />
          Tema
        </button>
        <Link
          href="/perfil"
          className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-medium transition-colors duration-300 ${
            pathname === "/perfil" ? "text-blue" : "text-text-muted"
          }`}
        >
          {ProfileIcon}
          Perfil
        </Link>
      </div>
    </nav>
  );
}
