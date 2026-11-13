"use client";

import { MotionConfig } from "framer-motion";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar, { MobileBottomNav, type SidebarUser } from "./Sidebar";
import { ToastProvider } from "./Toast";
import { saveSidebarCookie } from "@/lib/sidebar";
import ClickSpark from "@/components/reactbits/ClickSpark";
import { useCssVar } from "@/lib/useCssVar";

/** Faíscas só nos cliques em botões e links (ClickSpark do React Bits) */
const SPARK_TARGETS = 'button:not(:disabled), a[href], [role="button"]';

const AUTH_PAGES = ["/login", "/esqueci-senha", "/nova-senha"];

export default function ClientLayout({
  children,
  initialSidebarExpanded = false,
  user,
}: {
  children: React.ReactNode;
  initialSidebarExpanded?: boolean;
  user: SidebarUser | null;
}) {
  const [isExpanded, setIsExpanded] = useState(initialSidebarExpanded);
  const pathname = usePathname();
  const sparkColor = useCssVar("--blue", "#00E5FF");

  function toggleSidebar() {
    saveSidebarCookie(!isExpanded);
    setIsExpanded(!isExpanded);
  }

  // Telas de autenticação ficam sem menu: não há o que navegar antes de entrar
  if (AUTH_PAGES.includes(pathname) || !user) {
    return (
      <MotionConfig reducedMotion="user">
        <ToastProvider>{children}</ToastProvider>
      </MotionConfig>
    );
  }

  return (
    // Quem pediu menos movimento no sistema vê as telas sem deslocamentos
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <ClickSpark
          selector={SPARK_TARGETS}
          sparkColor={sparkColor}
          sparkCount={8}
          sparkRadius={22}
          sparkSize={9}
          duration={420}
        >
          <div className="min-h-screen bg-bg">
            <Sidebar
              isExpanded={isExpanded}
              onToggle={toggleSidebar}
              user={user}
            />
            <MobileBottomNav />

            <div
              className={`transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] min-h-screen flex flex-col ${
                isExpanded ? "md:pl-64" : "md:pl-20"
              }`}
            >
              <main className="flex-1 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:p-6 md:p-8 lg:p-10 md:pb-8 relative z-0 w-full">
                <div className="max-w-7xl mx-auto w-full">{children}</div>
              </main>
            </div>
          </div>
        </ClickSpark>
      </ToastProvider>
    </MotionConfig>
  );
}
