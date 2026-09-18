import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Grid3X3,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useToast } from "@/components/Toast";
import { ResourceManager } from "@/components/ResourceManager";
import { EntityFormModal } from "@/components/EntityFormModal";
import { Badge, Button, Card, EmptyState, SkeletonRows } from "@/components/ui";
import { ConfirmDialog } from "@/components/Modal";
import type { Classe, Matiere } from "@/lib/types";
import { ResultatsClasseDetail } from "@/components/ClasseDetailDirecteur";
import { useAuth } from "@/context/AuthContext";
import { telechargerResultatsPdf } from "@/lib/pdf";

export default function Classes() {
  const { session } = useAuth();
  const {
    classes,
    matieres,
    etablissements,
    etudiants,
    affectations,
    professeurs,
    loading,
    createClasse,
    updateClasse,
    deleteClasse,
    createMatiere,
    updateMatiere,
    deleteMatiere,
    fetchResultatsClasse,
  } = useData();
  const toast = useToast();

  const [matiereOpen, setMatiereOpen] = useState(false);
  const [editingMatiere, setEditingMatiere] = useState<Matiere | null>(null);
  const [deletingMatiere, setDeletingMatiere] = useState<Matiere | null>(null);
  const [classeDetail, setClasseDetail] = useState<number | null>(null);
  const [classeFormOpen, setClasseFormOpen] = useState(false);
  const [editingClasse, setEditingClasse] = useState<Classe | null>(null);
  const [deletingClasse, setDeletingClasse] = useState<Classe | null>(null);
  const [resultats, setResultats] = useState<Awaited<
    ReturnType<typeof fetchResultatsClasse>
  > | null>(null);
  const [resultatsBusy, setResultatsBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);

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

  /** Ouvre le détail d'une classe et charge ses résultats. */
  const ouvrirDetail = async (idClasse: number) => {
    if (classeDetail === idClasse) {
      setClasseDetail(null);
      setResultats(null);
      return;
    }
    setClasseDetail(idClasse);
    setResultats(null);
    setResultatsBusy(true);
    try {
      const data = await fetchResultatsClasse(idClasse);
      setResultats(data);
    } catch (err) {
      toast.error(
        "Résultats indisponibles",
        err instanceof Error ? err.message : "Erreur inconnue.",
      );
      setClasseDetail(null);
    } finally {
      setResultatsBusy(false);
    }
  };

  const exporterPdf = () => {
    if (!resultats) return;
    setExportBusy(true);
    telechargerResultatsPdf({
      etablissement: resultats.etablissement?.nom ?? "",
      classe: resultats.classe.nom_classe,
      semestre: resultats.semestre,
      matieres: resultats.matieres,
      classementGeneral: resultats.classement_general,
    });
    setExportBusy(false);
  };

  const estDirecteur = session?.type === "directeur";

  /* ============== Vue directrice : grille de classes cliquables ============== */
  if (estDirecteur) {
    const idEtabDirecteur = session?.profile.id_etablissement;
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h1 className="font-display text-[26px] font-bold tracking-tight text-ink-900 sm:text-[32px]">
              Mes classes
            </h1>
            <p className="mt-1.5 text-sm text-ink-400">
              Créez toutes les classes de votre établissement, leurs matières et leurs
              coefficients. Cliquez sur une classe pour voir ses étudiants et le classement des
              résultats.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Badge variant="brand" icon={<Grid3X3 />}>
              {classes.length} classe(s)
            </Badge>
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditingClasse(null);
                setClasseFormOpen(true);
              }}
            >
              Nouvelle classe
            </Button>
          </div>
        </motion.div>

        {loading ? (
          <SkeletonRows rows={4} cols={3} />
        ) : classes.length === 0 ? (
          <Card>
            <EmptyState
              icon={<BookOpen />}
              title="Aucune classe"
              description="Créez votre première classe pour organiser votre établissement."
              action={
                <Button
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => {
                    setEditingClasse(null);
                    setClasseFormOpen(true);
                  }}
                >
                  Créer une classe
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {classes.map((classe, i) => {
              const eleves = etudiants.filter((e) => e.id_classe === classe.id_classe);
              const mats = matieres.filter((m) => m.id_classe === classe.id_classe);
              const profsIds = new Set(
                affectations
                  .filter((a) => a.id_classe === classe.id_classe)
                  .map((a) => a.id_professeur),
              );
              return (
                <motion.div
                  key={classe.id_classe}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.06, duration: 0.4 }}
                >
                  <Card
                    className="group cursor-pointer p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift"
                  >
                    <button
                      type="button"
                      onClick={() => void ouvrirDetail(classe.id_classe)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <h3 className="font-display text-lg font-bold tracking-tight text-ink-900">
                            {classe.nom_classe}
                          </h3>
                          <p className="text-xs text-ink-400">
                            {etabName.get(classe.id_etablissement)}
                            {classe.niveau ? ` · ${classe.niveau}` : ""}
                          </p>
                        </div>
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition-transform group-hover:scale-105 [&>svg]:h-5 [&>svg]:w-5">
                          <Users />
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant="brand">{eleves.length} étudiant(s)</Badge>
                        <Badge variant="neutral">{mats.length} matière(s)</Badge>
                        <Badge variant="ink">{profsIds.size} prof(s)</Badge>
                      </div>
                    </button>
                    <div className="mt-4 flex items-center justify-between border-t border-ink-900/5 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClasse(classe);
                          setClasseFormOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-brand-600 transition-colors hover:bg-brand-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Modifier
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMatiere(null);
                            setMatiereOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-ink-600 transition-colors hover:bg-ink-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Matière
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingClasse(classe)}
                          className="rounded-lg p-1.5 text-ink-300 transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label="Supprimer la classe"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Formulaire classe (création / édition) */}
        <EntityFormModal
          open={classeFormOpen}
          onClose={() => setClasseFormOpen(false)}
          title={editingClasse ? "Modifier la classe" : "Nouvelle classe"}
          subtitle="La classe sera rattachée à votre établissement."
          fields={[
            {
              name: "nom_classe",
              label: "Nom de la classe",
              required: true,
              placeholder: "2nde A",
            },
            { name: "niveau", label: "Niveau", placeholder: "2nde" },
          ]}
          initial={editingClasse as unknown as Record<string, unknown> | undefined}
          onSubmit={async (v) => {
            if (!idEtabDirecteur) {
              toast.error("Établissement inconnu", "Votre compte n'est rattaché à aucun établissement.");
              return;
            }
            const payload = {
              nom_classe: String(v.nom_classe),
              niveau: v.niveau ? String(v.niveau) : undefined,
              id_etablissement: idEtabDirecteur,
            };
            if (editingClasse) {
              await updateClasse(editingClasse.id_classe, {
                nom_classe: payload.nom_classe,
                niveau: payload.niveau,
              });
              toast.success("Classe mise à jour", payload.nom_classe);
            } else {
              await createClasse(payload);
              toast.success("Classe créée", payload.nom_classe);
            }
          }}
        />

        {/* Formulaire matière (création / édition) */}
        <EntityFormModal
          open={matiereOpen}
          onClose={() => setMatiereOpen(false)}
          title={editingMatiere ? "Modifier la matière" : "Nouvelle matière"}
          subtitle="Le coefficient est spécifique à la classe choisie."
          fields={[
            {
              name: "nom_matiere",
              label: "Nom de la matière",
              required: true,
              placeholder: "Mathématiques",
            },
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
                label: c.nom_classe,
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

        {/* Confirmation suppression de classe */}
        <ConfirmDialog
          open={Boolean(deletingClasse)}
          onClose={() => setDeletingClasse(null)}
          onConfirm={async () => {
            if (!deletingClasse) return;
            try {
              await deleteClasse(deletingClasse.id_classe);
              toast.success("Classe supprimée", deletingClasse.nom_classe);
              setDeletingClasse(null);
            } catch (err) {
              toast.error(
                "Échec de la suppression",
                err instanceof Error ? err.message : "Erreur inconnue.",
              );
            }
          }}
          title="Supprimer cette classe ?"
          message={
            <>
              La classe{" "}
              <span className="font-semibold text-ink-800">{deletingClasse?.nom_classe}</span>, ses
              matières, ses étudiants et toutes leurs notes seront supprimés.
            </>
          }
        />

        {/* Confirmation suppression de matière */}
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

        {/* Détail de la classe sélectionnée */}
        {classeDetail && (
          <ResultatsClasseDetail
            idClasse={classeDetail}
            resultats={resultats}
            busy={resultatsBusy}
            matieres={matieres}
            etudiants={etudiants}
            affectations={affectations}
            professeurs={professeurs}
            onClose={() => {
              setClasseDetail(null);
              setResultats(null);
            }}
            onExportPdf={exporterPdf}
            exportBusy={exportBusy}
          />
        )}
      </div>
    );
  }

  /* ========== Vue super admin : gestion complète (inchangée) ========== */
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
            render: (c) => matieres.filter((m) => m.id_classe === c.id_classe).length,
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[11px] font-bold text-brand-600 ring-1 ring-brand-100">
                            ×{m.coefficient}
                          </div>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-800">
                            {m.nom_matiere}
                          </span>
                          <button
                            onClick={() => {
                              setEditingMatiere(m);
                              setMatiereOpen(true);
                            }}
                            className="shrink-0 rounded-lg p-1.5 text-[12px] font-semibold text-brand-600 hover:bg-brand-50"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => setDeletingMatiere(m)}
                            className="shrink-0 rounded-lg p-1.5 text-ink-300 hover:bg-red-50 hover:text-red-600"
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
