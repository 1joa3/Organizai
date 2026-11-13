"use client";

import { useState, type ComponentProps } from "react";
import Input from "./Input";
import { moneyDisplay, moneyFromTyping, moneyValue } from "@/lib/moneyInput";

type InputProps = ComponentProps<typeof Input>;

interface MoneyInputProps extends Omit<InputProps, "value" | "defaultValue" | "onChange" | "type" | "prefix"> {
  /** Valor controlado, no formato "1234.56" ("" = vazio) */
  value?: string;
  /** Valor inicial, quando não controlado */
  defaultValue?: string | number | null;
  onValueChange?: (value: string) => void;
}

/**
 * Campo de valor em reais que formata enquanto digita (veja lib/moneyInput).
 * O formulário recebe, no `name`, o valor "1234.56" por um campo escondido.
 */
export default function MoneyInput({ name, value, defaultValue, onValueChange, ...props }: MoneyInputProps) {
  const [inner, setInner] = useState(() => moneyValue(defaultValue));
  const current = value ?? inner;

  return (
    <>
      <Input
        placeholder="0,00"
        {...props}
        prefix="R$"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={moneyDisplay(current)}
        onChange={(e) => {
          const next = moneyFromTyping(e.target.value);
          if (value === undefined) setInner(next);
          onValueChange?.(next);
        }}
        className="font-mono-value"
      />
      {name && <input type="hidden" name={name} value={current} />}
    </>
  );
}
