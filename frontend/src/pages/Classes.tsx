import { useMemo, useState } from "react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useData } from "@/context/DataContext";
import { useToast } from "@/components/Toast";
import { ResourceManager } from "@/components/ResourceManager";
import { EntityFormModal } from "@/components/EntityFormModal";
import { Badge, Button, Card, EmptyState, SkeletonRows } from "@/components/ui";
import { ConfirmDialog } from "@/components/Modal";
import type { Classe, Matiere } from "@/lib/types";

export default function Classes() {
  const {
    classes,
    matieres,
    etablissements,
    loading,
    createClasse,
    updateClasse,
    deleteClasse,
    createMatiere,
    updateMatiere,
    deleteMatiere,
  } = useData();
  const toast = useToast();

  const [matiereOpen, setMatiereOpen] = useState(false);
  const [editingMatiere, setEditingMatiere] = useState<Matiere | null>(null);
  const [deletingMatiere, setDeletingMatiere] = useState<Matiere | null>(null);

  const etabName = useMemo(
    () => new Map(etablissements.map((e) => [e.id_etablissement, e.nom])),
    [etablissements],
  );

  const classeFields = [
    {
      name: "nom_classe",
      label: "Nom de la classe",
      required: true,
      placeholder: "2nde A",
    },
    { name: "niveau", label: "Niveau", placeholder: "2nde" },
    {
      name: "id_etablissement",
      label: "Établissement",
      required: true,
      options: etablissements.map((e) => ({
        value: String(e.id_etablissement),
        label: e.nom,
      })),
    },
  ];

  return (
    <div className="space-y-8">
      <ResourceManager<Classe>
        title="Classes"
        description="Chaque classe appartient à un établissement et possède ses propres matières et coefficients."
        entityLabel="Classe"
        rows={classes}
        loading={loading}
        rowId={(c) => c.id_classe}
        rowLabel={(c) => c.nom_classe}
        rowSub={(c) => etabName.get(c.id_etablissement) ?? ""}
        searchFields={(c) => `${c.nom_classe} ${c.niveau ?? ""}`}
        createFields={classeFields}
        editFields={() => classeFields}
        createTitle="Nouvelle classe"
        onCreate={(v) =>
          createClasse({
            nom_classe: String(v.nom_classe),
            niveau: v.niveau ? String(v.niveau) : undefined,
            id_etablissement: Number(v.id_etablissement),
          })
        }
        onUpdate={(id, v) =>
          updateClasse(id, {
            nom_classe: String(v.nom_classe),
            niveau: v.niveau ? String(v.niveau) : undefined,
          })
        }
        onDelete={deleteClasse}
        columns={[
          { header: "Niveau", render: (c) => c.niveau || "—" },
          {
            header: "Matières",
            render: (c) =>
              matieres.filter((m) => m.id_classe === c.id_classe).length,
          },
        ]}
      />

      {/* Matières par classe */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-ink-900">
              Matières & coefficients
            </h2>
            <p className="mt-1 text-sm text-ink-400">
              Chaque classe définit ses propres coefficients — une même matière peut avoir un
              coefficient différent selon la classe.
            </p>
          </div>
          <Button
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditingMatiere(null);
              setMatiereOpen(true);
            }}
          >
            Nouvelle matière
          </Button>
        </div>

        {loading ? (
          <SkeletonRows rows={3} cols={4} />
        ) : classes.length === 0 ? (
          <Card>
            <EmptyState
              icon={<BookOpen />}
              title="Aucune classe"
              description="Créez d'abord une classe pour lui ajouter des matières."
            />
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {classes.map((classe) => {
              const sesMatieres = matieres.filter((m) => m.id_classe === classe.id_classe);
              return (
                <Card key={classe.id_classe} className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-semibold tracking-tight text-ink-900">
                        {classe.nom_classe}
                      </h3>
                      <p className="text-xs text-ink-400">
                        {etabName.get(classe.id_etablissement) ?? ""}
                      </p>
                    </div>
                    <Badge variant="brand">{sesMatieres.length} matière(s)</Badge>
                  </div>
                  {sesMatieres.length === 0 ? (
                    <p className="py-4 text-center text-sm text-ink-300">
                      Aucune matière pour cette classe.
                    </p>
                  ) : (
                    <ul className="divide-y divide-ink-900/5">
                      {sesMatieres.map((m) => (
                        <li key={m.id_matiere} className="flex items-center gap-3 py-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-[11px] font-bold text-brand-600 ring-1 ring-brand-100">
                            ×{m.coefficient}
                          </div>
                          <span className="flex-1 text-sm font-medium text-ink-800">
                            {m.nom_matiere}
                          </span>
                          <button
                            onClick={() => {
                              setEditingMatiere(m);
                              setMatiereOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-[12px] font-semibold text-brand-600 hover:bg-brand-50"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => setDeletingMatiere(m)}
                            className="rounded-lg p-1.5 text-ink-300 hover:bg-red-50 hover:text-red-600"
                            aria-label="Supprimer la matière"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Formulaire matière */}
      <EntityFormModal
        open={matiereOpen}
        onClose={() => setMatiereOpen(false)}
        title={editingMatiere ? "Modifier la matière" : "Nouvelle matière"}
        subtitle="Le coefficient est spécifique à la classe choisie."
        fields={[
          { name: "nom_matiere", label: "Nom de la matière", required: true, placeholder: "Mathématiques" },
          {
            name: "coefficient",
            label: "Coefficient",
            type: "number",
            required: true,
            step: "0.5",
            placeholder: "4",
          },
          {
            name: "id_classe",
            label: "Classe",
            required: true,
            options: classes.map((c) => ({
              value: String(c.id_classe),
              label: `${c.nom_classe} — ${etabName.get(c.id_etablissement) ?? ""}`,
            })),
          },
        ]}
        initial={editingMatiere as unknown as Record<string, unknown> | undefined}
        onSubmit={async (v) => {
          const payload = {
            nom_matiere: String(v.nom_matiere),
            coefficient: Number(v.coefficient),
            id_classe: Number(v.id_classe),
          };
          if (editingMatiere) {
            await updateMatiere(editingMatiere.id_matiere, payload);
            toast.success("Matière mise à jour", payload.nom_matiere);
          } else {
            await createMatiere(payload);
            toast.success("Matière créée", payload.nom_matiere);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingMatiere)}
        onClose={() => setDeletingMatiere(null)}
        onConfirm={async () => {
          if (!deletingMatiere) return;
          try {
            await deleteMatiere(deletingMatiere.id_matiere);
            toast.success("Matière supprimée", deletingMatiere.nom_matiere);
            setDeletingMatiere(null);
          } catch (err) {
            toast.error(
              "Échec de la suppression",
              err instanceof Error ? err.message : "Erreur inconnue.",
            );
          }
        }}
        title="Supprimer cette matière ?"
        message={
          <>
            La matière{" "}
            <span className="font-semibold text-ink-800">{deletingMatiere?.nom_matiere}</span> et
            toutes les notes associées seront supprimées.
          </>
        }
      />
    </div>
  );
}
