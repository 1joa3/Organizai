"use client";

import { useState } from "react";
import Sidebar, { MobileBottomNav } from "./Sidebar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} />
      <MobileBottomNav />

      <div
        className={`transition-all duration-300 ease-in-out min-h-screen flex flex-col ${
          isExpanded ? "md:pl-64" : "md:pl-20"
        }`}
      >
        <main className="flex-1 p-4 pb-24 sm:p-6 md:p-8 lg:p-10 md:pb-8 relative z-0 w-full">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
