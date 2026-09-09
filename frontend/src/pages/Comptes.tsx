import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CloudOff,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  SlidersHorizontal,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useToast } from "@/components/Toast";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  PermissionBadge,
  RoleBadge,
  Segmented,
  SkeletonRows,
  TypeBadge,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/Modal";
import { AccountFormModal, type AccountKind } from "@/components/AccountFormModal";
import type { SuperAdmin, Utilisateur } from "@/lib/types";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 8;

interface Row {
  id: number;
  kind: AccountKind;
  title: string;
  sub: string;
  matricule: string;
  role?: string;
  classe?: string;
  permission?: string;
  date?: string;
  raw: SuperAdmin | Utilisateur;
}

function Forbidden() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md p-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-600 to-ink-900 text-brand-200 shadow-lift">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <h1 className="font-display text-xl font-bold tracking-tight text-ink-900">
          Accès réservé aux super administrateurs
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-400">
          La gestion des comptes requiert une session super admin. Reconnectez-vous avec un
          matricule disposant de ce niveau d'accès.
        </p>
        <Link to="/">
          <Button variant="secondary" className="mt-6">
            Retour à l'accueil
          </Button>
        </Link>
      </Card>
    </div>
  );
}

export default function Comptes() {
  const { session } = useAuth();
  const data = useData();
  const toast = useToast();

  const [view, setView] = useState<"tous" | "utilisateurs" | "admins">("tous");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("tous");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formKind, setFormKind] = useState<AccountKind>("utilisateur");
  const [editing, setEditing] = useState<SuperAdmin | Utilisateur | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const isSuperAdmin = session?.type === "super_admin";

  const roles = useMemo(
    () => Array.from(new Set(data.utilisateurs.map((u) => u.role).filter(Boolean))).sort(),
    [data.utilisateurs],
  );

  const rows = useMemo<Row[]>(() => {
    const userRows: Row[] = data.utilisateurs.map((u) => ({
      id: u.id,
      kind: "utilisateur",
      title: u.nom || u.matricule,
      sub: u.matricule,
      matricule: u.matricule,
      role: u.role,
      classe: u.classe,
      permission: u.permission,
      date: u.date_creation,
      raw: u,
    }));
    const adminRows: Row[] = data.admins.map((a) => ({
      id: a.id,
      kind: "admin",
      title: a.matricule,
      sub: "Super administrateur",
      matricule: a.matricule,
      role: "super_admin",
      date: a.date_creation,
      raw: a,
    }));
    return [...userRows, ...adminRows].sort(
      (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
    );
  }, [data.utilisateurs, data.admins]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (view === "utilisateurs" && row.kind !== "utilisateur") return false;
      if (view === "admins" && row.kind !== "admin") return false;
      if (roleFilter !== "tous" && row.role !== roleFilter) return false;
      if (!q) return true;
      return [row.title, row.sub, row.matricule, row.role ?? "", row.classe ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, view, query, roleFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openCreate = () => {
    setFormKind("utilisateur");
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: Row) => {
    setFormKind(row.kind);
    setEditing(row.raw);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      if (deleting.kind === "utilisateur") await data.deleteUtilisateur(deleting.id);
      else await data.deleteAdmin(deleting.id);
      toast.success(
        "Compte supprimé",
        `${deleting.matricule} a été définitivement retiré.`,
      );
      setDeleting(null);
    } catch (err) {
      toast.error(
        "Échec de la suppression",
        err instanceof Error ? err.message : "Une erreur est survenue.",
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!isSuperAdmin) return <Forbidden />;

  const updateView = (v: string) => {
    setView(v as typeof view);
    setPage(1);
  };

  return (
    <div className="relative space-y-6">
      {/* En-tête */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-ink-900 sm:text-[32px]">
            Comptes
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-ink-400">
            Tous les comptes des namespaces{" "}
            <span className="font-mono text-[12px] text-brand-600">/super_admin</span> et{" "}
            <span className="font-mono text-[12px] text-brand-600">/utilisateurs</span> —{" "}
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}.
          </p>
        </div>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          Nouveau compte
        </Button>
      </motion.div>

      {/* Barre d'outils */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.45 }}
      >
        <Card className="flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            layoutId="comptes-view"
            value={view}
            onChange={updateView}
            options={[
              { value: "tous", label: "Tous", icon: <Users /> },
              { value: "utilisateurs", label: "Utilisateurs", icon: <User /> },
              { value: "admins", label: "Super admins", icon: <Shield /> },
            ]}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Rechercher nom, matricule, rôle…"
                className="h-10 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-300 outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-100 sm:w-72"
              />
            </div>
            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full appearance-none rounded-xl border border-ink-200 bg-white pl-10 pr-9 text-sm font-medium capitalize text-ink-700 outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              >
                <option value="tous">Tous les rôles</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <ChevronDownSmall />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Erreur API */}
      {data.error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="flex flex-col items-start gap-4 border-red-200 bg-red-50/60 p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <CloudOff className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-red-800">Synchronisation impossible</p>
                <p className="text-[13px] text-red-600">{data.error}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="sm:ml-auto"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => void data.reload()}
            >
              Réessayer
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Tableau / liste */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.45 }}
      >
        <Card className="overflow-hidden">
          {data.loading ? (
            <SkeletonRows rows={6} cols={5} />
          ) : paginated.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="Aucun compte trouvé"
              description={
                query || roleFilter !== "tous"
                  ? "Ajustez votre recherche ou réinitialisez les filtres."
                  : "Créez votre premier compte pour démarrer."
              }
              action={
                <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                  Nouveau compte
                </Button>
              }
            />
          ) : (
            <>
              {/* Vue bureau */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-ink-900/6 bg-ink-50/60">
                      {["Compte", "Type", "Rôle", "Classe", "Permission", "Créé le", ""].map(
                        (h, i) => (
                          <th
                            key={i}
                            className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((row) => (
                      <tr
                        key={`${row.kind}-${row.id}`}
                        className="group border-b border-ink-900/4 transition-colors last:border-0 hover:bg-brand-50/40"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar label={row.title} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold tracking-tight text-ink-900">
                                {row.title}
                              </p>
                              <p className="truncate text-xs text-ink-400">{row.sub}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <TypeBadge type={row.kind === "admin" ? "super_admin" : "utilisateur"} />
                        </td>
                        <td className="px-5 py-3.5">
                          <RoleBadge role={row.role} />
                        </td>
                        <td className="px-5 py-3.5">
                          {row.classe && row.classe !== "aucune" ? (
                            <Badge variant="neutral" className="uppercase">
                              {row.classe}
                            </Badge>
                          ) : (
                            <span className="text-sm text-ink-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {row.kind === "utilisateur" ? (
                            <PermissionBadge permission={row.permission} />
                          ) : (
                            <span className="text-sm text-ink-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-sm tabular-nums text-ink-500">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => openEdit(row)}
                              className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-brand-100 hover:text-brand-600"
                              aria-label="Modifier"
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleting(row)}
                              className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label="Supprimer"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vue mobile */}
              <div className="divide-y divide-ink-900/5 md:hidden">
                {paginated.map((row) => (
                  <div key={`${row.kind}-${row.id}`} className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar label={row.title} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold tracking-tight text-ink-900">
                          {row.title}
                        </p>
                        <p className="truncate text-xs text-ink-400">{row.sub}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(row)}
                          className="rounded-lg p-2 text-ink-400 hover:bg-brand-100 hover:text-brand-600"
                          aria-label="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(row)}
                          className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <TypeBadge type={row.kind === "admin" ? "super_admin" : "utilisateur"} />
                      <RoleBadge role={row.role} />
                      {row.kind === "utilisateur" && (
                        <PermissionBadge permission={row.permission} />
                      )}
                      {row.classe && row.classe !== "aucune" && (
                        <Badge variant="neutral" className="uppercase">
                          {row.classe}
                        </Badge>
                      )}
                      <span className="ml-auto text-[11px] text-ink-300">
                        {formatDate(row.date)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between gap-4 border-t border-ink-900/6 px-5 py-3.5">
                <p className="text-[13px] text-ink-400">
                  Page <span className="font-semibold text-ink-800">{currentPage}</span> sur{" "}
                  {pageCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    aria-label="Page précédente"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    disabled={currentPage >= pageCount}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Page suivante"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </motion.div>

      <AccountFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        kind={formKind}
        account={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteBusy}
        title="Supprimer ce compte ?"
        message={
          <>
            Le compte{" "}
            <span className="font-semibold text-ink-800">{deleting?.matricule}</span>{" "}
            {deleting?.kind === "admin"
              ? "perdra définitivement ses privilèges d'administration"
              : "sera définitivement retiré des utilisateurs"}{" "}
            via <span className="font-mono text-[12px]">DELETE</span>. Cette action est
            irréversible.
          </>
        }
      />
    </div>
  );
}

function ChevronDownSmall() {
  return (
    <svg
      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
