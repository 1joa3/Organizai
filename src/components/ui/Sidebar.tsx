"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme, ThemeIcon, themeToggleLabel } from "./ThemeToggle";
import { LogoMark } from "./Logo";

interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

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

export default function Sidebar({ isExpanded, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [theme, toggleTheme] = useTheme();

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

        {/* Perfil */}
        <div className="px-3 py-6">
          <div
            className={`flex items-center gap-3 p-2 rounded-xl border transition-colors duration-300 ${
              isExpanded ? "bg-bg-surface border-border" : "bg-transparent border-transparent"
            }`}
          >
            <div className="shrink-0 w-10 h-10 rounded-full bg-fg/10 flex items-center justify-center border border-fg/5">
              <span className="text-sm font-mono-value text-fg">JF</span>
            </div>
            <div className={labelClass(isExpanded)}>
              <p className="text-sm font-semibold text-fg">João Ferreira</p>
              <p className="text-[10px] text-blue font-mono-value tracking-widest mt-0.5">PRO PLAN</p>
            </div>
          </div>
        </div>
      </div>
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
              className={`relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-[10px] font-medium transition-colors duration-300 ${isActive ? "text-blue" : "text-text-muted"
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
          className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-[10px] font-medium text-text-muted transition-colors duration-300 cursor-pointer"
        >
          <ThemeIcon theme={theme} />
          Tema
        </button>
      </div>
    </nav>
  );
}
