"use client";

import CountUp from "@/components/reactbits/CountUp";

interface AnimatedNumberProps {
  value: number;
  /** "money": R$ 1.234,56 · "percent": 12% (com `decimals`, 12,34%) · "plain": 1.234 */
  format?: "money" | "percent" | "plain";
  decimals?: number;
  /** Mostra "+" nos positivos (retorno, variação) */
  signed?: boolean;
  /** "roll": dígitos rolando como um odômetro (para o número principal da tela) */
  mode?: "count" | "roll";
  duration?: number;
  delay?: number;
  className?: string;
}

/**
 * Número que conta até o valor quando aparece na tela, e de um valor ao
 * outro quando muda (CountUp do React Bits), no formato pt-BR.
 */
export default function AnimatedNumber({
  value,
  format = "money",
  decimals,
  signed = false,
  mode = "count",
  duration = 1.4,
  delay = 0,
  className = "",
}: AnimatedNumberProps) {
  const places = decimals ?? (format === "money" ? 2 : 0);
  const negative = value < 0;
  const sign = negative ? "-" : signed ? "+" : "";
  const prefix = format === "money" ? `${sign}R$ ` : sign;
  const suffix = format === "percent" ? "%" : "";

  return (
    <CountUp
      to={Math.abs(value)}
      prefix={prefix}
      suffix={suffix}
      decimals={places}
      separator="."
      decimalSeparator=","
      mode={mode}
      easing="expo"
      duration={duration}
      delay={delay}
      className={className}
    />
  );
}
