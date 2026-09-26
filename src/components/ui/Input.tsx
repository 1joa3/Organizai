"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
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
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full px-4 py-3 text-sm
              bg-white/5 text-white
              border border-white/10 rounded-lg
              placeholder:text-text-muted
              hover:border-white/20 hover:bg-white/10
              focus:border-blue focus:bg-white/5 focus:outline-none focus:ring-4 focus:ring-blue/10
              transition-all duration-300
              shadow-inner
              ${error ? "border-coral focus:border-coral focus:ring-coral/10" : ""}
              ${className}
            `}
            {...props}
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
