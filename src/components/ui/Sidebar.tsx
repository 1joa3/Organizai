"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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

export default function Sidebar({ isExpanded, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`hidden md:flex fixed left-0 top-0 h-screen transition-all duration-300 ease-in-out bg-[#08080A]/80 backdrop-blur-3xl border-r border-white/5 flex-col z-50 shadow-[4px_0_24px_rgba(0,0,0,0.5)] ${isExpanded ? "w-64" : "w-20"
        }`}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3.5 top-10 w-7 h-7 bg-bg-raised border border-white/10 rounded-full flex items-center justify-center text-text-dim hover:text-white hover:border-white/30 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] transition-all z-50 cursor-pointer"
        aria-label={isExpanded ? "Recolher menu" : "Expandir menu"}
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
          className={`transition-transform duration-300 ${isExpanded ? "rotate-0" : "rotate-180"
            }`}
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Logo */}
      <div className={`px-4 py-8 flex ${isExpanded ? "items-center" : "justify-center"} h-24`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue to-emerald flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.3)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="font-display text-2xl tracking-tight text-white whitespace-nowrap"
              >
                OrganizAI
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={!isExpanded ? item.label : undefined}
              className={`
                relative flex items-center gap-3 py-3 rounded-xl text-sm font-medium
                transition-all duration-300 group
                ${isExpanded ? "px-4" : "px-0 justify-center"}
                ${isActive
                  ? "text-white"
                  : "text-text-muted hover:text-white"
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-white/[0.08] border border-white/10 rounded-xl pointer-events-none"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              {!isActive && (
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
              )}

              <span className={`relative z-10 shrink-0 ${isActive ? "text-blue drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]" : ""}`}>
                {item.icon}
              </span>

              <AnimatePresence mode="wait">
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative z-10 whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`px-4 py-6 mt-auto ${!isExpanded ? "flex justify-center" : ""}`}>
        <div className={`glass-panel p-3 flex items-center gap-3 transition-all ${!isExpanded ? "justify-center bg-transparent border-transparent" : ""}`}>
          <div className="shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/5">
            <span className="text-sm font-mono-value text-white">JF</span>
          </div>
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <p className="text-sm font-semibold text-white">João Ferreira</p>
                <p className="text-[10px] text-blue font-mono-value tracking-widest mt-0.5">PRO PLAN</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#08080A]/90 backdrop-blur-3xl border-t border-white/5 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] pb-[env(safe-area-inset-bottom)]">
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
      </div>
    </nav>
  );
}
