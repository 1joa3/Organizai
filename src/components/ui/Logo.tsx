"use client";

import { useId } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

/**
 * Marca do OrganizAI: um anel dividido em três arcos (as finanças
 * organizadas em categorias, como o gráfico de rosca do app) com uma faísca
 * de IA no centro. Ao montar, os arcos se desenham em sequência e a faísca
 * aparece girando; depois ela dá um brilho discreto de tempos em tempos.
 * Respeita "reduzir movimento" do sistema.
 */

const ARCS = [
  { d: "M23.22 9.48A11 11 0 0 1 27.22 28.30", className: "text-blue" },
  { d: "M21.34 30.92A11 11 0 0 1 9.28 22.47", className: "text-emerald" },
  { d: "M9.73 16.06A11 11 0 0 1 16.78 9.48", className: "text-amber" },
];

const SPARKLE =
  "M20 13.5C20.7 17.3 22.7 19.3 26.5 20C22.7 20.7 20.7 22.7 20 26.5C19.3 22.7 17.3 20.7 13.5 20C17.3 19.3 19.3 17.3 20 13.5Z";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const ringVariants: Variants = {
  hidden: { rotate: -120 },
  shown: { rotate: 0, transition: { duration: 1.1, ease: EASE_OUT } },
  hover: { rotate: 40, transition: { type: "spring", stiffness: 120, damping: 14 } },
};

const arcVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  shown: (i: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { delay: 0.1 + i * 0.16, duration: 0.7, ease: EASE_OUT },
  }),
};

const sparkleVariants: Variants = {
  hidden: { scale: 0, rotate: -90, opacity: 0 },
  shown: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: { delay: 0.55, type: "spring", stiffness: 260, damping: 16 },
  },
  hover: { scale: 1.18, transition: { type: "spring", stiffness: 300, damping: 12 } },
};

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 40, className = "" }: LogoMarkProps) {
  const reduceMotion = useReducedMotion();
  const gradientId = `logo-spark-${useId().replace(/:/g, "")}`;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="OrganizAI"
      className={`shrink-0 overflow-visible ${className}`}
      initial={reduceMotion ? false : "hidden"}
      animate="shown"
      whileHover={reduceMotion ? undefined : "hover"}
    >
      <defs>
        <linearGradient id={gradientId} x1="13.5" y1="13.5" x2="26.5" y2="26.5" gradientUnits="userSpaceOnUse">
          <stop style={{ stopColor: "var(--blue)" }} />
          <stop offset="1" style={{ stopColor: "var(--emerald)" }} />
        </linearGradient>
      </defs>

      <motion.g variants={ringVariants} style={{ originX: 0.5, originY: 0.5 }}>
        {/* Círculo invisível: deixa a caixa do grupo centrada no anel, para girar em torno do centro */}
        <circle cx="20" cy="20" r="11" fill="none" stroke="none" />
        {ARCS.map((arc, i) => (
          <motion.path
            key={arc.d}
            d={arc.d}
            custom={i}
            variants={arcVariants}
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
            className={`${arc.className} drop-shadow-[0_0_4px_color-mix(in_srgb,currentColor_40%,transparent)]`}
          />
        ))}
      </motion.g>

      <motion.g variants={sparkleVariants} style={{ originX: 0.5, originY: 0.5 }}>
        {/* Brilho ocioso: um giro de 90° (a faísca é simétrica) a cada poucos segundos */}
        <motion.path
          d={SPARKLE}
          fill={`url(#${gradientId})`}
          style={{ originX: 0.5, originY: 0.5 }}
          animate={reduceMotion ? undefined : { rotate: [0, 90], scale: [1, 0.8, 1] }}
          transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 5, delay: 2 }}
        />
      </motion.g>
    </motion.svg>
  );
}

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

/** Marca + nome. O "AI" leva o mesmo degradê da faísca. */
export default function Logo({ size = 40, showWordmark = true, className = "", wordmarkClassName = "text-2xl" }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className={`font-display tracking-tight text-fg whitespace-nowrap ${wordmarkClassName}`}>
          Organiz
          <span className="bg-gradient-to-br from-blue to-emerald bg-clip-text text-transparent">AI</span>
        </span>
      )}
    </div>
  );
}
