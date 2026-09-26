"use client";

import { motion } from "framer-motion";
import { calcPercent } from "@/lib/formatters";

interface GoalProgressBarProps {
  current: number;
  target: number;
  color: string;
  height?: number;
  showLabel?: boolean;
}

export default function GoalProgressBar({
  current,
  target,
  color,
  height = 8,
  showLabel = true,
}: GoalProgressBarProps) {
  const percent = calcPercent(current, target);

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span
            className="font-mono-value text-xs font-semibold"
            style={{ color, textShadow: `0 0 8px ${color}80` }}
          >
            {percent}%
          </span>
        </div>
      )}
      <div
        className="w-full bg-white/5 rounded-full overflow-hidden shadow-inner"
        style={{ height }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="h-full rounded-full relative"
          style={{ 
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}60`
          }}
        >
          {/* Shine effect passing over the bar */}
          <div className="absolute top-0 bottom-0 left-0 w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </motion.div>
      </div>
    </div>
  );
}
