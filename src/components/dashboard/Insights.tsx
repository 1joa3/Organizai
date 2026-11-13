"use client";

import CardSpotlight from "@/components/ui/CardSpotlight";
import { motion } from "framer-motion";
import type { Insight, InsightTone } from "@/lib/dashboardStory";

const TONE: Record<InsightTone, { box: string; label: string; icon: React.ReactNode }> = {
  good: {
    box: "text-emerald bg-emerald/10 border-emerald/20",
    label: "Positivo",
    icon: <path d="M20 6L9 17l-5-5" />,
  },
  bad: {
    box: "text-coral bg-coral/10 border-coral/20",
    label: "Atenção",
    icon: (
      <>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </>
    ),
  },
  neutral: {
    box: "text-blue bg-blue/10 border-blue/20",
    label: "Informação",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </>
    ),
  },
};

/** Observações automáticas sobre o período (veja buildInsights). */
export default function Insights({ insights }: { insights: Insight[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative h-full glass-card p-6 flex flex-col"
    >
      <CardSpotlight />
      <h2 className="font-display text-lg text-fg mb-5">Observações</h2>
      {insights.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-text-muted border border-dashed border-fg/10 rounded-lg">
          Ainda não há movimento suficiente para comentar este período.
        </div>
      ) : (
        <ul className="space-y-4">
          {insights.map((insight, i) => {
            const tone = TONE[insight.tone];
            return (
              <motion.li
                key={insight.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.06, ease: "easeOut" }}
                className="flex gap-3"
              >
                <span
                  className={`flex items-center justify-center w-8 h-8 shrink-0 rounded-lg border ${tone.box}`}
                  title={tone.label}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label={tone.label} role="img">
                    {tone.icon}
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg leading-snug">{insight.title}</p>
                  <p className="text-xs text-text-dim mt-0.5">{insight.detail}</p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
