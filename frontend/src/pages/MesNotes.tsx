import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  ClipboardList,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useToast } from "@/components/Toast";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  SkeletonRows,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/Modal";
import { Modal } from "@/components/Modal";
import { EntityFormModal } from "@/components/EntityFormModal";
import type { Note } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

const STATUT_VARIANT = {
  en_attente: "warning",
  traitee: "success",
  refusee: "danger",
} as const;

export default function MesNotes() {
  const { session } = useAuth();
  const {
    notes,
    matieres,
    classes,
    etudiants,
    affectations,
    demandesReleve,
    loading,
    createNote,
    deleteNote,
    createDemandeReleve,
  } = useData();
  const toast = useToast();

  const isEtudiant = session?.type === "etudiant";

  /* ------------------------------- Étudiant -------------------------------- */
  const mesNotes = useMemo(() => {
    if (!session) return [];
    if (isEtudiant) return notes.filter((n) => n.id_etudiant === session.profile.id);
    return [];
  }, [notes, session, isEtudiant]);

  const maClasse = useMemo(
    () => classes.find((c) => c.id_classe === session?.profile.id_classe),
    [classes, session],
  );

  const matieresDeMaClasse = useMemo(
    () => matieres.filter((m) => m.id_classe === session?.profile.id_classe),
    [matieres, session],
  );

  const mesDemandes = useMemo(
    () => demandesReleve.filter((d) => d.id_etudiant === session?.profile.id),
    [demandesReleve, session],
  );

  /* ------------------------------ Professeur -------------------------------- */
  const mesAffectations = useMemo(
    () => affectations.filter((a) => a.id_professeur === session?.profile.id),
    [affectations, session],
  );

  const mesMatieresIds = useMemo(
    () => new Set(mesAffectations.map((a) => a.id_matiere)),
    [mesAffectations],
  );

  const mesEtudiantsIds = useMemo(() => {
    const classesIds = new Set(mesAffectations.map((a) => a.id_classe));
    return new Set(etudiants.filter((e) => classesIds.has(e.id_classe)).map((e) => e.id_etudiant));
  }, [mesAffectations, etudiants]);

  const notesVisibles = useMemo(
    () =>
      notes.filter(
        (n) => mesMatieresIds.has(n.id_matiere) && mesEtudiantsIds.has(n.id_etudiant),
      ),
    [notes, mesMatieresIds, mesEtudiantsIds],
  );

  const [noteOpen, setNoteOpen] = useState(false);
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [demandeOpen, setDemandeOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const [demandeBusy, setDemandeBusy] = useState(false);

  const classeById = useMemo(() => new Map(classes.map((c) => [c.id_classe, c])), [classes]);
  const matiereById = useMemo(() => new Map(matieres.map((m) => [m.id_matiere, m])), [matieres]);
  const etudiantById = useMemo(
    () => new Map(etudiants.map((e) => [e.id_etudiant, e])),
    [etudiants],
  );

  const handleDemande = async (e: FormEvent) => {
    e.preventDefault();
    setDemandeBusy(true);
    try {
      await createDemandeReleve(motif.trim());
      toast.success(
        "Demande envoyée",
        "L'administration traitera votre demande de relevé de notes.",
      );
      setMotif("");
      setDemandeOpen(false);
    } catch (err) {
      toast.error(
        "Échec de l'envoi",
        err instanceof Error ? err.message : "Une erreur est survenue.",
      );
    } finally {
      setDemandeBusy(false);
    }
  };

  if (!session) return null;

  /* ================================ ÉTUDIANT ================================ */
  if (isEtudiant) {
    const moyenne =
      mesNotes.length > 0
        ? mesNotes.reduce((acc, n) => acc + n.note, 0) / mesNotes.length
        : null;

    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h1 className="font-display text-[28px] font-bold tracking-tight text-ink-900 sm:text-[32px]">
              Mes notes
            </h1>
            <p className="mt-1.5 text-sm text-ink-400">
              {maClasse
                ? `Classe ${maClasse.nom_classe} · ${matieresDeMaClasse.length} matière(s)`
                : "Votre classe n'est pas encore définie."}
            </p>
          </div>
          <Button icon={<FileText className="h-4 w-4" />} onClick={() => setDemandeOpen(true)}>
            Demander un relevé de notes
          </Button>
        </motion.div>

        {moyenne !== null && (
          <Card className="flex items-center gap-5 p-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-ink-700 font-display text-xl font-bold text-white">
              {moyenne.toFixed(2)}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900">Moyenne simple</p>
              <p className="text-[13px] text-ink-400">
                Sur {mesNotes.length} note(s) enregistrée(s)
              </p>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          {loading ? (
            <SkeletonRows rows={4} cols={4} />
          ) : mesNotes.length === 0 ? (
            <EmptyState
              icon={<BookOpen />}
              title="Aucune note pour le moment"
              description="Vos notes apparaîtront ici dès que vos professeurs les auront saisies."
            />
          ) : (
            <div className="divide-y divide-ink-900/5">
              {mesNotes.map((n) => {
                const matiere = matiereById.get(n.id_matiere);
                return (
                  <div key={n.id_note} className="flex items-center gap-4 px-5 py-3.5">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ring-1 ${
                        n.note >= 10
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          : "bg-red-50 text-red-700 ring-red-100"
                      }`}
                    >
                      {n.note.toFixed(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {matiere?.nom_matiere ?? `Matière #${n.id_matiere}`}
                        {matiere && (
                          <span className="ml-2 text-xs font-medium text-ink-400">
                            coef. {matiere.coefficient}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-ink-400">
                        {n.type_evaluation} · {n.semestre} · {formatDateTime(n.date_saisie)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Mes demandes de relevé */}
        {mesDemandes.length > 0 && (
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-ink-900">
              <ClipboardList className="h-4.5 w-4.5 text-brand-500" />
              Mes demandes de relevé
            </h2>
            <ul className="divide-y divide-ink-900/5">
              {mesDemandes.map((d) => (
                <li key={d.id_demande} className="flex items-center gap-3 py-2.5">
                  <span className="flex-1 text-sm text-ink-700">
                    {d.motif || "Sans motif précisé"}
                  </span>
                  <Badge variant={STATUT_VARIANT[d.statut]}>
                    {d.statut.replace("_", " ")}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Modale demande de relevé */}
        <Modal
          open={demandeOpen}
          onClose={() => setDemandeOpen(false)}
          title="Demander un relevé de notes"
          subtitle="Votre demande sera transmise à l'administration."
          icon={<FileText />}
        >
          <form onSubmit={(e) => void handleDemande(e)} className="space-y-4">
            <Input
              label="Motif (facultatif)"
              placeholder="Dossier de bourse, inscription…"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
            />
            <div className="flex justify-end gap-3 border-t border-ink-900/6 pt-4">
              <Button type="button" variant="secondary" onClick={() => setDemandeOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" loading={demandeBusy}>
                Envoyer la demande
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  /* =============================== PROFESSEUR =============================== */
  const etudiantsDeMesClasses = etudiants.filter((e) => mesEtudiantsIds.has(e.id_etudiant));
  const mesMatieres = matieres.filter((m) => mesMatieresIds.has(m.id_matiere));

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-ink-900 sm:text-[32px]">
            Saisie des notes
          </h1>
          <p className="mt-1.5 text-sm text-ink-400">
            {mesAffectations.length === 0
              ? "Vous n'êtes affecté à aucune classe pour le moment."
              : `${mesAffectations.length} cours · ${etudiantsDeMesClasses.length} étudiant(s) concerné(s)`}
          </p>
        </div>
        {mesAffectations.length > 0 && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setNoteOpen(true)}>
            Ajouter une note
          </Button>
        )}
      </motion.div>

      {/* Mes cours */}
      {mesAffectations.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mesAffectations.map((a) => {
            const classe = classeById.get(a.id_classe);
            const matiere = matiereById.get(a.id_matiere);
            return (
              <Card key={a.id_affectation} className="p-5">
                <p className="font-display text-base font-semibold text-ink-900">
                  {matiere?.nom_matiere ?? `Matière #${a.id_matiere}`}
                </p>
                <p className="mt-1 text-sm text-ink-400">{classe?.nom_classe}</p>
                <p className="mt-3 text-xs font-medium text-ink-300">
                  {etudiants.filter((e) => e.id_classe === a.id_classe).length} étudiant(s)
                </p>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonRows rows={4} cols={4} />
        ) : notesVisibles.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="Aucune note saisie"
            description={
              mesAffectations.length === 0
                ? "Contactez l'administration pour être affecté à une classe."
                : "Ajoutez votre première note pour vos étudiants."
            }
          />
        ) : (
          <div className="divide-y divide-ink-900/5">
            {notesVisibles.map((n) => {
              const etu = etudiantById.get(n.id_etudiant);
              const matiere = matiereById.get(n.id_matiere);
              return (
                <div key={n.id_note} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-display text-sm font-bold text-brand-700 ring-1 ring-brand-100">
                    {n.note.toFixed(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {etu ? `${etu.prenom ?? ""} ${etu.nom}`.trim() : `Étudiant #${n.id_etudiant}`}
                    </p>
                    <p className="text-xs text-ink-400">
                      {matiere?.nom_matiere} · {n.type_evaluation} · {n.semestre}
                    </p>
                  </div>
                  <button
                    onClick={() => setDeletingNote(n)}
                    className="rounded-lg p-2 text-ink-300 hover:bg-red-50 hover:text-red-600"
                    aria-label="Supprimer la note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Formulaire de saisie d'une note */}
      <EntityFormModal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Ajouter une note"
        subtitle="Vous ne pouvez noter que les étudiants de vos classes, sur vos matières."
        fields={[
          {
            name: "id_etudiant",
            label: "Étudiant",
            required: true,
            options: etudiantsDeMesClasses.map((e) => ({
              value: String(e.id_etudiant),
              label: `${e.prenom ?? ""} ${e.nom} — ${classeById.get(e.id_classe)?.nom_classe ?? ""}`,
            })),
          },
          {
            name: "id_matiere",
            label: "Matière",
            required: true,
            options: mesMatieres.map((m) => ({
              value: String(m.id_matiere),
              label: `${m.nom_matiere} (coef ${m.coefficient})`,
            })),
          },
          {
            name: "note",
            label: "Note sur 20",
            type: "number",
            required: true,
            step: "0.25",
            placeholder: "15.5",
          },
          {
            name: "type_evaluation",
            label: "Type d'évaluation",
            options: [
              { value: "devoir", label: "Devoir" },
              { value: "composition", label: "Composition" },
              { value: "oral", label: "Oral" },
              { value: "tp", label: "TP" },
            ],
          },
          {
            name: "semestre",
            label: "Semestre",
            options: [
              { value: "S1", label: "Semestre 1" },
              { value: "S2", label: "Semestre 2" },
            ],
          },
        ]}
        onSubmit={async (v) => {
          await createNote({
            id_etudiant: Number(v.id_etudiant),
            id_matiere: Number(v.id_matiere),
            note: Number(v.note),
            type_evaluation: v.type_evaluation ? String(v.type_evaluation) : undefined,
            semestre: v.semestre ? String(v.semestre) : undefined,
          });
          toast.success("Note enregistrée", "L'étudiant peut la consulter immédiatement.");
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingNote)}
        onClose={() => setDeletingNote(null)}
        onConfirm={async () => {
          if (!deletingNote) return;
          try {
            await deleteNote(deletingNote.id_note);
            toast.success("Note supprimée");
            setDeletingNote(null);
          } catch (err) {
            toast.error("Échec", err instanceof Error ? err.message : "Erreur inconnue.");
          }
        }}
        title="Supprimer cette note ?"
        message="Cette action est irréversible."
      />
    </div>
  );
}
