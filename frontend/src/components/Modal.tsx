import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./ui";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = "max-w-lg",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-ink-950/55 backdrop-blur-[6px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={`relative z-10 flex max-h-[92vh] w-full ${maxWidth} max-w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-lift sm:rounded-3xl`}
            role="dialog"
            aria-modal="true"
          >
            {(title || icon) && (
              <div className="flex items-start justify-between gap-4 border-b border-ink-900/6 px-6 py-5">
                <div className="flex items-center gap-3.5">
                  {icon && (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-ink-700 text-white shadow-[0_8px_20px_-8px_rgb(51_95_138/0.7)] [&>svg]:h-5 [&>svg]:w-5">
                      {icon}
                    </div>
                  )}
                  <div>
                    <h2 className="font-display text-lg font-semibold tracking-tight text-ink-900">
                      {title}
                    </h2>
                    {subtitle && <p className="text-[13px] text-ink-400">{subtitle}</p>}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-ink-300 transition-colors hover:bg-ink-50 hover:text-ink-700"
                  aria-label="Fermer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            )}
            <div className="overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  loading,
  title,
  message,
  confirmLabel = "Supprimer",
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 ring-1 ring-red-100">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink-900">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{message}</p>
        <div className="mt-6 flex w-full gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            className="flex-1 !bg-none !bg-red-600 hover:!bg-red-700"
            onClick={() => void onConfirm()}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
