import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/utils/cn";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_META: Record<
  ToastVariant,
  { icon: ReactNode; accent: string; iconColor: string }
> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    accent: "bg-emerald-500",
    iconColor: "text-emerald-600",
  },
  error: {
    icon: <AlertCircle className="h-5 w-5" />,
    accent: "bg-red-500",
    iconColor: "text-red-600",
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    accent: "bg-brand-500",
    iconColor: "text-brand-600",
  },
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-3), { id, variant, title, description }]);
      window.setTimeout(() => dismiss(id), 4600);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (t, d) => push("success", t, d),
      error: (t, d) => push("error", t, d),
      info: (t, d) => push("info", t, d),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[min(92vw,380px)] flex-col gap-2.5">
        <AnimatePresence>
          {toasts.map((toast) => {
            const meta = VARIANT_META[toast.variant];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 48, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 48, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border border-ink-900/8 bg-white p-4 pr-10 shadow-lift"
              >
                <span className={cn("absolute inset-y-0 left-0 w-1", meta.accent)} />
                <span className={cn("mt-0.5 shrink-0", meta.iconColor)}>{meta.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight text-ink-900">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-0.5 text-[13px] leading-snug text-ink-500">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="absolute right-2.5 top-2.5 rounded-md p-1 text-ink-300 transition-colors hover:bg-ink-50 hover:text-ink-600"
                  aria-label="Fermer la notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans ToastProvider");
  return ctx;
}
