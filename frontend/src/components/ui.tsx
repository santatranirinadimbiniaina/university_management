import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { motion } from "framer-motion";
import {
  Backpack,
  Briefcase,
  ChevronDown,
  Eye,
  GraduationCap,
  Inbox,
  KeyRound,
  Loader2,
  PenLine,
  ShieldCheck,
  Shield,
  User,
} from "lucide-react";
import { cn } from "@/utils/cn";

/* --------------------------------- Bouton ---------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_10px_24px_-10px_rgb(51_95_138/0.65)] hover:from-brand-400 hover:to-brand-600 active:scale-[0.98]",
  secondary:
    "bg-white text-ink-700 border border-ink-200 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/50 active:scale-[0.98]",
  ghost: "text-ink-500 hover:bg-ink-100 hover:text-ink-800 active:scale-[0.98]",
  danger:
    "bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 active:scale-[0.98]",
  dark: "bg-ink-800 text-white hover:bg-ink-700 active:scale-[0.98]",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
  icon: "h-9 w-9 p-0",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold tracking-tight transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className={cn("animate-spin", size === "icon" ? "h-4 w-4" : "h-4 w-4")} />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

/* ---------------------------------- Champ ---------------------------------- */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  hint?: string;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, hint, rightSlot, className, id, ...props }, ref) => {
    const inputId = id ?? props.name ?? label;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-[13px] font-semibold tracking-tight text-ink-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300 [&>svg]:h-4.5 [&>svg]:w-4.5">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-11 w-full rounded-xl border bg-white text-sm text-ink-900 placeholder:text-ink-300 transition-all duration-200 outline-none",
              icon ? "pl-10.5 pr-4" : "px-4",
              rightSlot ? "pr-11" : "",
              error
                ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                : "border-ink-200 hover:border-ink-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-100",
              className,
            )}
            {...props}
          />
          {rightSlot && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-ink-400">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";

/* --------------------------------- Select ---------------------------------- */

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, children, id, ...props }, ref) => {
    const selectId = id ?? props.name ?? label;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-[13px] font-semibold tracking-tight text-ink-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "h-11 w-full appearance-none rounded-xl border bg-white px-4 pr-10 text-sm font-medium text-ink-900 transition-all duration-200 outline-none",
              error
                ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                : "border-ink-200 hover:border-ink-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-100",
              className,
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
        </div>
        {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
      </div>
    );
  },
);
Select.displayName = "Select";

/* ---------------------------------- Badge ---------------------------------- */

type BadgeVariant = "brand" | "ink" | "success" | "warning" | "danger" | "neutral";

const badgeVariants: Record<BadgeVariant, string> = {
  brand: "bg-brand-100 text-brand-700 ring-brand-500/15",
  ink: "bg-ink-100 text-ink-700 ring-ink-500/15",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-500/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-500/20",
  danger: "bg-red-50 text-red-700 ring-red-500/20",
  neutral: "bg-ink-50 text-ink-500 ring-ink-500/10",
};

export function Badge({
  variant = "neutral",
  icon,
  className,
  children,
}: {
  variant?: BadgeVariant;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight ring-1 ring-inset [&>svg]:h-3 [&>svg]:w-3",
        badgeVariants[variant],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

const ROLE_META: Record<string, { variant: BadgeVariant; icon: ReactNode }> = {
  administrateur: { variant: "ink", icon: <ShieldCheck /> },
  super_admin: { variant: "ink", icon: <ShieldCheck /> },
  admin: { variant: "ink", icon: <ShieldCheck /> },
  enseignant: { variant: "brand", icon: <GraduationCap /> },
  professeur: { variant: "brand", icon: <GraduationCap /> },
  eleve: { variant: "success", icon: <Backpack /> },
  etudiant: { variant: "success", icon: <Backpack /> },
  personnel: { variant: "warning", icon: <Briefcase /> },
};

export function RoleBadge({ role }: { role?: string | null }) {
  const key = (role ?? "").toLowerCase();
  const meta = ROLE_META[key] ?? { variant: "neutral" as BadgeVariant, icon: <User /> };
  return (
    <Badge variant={meta.variant} icon={meta.icon}>
      {role || "—"}
    </Badge>
  );
}

const PERMISSION_META: Record<string, { variant: BadgeVariant; icon: ReactNode; label: string }> = {
  lecture: { variant: "neutral", icon: <Eye />, label: "Lecture" },
  ecriture: { variant: "brand", icon: <PenLine />, label: "Écriture" },
  totale: { variant: "ink", icon: <KeyRound />, label: "Totale" },
};

export function PermissionBadge({ permission }: { permission?: string | null }) {
  const key = (permission ?? "").toLowerCase();
  const meta = PERMISSION_META[key];
  if (!meta) {
    return <Badge variant="neutral">{permission || "—"}</Badge>;
  }
  return (
    <Badge variant={meta.variant} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: "super_admin" | "utilisateur" }) {
  return type === "super_admin" ? (
    <Badge variant="ink" icon={<Shield />}>
      Super admin
    </Badge>
  ) : (
    <Badge variant="brand" icon={<User />}>
      Utilisateur
    </Badge>
  );
}

/* --------------------------------- Avatar ---------------------------------- */

const AVATAR_GRADIENTS = [
  "from-brand-400 to-brand-600",
  "from-ink-400 to-ink-700",
  "from-brand-300 to-ink-500",
  "from-sky-400 to-brand-600",
  "from-brand-500 to-ink-800",
];

export function initialsOf(value: string): string {
  const cleaned = value.replace(/^(SA|USR|ADM)-?/i, "").trim();
  if (cleaned.includes(" ") || cleaned.includes("_")) {
    const parts = cleaned.split(/[\s_]+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p[0] ?? "")
      .join("")
      .toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

export function Avatar({
  label,
  size = "md",
  className,
}: {
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const hash = Array.from(label).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const gradient = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-display font-semibold text-white ring-2 ring-white",
        gradient,
        size === "sm" && "h-8 w-8 text-[11px]",
        size === "md" && "h-10 w-10 text-xs",
        size === "lg" && "h-16 w-16 text-xl",
        className,
      )}
    >
      {initialsOf(label)}
    </span>
  );
}

/* ------------------------------ Sélecteur segmenté -------------------------- */

export interface SegmentOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export function Segmented({
  options,
  value,
  onChange,
  layoutId,
  className,
}: {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  layoutId: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl bg-ink-100/80 p-1 ring-1 ring-ink-900/5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold tracking-tight transition-colors duration-200 [&>svg]:h-3.5 [&>svg]:w-3.5",
              active ? "text-brand-700" : "text-ink-500 hover:text-ink-800",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-white shadow-card ring-1 ring-ink-900/5"
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5 [&>svg]:h-3.5 [&>svg]:w-3.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------- États & divers ----------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-400 ring-1 ring-brand-100 [&>svg]:h-6 [&>svg]:w-6">
        {icon ?? <Inbox />}
      </div>
      <p className="font-display text-[15px] font-semibold tracking-tight text-ink-800">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-brand-400", className)} />;
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border border-ink-900/8 bg-white shadow-card", className)}>
      {children}
    </div>
  );
}

export function SkeletonRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 px-5 py-5">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={cn(
                "h-4 animate-pulse rounded-md bg-ink-100",
                c === 0 ? "w-40" : "flex-1",
                r % 3 === 1 && c === 0 && "w-32",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
