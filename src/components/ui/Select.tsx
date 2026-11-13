"use client";

import { useState, type ChangeEvent } from "react";
import GlideSelect from "@/components/reactbits/GlideSelect";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  /** Recebe um evento com `target.value`, como o <select> de antes */
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  value?: string;
  defaultValue?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

export const FIELD_TRIGGER =
  "w-full px-4 py-3 text-sm bg-fg/5 text-fg border border-fg/10 rounded-lg shadow-inner hover:border-fg/20 hover:bg-fg/10 focus-visible:border-blue focus-visible:ring-4 focus-visible:ring-blue/10 aria-expanded:border-blue aria-expanded:ring-4 aria-expanded:ring-blue/10 aria-invalid:border-coral";

/**
 * Lista suspensa do app: GlideSelect do React Bits (menu que abre com mola e
 * destaque que desliza entre as opções), com a mesma API do <select> antigo.
 * Num formulário, o valor vai pelo `name` num campo escondido.
 */
export default function Select({
  label,
  error,
  options,
  placeholder,
  onChange,
  value,
  defaultValue,
  name,
  required,
  disabled,
  id,
  className = "",
  "aria-label": ariaLabel,
}: SelectProps) {
  const [inner, setInner] = useState(defaultValue ?? "");
  // Como o <select> nativo: sem placeholder, fica na primeira opção; e se as
  // opções mudarem (ex.: categorias de outro tipo), volta para ela
  const fallback = placeholder ? "" : (options[0]?.value ?? "");
  const current = value ?? (options.some((o) => o.value === inner) ? inner : fallback);
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const choices = options.filter((o) => o.value !== "" || !placeholder);

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-text-dim uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <GlideSelect
          id={selectId}
          options={choices}
          value={current}
          onChange={(next) => {
            if (value === undefined) setInner(next);
            onChange?.({ target: { value: next, name } } as unknown as ChangeEvent<HTMLSelectElement>);
          }}
          placeholder={placeholder ?? "Selecione"}
          disabled={disabled}
          ariaLabel={ariaLabel ?? label}
          invalid={!!error}
          className={className}
          triggerClassName={FIELD_TRIGGER}
        />
        {/* Valor do formulário; "required" barra o envio sem escolha */}
        {name && (
          <input
            tabIndex={-1}
            aria-hidden="true"
            name={name}
            value={current}
            required={required}
            onChange={() => {}}
            className="absolute inset-x-0 bottom-0 h-px opacity-0 pointer-events-none"
          />
        )}
      </div>
      {error && <span className="text-xs text-coral font-medium">{error}</span>}
    </div>
  );
}
