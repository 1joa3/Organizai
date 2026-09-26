"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "danger" | "ghost" | "glass";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.2)]",
  danger:
    "bg-coral/10 text-coral border border-coral/30 hover:bg-coral/20 hover:border-coral/50 shadow-[0_0_15px_rgba(255,0,85,0.15)]",
  ghost:
    "bg-transparent text-text-dim hover:text-white hover:bg-white/5",
  glass:
    "glass-panel text-white hover:border-white/20 hover:bg-white/10",
};

const sizeStyles = {
  sm: "px-4 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          relative overflow-hidden inline-flex items-center justify-center gap-2
          font-medium rounded-lg transition-all duration-300
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        <span className="relative z-10 flex items-center gap-2">{children}</span>
        
        {/* Shine effect for primary button */}
        {variant === "primary" && (
          <div className="absolute inset-0 -translate-x-full hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
