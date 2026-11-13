"use client";

import { shake } from "@/lib/shake";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Texto fixo dentro do campo, à esquerda (ex.: "R$") */
  prefix?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, className = "", id, onInvalid, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-text-dim uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative t-shake">
          {prefix && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-text-muted pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full px-4 py-3 text-sm
              bg-fg/5 text-fg
              border border-fg/10 rounded-lg
              placeholder:text-text-muted
              hover:border-fg/20 hover:bg-fg/10
              focus:border-blue focus:bg-fg/5 focus:outline-none focus:ring-4 focus:ring-blue/10
              transition-all duration-300
              shadow-inner
              ${error ? "border-coral focus:border-coral focus:ring-coral/10" : ""}
              ${prefix ? "pl-11" : ""}
              ${className}
            `}
            {...props}
            // Campo obrigatório vazio ou inválido no envio: balança
            onInvalid={(e) => {
              shake(e.currentTarget.parentElement);
              onInvalid?.(e);
            }}
          />
        </div>
        {error && (
          <span className="text-xs text-coral font-medium flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </span>
        )}
        {hint && !error && (
          <span className="text-xs text-text-muted">{hint}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
