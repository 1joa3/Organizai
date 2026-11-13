"use client";

import { SHAKE_EVENT, shake } from "@/lib/shake";
import { ReactNode, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Accent, ACCENT_CLASS, ACCENT_VAR } from "@/lib/accents";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  accent?: Accent;
  children: ReactNode;
  maxWidth?: string;
}

function subscribeNothing() {
  return () => {};
}

export default function Modal({
  isOpen,
  onClose,
  title,
  eyebrow,
  accent = "blue",
  children,
  maxWidth = "max-w-lg",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Erro enquanto a janela está aberta (toast de erro, campo inválido): balança
  useEffect(() => {
    if (!isOpen) return;
    const onShake = () => shake(panelRef.current);
    window.addEventListener(SHAKE_EVENT, onShake);
    return () => window.removeEventListener(SHAKE_EVENT, onShake);
  }, [isOpen]);
  // false no servidor e na hidratação, true depois — o portal só existe no cliente
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const accentClass = ACCENT_CLASS[accent];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Um campo aberto dentro da janela (lista suspensa) trata o Esc antes
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  // Portal no <body>: o <main> cria um contexto de empilhamento (z-0), e de
  // dentro dele nenhum z-index passa por cima da barra de navegação do celular
  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          onClick={handleOverlayClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-backdrop backdrop-blur-md p-3 sm:p-4"
        >
          {/* "Modal open/close" da transitions.dev: cresce de 0,96 a partir do
              centro em 250ms e some em 150ms. Por dentro, um wrapper balança
              quando algo dá errado ("Error state shake"). */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] } }}
            className={`w-full ${maxWidth} flex justify-center`}
          >
          <div
            ref={panelRef}
            className={`t-shake w-full glass-card relative overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)]`}
          >
            {/* Top accent line — signals the "kind" of window at a glance */}
            <div
              className={`h-[2px] w-full shrink-0 ${accentClass.bg}`}
              style={{ boxShadow: `0 0 16px -1px ${ACCENT_VAR[accent]}` }}
            />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-fg/5 shrink-0">
              <div className="min-w-0">
                {eyebrow && (
                  <p className={`font-mono-value text-[10px] uppercase tracking-[0.15em] mb-1 ${accentClass.text}`}>
                    {eyebrow}
                  </p>
                )}
                <h2 className="font-display text-xl text-fg truncate">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-fg/5 hover:bg-fg/10 border border-fg/5 hover:border-fg/15 flex items-center justify-center text-text-muted hover:text-fg transition-all cursor-pointer shrink-0"
                aria-label="Fechar"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Body — rola sozinho quando o formulário é mais alto que a tela */}
            <div className="px-5 sm:px-6 py-5 sm:py-6 overflow-y-auto overscroll-contain">{children}</div>
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
