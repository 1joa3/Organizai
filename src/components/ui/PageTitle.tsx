"use client";

import BlurText from "@/components/reactbits/BlurText";

/** Título da página: as palavras entram desfocadas, uma a uma (BlurText do React Bits). */
export default function PageTitle({ text, className = "" }: { text: string; className?: string }) {
  return (
    <BlurText
      key={text}
      tag="h1"
      text={text}
      animateBy="words"
      direction="top"
      delay={90}
      distance={14}
      blur={8}
      trigger="load"
      className={`font-display text-3xl sm:text-4xl text-fg tracking-tight ${className}`}
    />
  );
}
