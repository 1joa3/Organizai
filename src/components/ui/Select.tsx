"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<InputHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  value?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = "", id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-medium text-text-dim uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`
            w-full px-4 py-3 text-sm
            bg-fg/5 text-fg
            border border-fg/10 rounded-lg
            hover:border-fg/20 hover:bg-fg/10
            focus:border-blue focus:bg-fg/5 focus:outline-none focus:ring-4 focus:ring-blue/10
            transition-all duration-300
            appearance-none cursor-pointer
            shadow-inner
            ${error ? "border-coral focus:border-coral focus:ring-coral/10" : ""}
            ${className}
          `}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23A1A1AA' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 16px center",
          }}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-option">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-option text-fg">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs text-coral font-medium">{error}</span>}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
