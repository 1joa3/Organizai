"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar, { MobileBottomNav } from "./Sidebar";
import { ToastProvider } from "./Toast";
import { saveSidebarCookie } from "@/lib/sidebar";

export default function ClientLayout({
  children,
  initialSidebarExpanded = false,
}: {
  children: React.ReactNode;
  initialSidebarExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(initialSidebarExpanded);
  const pathname = usePathname();

  function toggleSidebar() {
    saveSidebarCookie(!isExpanded);
    setIsExpanded(!isExpanded);
  }

  // A tela de login fica sem menu: não há o que navegar antes de entrar
  if (pathname === "/login") {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg">
        <Sidebar isExpanded={isExpanded} onToggle={toggleSidebar} />
        <MobileBottomNav />

        <div
          className={`transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] min-h-screen flex flex-col ${
            isExpanded ? "md:pl-64" : "md:pl-20"
          }`}
        >
          <main className="flex-1 p-4 pb-24 sm:p-6 md:p-8 lg:p-10 md:pb-8 relative z-0 w-full">
            <div className="max-w-7xl mx-auto w-full">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
