import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Clock3,
  Layers,
  Plus,
  RefreshCw,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import {
  Avatar,
  Button,
  Card,
  PermissionBadge,
  RoleBadge,
  SkeletonRows,
  TypeBadge,
} from "@/components/ui";
import { AccountFormModal } from "@/components/AccountFormModal";
import { formatRelative, greeting } from "@/lib/format";
import { cn } from "@/utils/cn";

/* ------------------------------ Compteur animé ------------------------------ */

function useCountUp(target: number, active: boolean, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}

function StatCard({
  icon,
  label,
  value,
  source,
  active,
  delay,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  source: string;
  active: boolean;
  delay: number;
}) {
  const display = useCountUp(value, active);
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="group relative overflow-hidden p-5 transition-shadow duration-300 hover:shadow-lift">
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand-100/60 blur-2xl transition-opacity duration-300 group-hover:bg-brand-200/70" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[13px] font-semibold tracking-tight text-ink-400">{label}</p>
            <p className="mt-2 font-display text-[34px] font-bold leading-none tracking-tight text-ink-900">
              {active ? display : "—"}
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink-300">
              {source}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-ink-700 text-white shadow-[0_10px_22px_-8px_rgb(51_95_138/0.7)] [&>svg]:h-5 [&>svg]:w-5">
            {icon}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/* --------------------------------- Page ------------------------------------ */

export default function Accueil() {
  const { session } = useAuth();
  const { utilisateurs, admins, loading, reload } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const isSuperAdmin = session?.type === "super_admin";
  const ready = !loading;

  const distinctRoles = useMemo(
    () => new Set(utilisateurs.map((u) => u.role).filter(Boolean)).size,
    [utilisateurs],
  );
  const distinctClasses = useMemo(
    () => new Set(utilisateurs.map((u) => u.classe).filter((c) => c && c !== "aucune")).size,
    [utilisateurs],
  );

  const roleDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    utilisateurs.forEach((u) => {
      const key = u.role || "inconnu";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [utilisateurs]);

  const recentAccounts = useMemo(() => {
    const rows = [
      ...utilisateurs.map((u) => ({
        key: `u-${u.id}`,
        label: u.nom || u.matricule,
        sub: u.matricule,
        date: u.date_creation,
        kind: "utilisateur" as const,
        role: u.role,
      })),
      ...admins.map((a) => ({
        key: `a-${a.id}`,
        label: a.matricule,
        sub: "Super administrateur",
        date: a.date_creation,
        kind: "super_admin" as const,
        role: "super_admin",
      })),
    ];
    return rows
      .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
      .slice(0, 6);
  }, [utilisateurs, admins]);

  const handleSync = async () => {
    setSyncing(true);
    await reload();
    setSyncing(false);
  };

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const displayName = session?.profile.nom || session?.profile.matricule || "";

  return (
    <div className="relative space-y-7">
      {/* En-tête */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-[13px] font-medium capitalize text-ink-400">{today}</p>
          <h1 className="mt-1 font-display text-[28px] font-bold tracking-tight text-ink-900 sm:text-[32px]">
            {greeting()}, <span className="text-brand-600">{displayName}</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-ink-400">
            {isSuperAdmin
              ? "Vue d'ensemble des comptes gérés par les namespaces super_admin et utilisateurs."
              : "Bienvenue sur votre espace. La gestion des comptes est réservée aux super administrateurs."}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleSync()}
            icon={<RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />}
          >
            Synchroniser
          </Button>
          {isSuperAdmin && (
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
              Nouveau compte
            </Button>
          )}
        </div>
      </motion.div>

      {isSuperAdmin ? (
        <>
          {/* Statistiques */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<Users />}
              label="Utilisateurs"
              value={utilisateurs.length}
              source="GET /utilisateurs/"
              active={ready}
              delay={0.05}
            />
            <StatCard
              icon={<Shield />}
              label="Super admins"
              value={admins.length}
              source="GET /super_admin/"
              active={ready}
              delay={0.12}
            />
            <StatCard
              icon={<UserRound />}
              label="Rôles distincts"
              value={distinctRoles}
              source="Champ role"
              active={ready}
              delay={0.19}
            />
            <StatCard
              icon={<Layers />}
              label="Classes actives"
              value={distinctClasses}
              source="Champ classe"
              active={ready}
              delay={0.26}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
            {/* Répartition des rôles */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="xl:col-span-3"
            >
              <Card className="h-full p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-900">
                      <BarChart3 className="h-4.5 w-4.5 text-brand-500" />
                      Répartition par rôle
                    </h2>
                    <p className="mt-0.5 text-[13px] text-ink-400">
                      Distribution des utilisateurs selon leur fonction.
                    </p>
                  </div>
                </div>
                {loading ? (
                  <SkeletonRows rows={4} cols={2} />
                ) : roleDistribution.length === 0 ? (
                  <p className="py-10 text-center text-sm text-ink-400">
                    Aucun utilisateur à analyser pour le moment.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {roleDistribution.map(({ role, count }, i) => {
                      const max = roleDistribution[0]?.count ?? 1;
                      return (
                        <div key={role}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <RoleBadge role={role} />
                            <span className="text-[13px] font-semibold tabular-nums text-ink-700">
                              {count}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(6, (count / max) * 100)}%` }}
                              transition={{ delay: 0.45 + i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Comptes récents */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.5 }}
              className="xl:col-span-2"
            >
              <Card className="h-full p-6">
                <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-900">
                  <Clock3 className="h-4.5 w-4.5 text-brand-500" />
                  Derniers comptes créés
                </h2>
                <p className="mt-0.5 text-[13px] text-ink-400">
                  Triés par date de création décroissante.
                </p>
                <div className="mt-5 space-y-1.5">
                  {loading ? (
                    <SkeletonRows rows={4} cols={2} />
                  ) : recentAccounts.length === 0 ? (
                    <p className="py-10 text-center text-sm text-ink-400">
                      Aucun compte récent.
                    </p>
                  ) : (
                    recentAccounts.map((row, i) => (
                      <motion.div
                        key={row.key}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 + i * 0.06, duration: 0.4 }}
                        className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-brand-50/60"
                      >
                        <Avatar label={row.label} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold tracking-tight text-ink-900">
                            {row.label}
                          </p>
                          <p className="truncate text-xs text-ink-400">{row.sub}</p>
                        </div>
                        <div className="text-right">
                          <TypeBadge type={row.kind} />
                          <p className="mt-1 text-[11px] text-ink-300">
                            {formatRelative(row.date)}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        </>
      ) : (
        /* ------------------------- Vue utilisateur simple ------------------------ */
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Card className="overflow-hidden">
            <div className="relative border-b border-ink-900/6 bg-gradient-to-r from-ink-800 to-brand-700 px-7 py-8">
              <div className="pointer-events-none absolute inset-0 pattern-grid opacity-40" />
              <div className="relative flex flex-wrap items-center gap-5">
                <Avatar label={displayName} size="lg" className="!ring-4 !ring-white/20" />
                <div className="text-white">
                  <p className="font-display text-2xl font-bold tracking-tight">{displayName}</p>
                  <p className="mt-1 font-mono text-sm text-brand-200">
                    {session?.profile.matricule}
                  </p>
                </div>
                <div className="ml-auto">
                  <RoleBadge role={session?.profile.role} />
                </div>
              </div>
            </div>
            <div className="grid gap-6 px-7 py-7 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">Classe</p>
                <p className="mt-1.5 text-sm font-semibold capitalize text-ink-800">
                  {session?.profile.classe || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">
                  Permission
                </p>
                <div className="mt-1.5">
                  <PermissionBadge permission={session?.profile.permission} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">
                  Identifiant
                </p>
                <p className="mt-1.5 text-sm font-semibold tabular-nums text-ink-800">
                  #{session?.profile.id}
                </p>
              </div>
            </div>
          </Card>
          <p className="mt-4 flex items-center gap-2 text-[13px] text-ink-400">
            <Shield className="h-4 w-4 text-brand-500" />
            La consultation et la gestion des comptes sont réservées aux super administrateurs.
          </p>
        </motion.div>
      )}

      <AccountFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        kind="utilisateur"
        account={null}
      />
    </div>
  );
}
