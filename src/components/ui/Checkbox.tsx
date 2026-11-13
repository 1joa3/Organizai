"use client";

import SpringCheck from "@/components/reactbits/SpringCheck";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  /** Texto ao lado (opcional) */
  label?: React.ReactNode;
  size?: number;
  className?: string;
}

/** Caixinha de marcar do app: SpringCheck do React Bits (preenche com mola e desenha o check). */
export default function Checkbox({ checked, onChange, ariaLabel, label, size = 18, className = "" }: CheckboxProps) {
  return (
    <SpringCheck
      checked={checked}
      onChange={onChange}
      ariaLabel={ariaLabel}
      label={label ?? null}
      strike="none"
      doneOpacity={1}
      color="var(--text-dim)"
      fillColor="var(--blue)"
      checkColor="var(--bg)"
      boxSize={size}
      boxRadius={Math.round(size / 3.5)}
      fontSize={12}
      className={`min-h-0! ${label ? "" : "gap-0!"} ${className}`}
    />
  );
}
