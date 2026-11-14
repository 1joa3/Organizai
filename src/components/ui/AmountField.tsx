"use client";

import { moneyDisplay, moneyFromTyping } from "@/lib/moneyInput";
import { shake } from "@/lib/shake";

interface AmountFieldProps {
  label: string;
  /** Valor no formato "1234.56" ("" = vazio) */
  value: string;
  onChange: (value: string) => void;
  /** Nome no formulário (campo escondido com "1234.56") */
  name: string;
  required?: boolean;
  autoFocus?: boolean;
  /** Texto antes do valor: "R$", "− R$", "+ R$" */
  prefix?: string;
  /** Cor do prefixo (classe de texto) */
  prefixClassName?: string;
  /** Linha pequena embaixo (ex.: "Guardado na meta: R$ 1.000,00") */
  hint?: React.ReactNode;
  invalid?: boolean;
}

/**
 * Campo de valor em destaque (letra grande), para o número principal de uma
 * janela. Formata em reais enquanto digita, como os outros campos de valor.
 */
export default function AmountField({
  label,
  value,
  onChange,
  name,
  required,
  autoFocus,
  prefix = "R$",
  prefixClassName = "text-text-dim",
  hint,
  invalid = false,
}: AmountFieldProps) {
  return (
    <label
      className={`t-shake block rounded-2xl bg-fg/[0.04] border px-4 pt-3 pb-4 transition-[border-color,box-shadow] focus-within:ring-4 ${
        invalid ? "border-coral focus-within:ring-coral/10" : "border-fg/10 focus-within:border-blue focus-within:ring-blue/10"
      }`}
    >
      <span className="text-xs font-medium text-text-dim uppercase tracking-wider">{label}</span>
      <span className="mt-1 flex items-baseline gap-2">
        <span className={`text-xl ${prefixClassName}`}>{prefix}</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0,00"
          required={required}
          autoFocus={autoFocus}
          value={moneyDisplay(value)}
          onChange={(e) => onChange(moneyFromTyping(e.target.value))}
          onInvalid={(e) => shake(e.currentTarget.closest(".t-shake"))}
          aria-label={label}
          // O contorno de foco é o da caixa toda (focus-within), não o do campo
          className="min-w-0 flex-1 bg-transparent font-mono-value text-[2rem]! leading-tight text-fg placeholder:text-text-muted/60 outline-none! focus-visible:outline-none!"
        />
      </span>
      {hint && <span className="block mt-1 text-xs text-text-muted">{hint}</span>}
      <input type="hidden" name={name} value={value} />
    </label>
  );
}
