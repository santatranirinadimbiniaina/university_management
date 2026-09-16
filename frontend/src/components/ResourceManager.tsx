import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { CloudOff, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useToast } from "./Toast";
import { Button, Card, EmptyState, SkeletonRows } from "./ui";
import { ConfirmDialog } from "./Modal";
import { EntityFormModal, type FieldDef } from "./EntityFormModal";

export interface ResourceColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
}

interface ResourceManagerProps<T> {
  title: string;
  description: string;
  entityLabel: string;
  rows: T[];
  loading: boolean;
  rowId: (row: T) => number;
  rowLabel: (row: T) => string;
  rowSub?: (row: T) => string;
  columns: ResourceColumn<T>[];
  searchFields: (row: T) => string;
  createFields: FieldDef[];
  editFields?: (row: T) => FieldDef[];
  createTitle: string;
  onCreate: (values: Record<string, string | number>) => Promise<void>;
  onUpdate?: (id: number, values: Record<string, string | number>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  toolbar?: ReactNode;
}

export function ResourceManager<T>({
  title,
  description,
  entityLabel,
  rows,
  loading,
  rowId,
  rowLabel,
  rowSub,
  columns,
  searchFields,
  createFields,
  editFields,
  createTitle,
  onCreate,
  onUpdate,
  onDelete,
  toolbar,
}: ResourceManagerProps<T>) {
  const { error, reload, apiStatus } = useData();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => searchFields(row).toLowerCase().includes(q));
  }, [rows, query, searchFields]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: T) => {
    if (!onUpdate || !editFields) return;
    setEditing(row);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await onDelete(rowId(deleting));
      toast.success("Suppression effectuée", `${rowLabel(deleting)} a été retiré.`);
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

  const handleSubmit = async (values: Record<string, string | number>) => {
    if (editing && onUpdate) {
      await onUpdate(rowId(editing), values);
      toast.success("Modification enregistrée", `${rowLabel(editing)} a été mis à jour.`);
    } else {
      await onCreate(values);
      toast.success("Création effectuée", `${entityLabel} créé avec succès.`);
    }
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
            {title}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-ink-400">{description}</p>
        </div>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          Nouveau
        </Button>
      </motion.div>

      {/* Barre d'outils */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.45 }}
      >
        <Card className="flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="h-10 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-300 outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            />
          </div>
          {toolbar}
        </Card>
      </motion.div>

      {/* Erreur API */}
      {(error || apiStatus === "hors-ligne") && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="flex flex-col items-start gap-4 border-red-200 bg-red-50/60 p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <CloudOff className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-red-800">Synchronisation impossible</p>
                <p className="text-[13px] text-red-600">{error ?? "API injoignable."}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="sm:ml-auto"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => void reload()}
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
          {loading ? (
            <SkeletonRows rows={6} cols={5} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={`Aucun élément trouvé`}
              description={
                query
                  ? "Ajustez votre recherche pour élargir les résultats."
                  : `Créez votre premier élément pour démarrer.`
              }
              action={
                <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                  Nouveau
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
                      {["Élément", ...columns.map((c) => c.header), ""].map((h, i) => (
                        <th
                          key={i}
                          className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr
                        key={rowId(row)}
                        className="group border-b border-ink-900/4 transition-colors last:border-0 hover:bg-brand-50/40"
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-semibold tracking-tight text-ink-900">
                            {rowLabel(row)}
                          </p>
                          {rowSub && <p className="text-xs text-ink-400">{rowSub(row)}</p>}
                        </td>
                        {columns.map((col, i) => (
                          <td key={i} className="px-5 py-3.5 text-sm text-ink-700">
                            {col.render(row)}
                          </td>
                        ))}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {onUpdate && editFields && (
                              <button
                                onClick={() => openEdit(row)}
                                className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-brand-100 hover:text-brand-600"
                                aria-label="Modifier"
                                title="Modifier"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
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
                {filtered.map((row) => (
                  <div key={rowId(row)} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold tracking-tight text-ink-900">
                          {rowLabel(row)}
                        </p>
                        {rowSub && <p className="truncate text-xs text-ink-400">{rowSub(row)}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        {onUpdate && editFields && (
                          <button
                            onClick={() => openEdit(row)}
                            className="rounded-lg p-2 text-ink-400 hover:bg-brand-100 hover:text-brand-600"
                            aria-label="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleting(row)}
                          className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </motion.div>

      <EntityFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Modifier ${entityLabel.toLowerCase()}` : createTitle}
        icon={<Plus />}
        fields={editing && editFields ? editFields(editing) : createFields}
        initial={editing as unknown as Record<string, unknown> | undefined}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteBusy}
        title="Supprimer cet élément ?"
        message={
          <>
            <span className="font-semibold text-ink-800">{deleting ? rowLabel(deleting) : ""}</span>{" "}
            sera définitivement supprimé. Cette action est irréversible.
          </>
        }
      />
    </div>
  );
}
