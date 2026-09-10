import { NavLink } from "react-router-dom";
import { LayoutDashboard, LogOut, Settings, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { cn } from "@/utils/cn";
import { Avatar, Badge } from "./ui";

function NavItem({
  to,
  icon,
  label,
  end,
  onNavigate,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium tracking-tight transition-all duration-200 [&>svg]:h-4.5 [&>svg]:w-4.5 [&>svg]:shrink-0",
          isActive
            ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-[0_10px_28px_-10px_rgb(51_95_138/0.9)]"
            : "text-ink-300 hover:bg-white/6 hover:text-white",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-300" />
          )}
          {icon}
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function StatusChip() {
  const { apiStatus } = useData();
  const meta = {
    demo: { dot: "bg-amber-400", ring: "ring-amber-400/20", text: "text-amber-300", label: "Mode démo" },
    connecte: { dot: "bg-emerald-400", ring: "ring-emerald-400/20", text: "text-emerald-300", label: "API connectée" },
    "hors-ligne": { dot: "bg-red-400", ring: "ring-red-400/20", text: "text-red-300", label: "API hors ligne" },
    inconnu: { dot: "bg-ink-400", ring: "ring-ink-400/20", text: "text-ink-300", label: "Initialisation" },
  }[apiStatus];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-white/4 px-3 py-1.5 text-[11px] font-semibold ring-1",
        meta.ring,
        meta.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot, apiStatus !== "hors-ligne" && "animate-pulse")} />
      {meta.label}
    </span>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { session, logout } = useAuth();
  const isSuperAdmin = session?.type === "super_admin";

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-ink-900 text-white">
      {/* Halo et motif décoratifs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 pattern-grid opacity-60" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-ink-950 to-transparent" />

      {/* Marque */}
      <div className="relative flex items-center gap-3 px-6 pb-6 pt-7">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
          <ShieldCheck className="h-5.5 w-5.5 text-white" strokeWidth={2.2} />
        </div>
        <div>
          <p className="font-display text-lg font-bold leading-none tracking-[0.18em]">GERUNIV</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.22em] text-brand-300">
            Console admin
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 space-y-6 overflow-y-auto px-4 pb-4 dark-scroll">
        <div>
          <p className="mb-2 px-3.5 text-[10px] font-bold uppercase tracking-[0.24em] text-ink-400">
            Pilotage
          </p>
          <div className="space-y-1">
            <NavItem to="/" end icon={<LayoutDashboard />} label="Accueil" onNavigate={onNavigate} />
            {isSuperAdmin && (
              <NavItem to="/comptes" icon={<Users />} label="Comptes" onNavigate={onNavigate} />
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 px-3.5 text-[10px] font-bold uppercase tracking-[0.24em] text-ink-400">
            Personnel
          </p>
          <div className="space-y-1">
            <NavItem to="/profil" icon={<Settings />} label="Mon compte" onNavigate={onNavigate} />
          </div>
        </div>
      </nav>

      {/* Pied de barre : session */}
      <div className="relative space-y-3 px-4 pb-5">
        <StatusChip />
        <div className="rounded-2xl bg-white/5 p-3.5 ring-1 ring-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Avatar label={session?.profile.nom || session?.profile.matricule || "?"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight">
                {session?.profile.nom || session?.profile.matricule}
              </p>
              <p className="truncate text-xs text-ink-300">{session?.profile.matricule}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
          {isSuperAdmin && (
            <div className="mt-3">
              <Badge variant="brand" icon={<ShieldCheck />} className="!bg-brand-500/15 !text-brand-200 !ring-brand-400/20">
                Super administrateur
              </Badge>
            </div>
          )}
        </div>
        <p className="px-1 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-ink-500">
          Flask-RESTX · JWT
        </p>
      </div>
    </div>
  );
}
