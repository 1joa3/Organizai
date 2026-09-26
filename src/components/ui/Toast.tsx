"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Accent, ACCENT_VAR } from "@/lib/accents";

/* ═══════════════════════════════════════════════════
   TOAST TYPES & CONFIG
   ═══════════════════════════════════════════════════ */

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

const toastConfig: Record<ToastType, { icon: ReactNode; accent: Accent }> = {
  success: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <motion.path
          d="M20 6L9 17l-5-5"
          stroke="currentColor"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
        />
      </svg>
    ),
    accent: "emerald",
  },
  error: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    accent: "coral",
  },
  warning: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    ),
    accent: "amber",
  },
  info: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
    accent: "blue",
  },
};

/* ═══════════════════════════════════════════════════
   CONTEXT & PROVIDER
   ═══════════════════════════════════════════════════ */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx.toast;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newToast: Toast = { id, type, title, message, duration };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => removeToast(id), duration);
    },
    [removeToast]
  );

  const toast = {
    success: (title: string, message?: string) => addToast("success", title, message),
    error: (title: string, message?: string) => addToast("error", title, message),
    warning: (title: string, message?: string) => addToast("warning", title, message),
    info: (title: string, message?: string) => addToast("info", title, message),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-5 right-5 z-[200] flex flex-col gap-3 pointer-events-none w-[360px]">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/* ═══════════════════════════════════════════════════
   TOAST ITEM
   ═══════════════════════════════════════════════════ */

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const config = toastConfig[toast.type];
  const duration = toast.duration || 4000;
  const accentVar = ACCENT_VAR[config.accent];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.85 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.85, transition: { duration: 0.2 } }}
      transition={{ type: "spring", damping: 24, stiffness: 350 }}
      className="pointer-events-auto relative overflow-hidden"
      style={{
        borderRadius: "14px",
        background: "linear-gradient(135deg, rgba(22, 22, 30, 0.92) 0%, rgba(16, 16, 22, 0.96) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        boxShadow: `
          0 16px 48px -8px rgba(0, 0, 0, 0.6),
          0 0 40px -12px color-mix(in srgb, ${accentVar} 10%, transparent),
          inset 0 1px 0 rgba(255, 255, 255, 0.05)
        `,
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "12px",
          bottom: "12px",
          width: "3px",
          borderRadius: "0 3px 3px 0",
          background: `linear-gradient(180deg, ${accentVar}, color-mix(in srgb, ${accentVar} 80%, transparent))`,
          boxShadow: `0 0 12px color-mix(in srgb, ${accentVar} 40%, transparent)`,
        }}
      />

      <div className="pl-5 pr-3 py-3.5 flex items-start gap-3">
        {/* Icon dot */}
        <div
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-[1px]"
          style={{
            background: `color-mix(in srgb, ${accentVar} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${accentVar} 18%, transparent)`,
            color: accentVar,
          }}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-[2px]">
          <p
            className="text-[13px] font-semibold leading-tight tracking-tight"
            style={{ color: "#F8F9FA" }}
          >
            {toast.title}
          </p>
          {toast.message && (
            <p
              className="text-[12px] mt-1 leading-relaxed"
              style={{ color: "rgba(161, 161, 170, 0.8)" }}
            >
              {toast.message}
            </p>
          )}
        </div>

        {/* Close */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
          style={{
            color: "rgba(161, 161, 170, 0.5)",
            background: "transparent",
            border: "none",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(161, 161, 170, 0.5)";
            e.currentTarget.style.background = "transparent";
          }}
          aria-label="Fechar"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: "2px", background: "rgba(255,255,255,0.03)" }}>
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: duration / 1000, ease: "linear" }}
          style={{
            height: "100%",
            transformOrigin: "left",
            background: `linear-gradient(90deg, ${accentVar}, color-mix(in srgb, ${accentVar} 60%, transparent))`,
            opacity: 0.7,
          }}
        />
      </div>
    </motion.div>
  );
}
