import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  Download,
  FileText,
  MessageSquareWarning,
  Plus,
  Trash2,
  Users,
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
import { telechargerBulletinPdf } from "@/lib/pdf";
import { cn } from "@/utils/cn";

const STATUT_VARIANT = {
  en_attente: "warning",
  traitee: "success",
  refusee: "danger",
  acceptee: "success",
} as const;

export default function MesNotes() {
  const { session } = useAuth();
  const {
    notes,
    matieres,
    classes,
    etudiants,
    affectations,
    etablissements,
    demandesReleve,
    reclamations,
    loading,
    createNote,
    deleteNote,
    createDemandeReleve,
    createReclamation,
    traiterReclamation,
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

  const monEtablissement = useMemo(
    () =>
      etablissements.find((e) => e.id_etablissement === maClasse?.id_etablissement) ?? null,
    [etablissements, maClasse],
  );

  const matieresDeMaClasse = useMemo(
    () => matieres.filter((m) => m.id_classe === session?.profile.id_classe),
    [matieres, session],
  );

  const matiereById = useMemo(() => new Map(matieres.map((m) => [m.id_matiere, m])), [matieres]);

  const mesDemandes = useMemo(
    () => demandesReleve.filter((d) => d.id_etudiant === session?.profile.id),
    [demandesReleve, session],
  );

  /* ------------------------------ Professeur -------------------------------- */
  const mesAffectations = useMemo(
    () => affectations.filter((a) => a.id_professeur === session?.profile.id),
    [affectations, session],
  );

  /** Mes classes regroupées avec la matière que j'y occupe. */
  const mesClasses = useMemo(() => {
    const map = new Map<number, { id_classe: number; nom: string; matieres: string[] }>();
    mesAffectations.forEach((a) => {
      const classe = classes.find((c) => c.id_classe === a.id_classe);
      const matiere = matiereById.get(a.id_matiere);
      const existante = map.get(a.id_classe);
      if (existante) {
        if (matiere) existante.matieres.push(matiere.nom_matiere);
      } else {
        map.set(a.id_classe, {
          id_classe: a.id_classe,
          nom: classe?.nom_classe ?? `Classe #${a.id_classe}`,
          matieres: matiere ? [matiere.nom_matiere] : [],
        });
      }
    });
    return [...map.values()];
  }, [mesAffectations, classes, matiereById]);

  const [classeOuverte, setClasseOuverte] = useState<number | null>(null);

  const mesMatieresIds = useMemo(
    () => new Set(mesAffectations.map((a) => a.id_matiere)),
    [mesAffectations],
  );

  const etudiantsDeClasse = (idClasse: number) =>
    etudiants.filter((e) => e.id_classe === idClasse);

  const notesVisibles = useMemo(() => {
    const mesClassesIds = new Set(mesAffectations.map((a) => a.id_classe));
    const mesEtudiantsIds = new Set(
      etudiants.filter((e) => mesClassesIds.has(e.id_classe)).map((e) => e.id_etudiant),
    );
    return notes.filter(
      (n) => mesMatieresIds.has(n.id_matiere) && mesEtudiantsIds.has(n.id_etudiant),
    );
  }, [notes, mesAffectations, etudiants, mesMatieresIds]);

  /** Réclamations sur mes notes (professeur). */
  const mesReclamations = useMemo(() => {
    if (session?.type !== "professeur") return [];
    const mesNotesIds = new Set(
      notes.filter((n) => n.id_professeur === session.profile.id).map((n) => n.id_note),
    );
    return reclamations.filter((r) => mesNotesIds.has(r.id_note));
  }, [reclamations, notes, session]);

  const reclamationsEnAttente = mesReclamations.filter((r) => r.statut === "en_attente");

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteClasseId, setNoteClasseId] = useState<number | null>(null);
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [reclamationOpen, setReclamationOpen] = useState(false);
  const [noteReclamer, setNoteReclamer] = useState<Note | null>(null);
  const [motifReclamation, setMotifReclamation] = useState("");
  const [traitement, setTraitement] = useState<{
    id_reclamation: number;
    id_note: number;
  } | null>(null);
  const [nouvelleNote, setNouvelleNote] = useState("");
  const [remarqueTraitement, setRemarqueTraitement] = useState("");
  const [traitementBusy, setTraitementBusy] = useState(false);
  const [demandeOpen, setDemandeOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const [demandeBusy, setDemandeBusy] = useState(false);

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

  const handleTraitement = async (statut: "acceptee" | "refusee") => {
    if (!traitement) return;
    setTraitementBusy(true);
    try {
      await traiterReclamation(traitement.id_reclamation, {
        statut,
        ...(statut === "acceptee" && nouvelleNote ? { nouvelle_note: Number(nouvelleNote) } : {}),
        ...(remarqueTraitement.trim() ? { remarque: remarqueTraitement.trim() } : {}),
      });
      toast.success(
        statut === "acceptee" ? "Réclamation acceptée" : "Réclamation refusée",
        statut === "acceptee" && nouvelleNote
          ? "La note a été corrigée."
          : "L'étudiant est informé de la décision.",
      );
      setTraitement(null);
      setNouvelleNote("");
      setRemarqueTraitement("");
    } catch (err) {
      toast.error(
        "Échec du traitement",
        err instanceof Error ? err.message : "Une erreur est survenue.",
      );
    } finally {
      setTraitementBusy(false);
    }
  };

  if (!session) return null;

  /* ================================ ÉTUDIANT ================================ */
  if (isEtudiant) {
    const moyenne =
      mesNotes.length > 0
        ? mesNotes.reduce((acc, n) => acc + n.note, 0) / mesNotes.length
        : null;

    const bulletin = useMemo(() => {
      const lignes = matieresDeMaClasse.map((m) => {
        const notesMatiere = mesNotes.filter((n) => n.id_matiere === m.id_matiere);
        const moy =
          notesMatiere.length > 0
            ? notesMatiere.reduce((acc, n) => acc + n.note, 0) / notesMatiere.length
            : null;
        return { matiere: m, notes: notesMatiere, moyenne: moy };
      });
      const avecNotes = lignes.filter((l) => l.moyenne !== null);
      const totalPoints = avecNotes.reduce((acc, l) => acc + (l.moyenne ?? 0) * l.matiere.coefficient, 0);
      const totalCoefs = avecNotes.reduce((acc, l) => acc + l.matiere.coefficient, 0);
      const generale = totalCoefs > 0 ? totalPoints / totalCoefs : null;
      return { lignes, moyenneGenerale: generale };
    }, [matieresDeMaClasse, mesNotes]);

    const mesReclamations = reclamations.filter((r) => r.id_etudiant === session.profile.id);
    const noteReclamee = new Set(mesReclamations.map((r) => r.id_note));

    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
        >
          <div>
            <h1 className="font-display text-[26px] font-bold tracking-tight text-ink-900 sm:text-[32px]">
              Mes notes
            </h1>
            <p className="mt-1.5 text-sm text-ink-400">
              {maClasse
                ? `Classe ${maClasse.nom_classe} · ${matieresDeMaClasse.length} matière(s)`
                : "Votre classe n'est pas encore définie."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="h-4 w-4" />}
              onClick={() =>
                telechargerBulletinPdf({
                  etablissement: monEtablissement?.nom ?? "",
                  classe: maClasse?.nom_classe ?? "",
                  etudiant:
                    `${session.profile.prenom ?? ""} ${session.profile.nom}`.trim() ||
                    session.profile.matricule,
                  matricule: session.profile.matricule,
                  lignes: bulletin.lignes.map((l) => ({
                    matiere: l.matiere.nom_matiere,
                    coefficient: l.matiere.coefficient,
                    notes: l.notes.map((n) => n.note),
                    moyenne: l.moyenne,
                    remarques: l.notes.map((n) => n.remarque ?? null),
                  })),
                  moyenneGenerale: bulletin.moyenneGenerale,
                })
              }
              disabled={mesNotes.length === 0}
            >
              Exporter en PDF
            </Button>
            <Button icon={<FileText className="h-4 w-4" />} onClick={() => setDemandeOpen(true)}>
              Demander un relevé
            </Button>
          </div>
        </motion.div>

        {moyenne !== null && (
          <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-ink-700 font-display text-xl font-bold text-white">
              {bulletin.moyenneGenerale !== null
                ? bulletin.moyenneGenerale.toFixed(2)
                : moyenne.toFixed(2)}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900">
                Moyenne générale (pondérée par coefficients)
              </p>
              <p className="text-[13px] text-ink-400">
                {mesNotes.length} note(s) enregistrée(s) sur {matieresDeMaClasse.length} matière(s)
              </p>
            </div>
          </Card>
        )}

        {/* Notes regroupées par matière */}
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
                const enReclamation = noteReclamee.has(n.id_note);
                return (
                  <div key={n.id_note} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:flex-nowrap sm:gap-4 sm:px-5">
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ring-1",
                        n.note >= 10
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          : "bg-red-50 text-red-700 ring-red-100",
                      )}
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
                      {n.remarque && (
                        <p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[12px] italic text-amber-800">
                          « {n.remarque} »
                        </p>
                      )}
                    </div>
                    {enReclamation ? (
                      <Badge variant="warning" icon={<MessageSquareWarning />}>
                        Réclamation en cours
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<MessageSquareWarning className="h-4 w-4" />}
                        onClick={() => {
                          setNoteReclamer(n);
                          setMotifReclamation("");
                          setReclamationOpen(true);
                        }}
                      >
                        <span className="hidden sm:inline">Réclamer</span>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Mes réclamations */}
        {mesReclamations.length > 0 && (
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-ink-900">
              <MessageSquareWarning className="h-4.5 w-4.5 text-brand-500" />
              Mes réclamations
            </h2>
            <ul className="divide-y divide-ink-900/5">
              {mesReclamations.map((r) => (
                <li key={r.id_reclamation} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1 text-sm text-ink-700">
                    {r.motif}
                    <span className="ml-2 text-xs text-ink-300">
                      note #{r.id_note} · {formatDateTime(r.date_reclamation)}
                    </span>
                  </span>
                  <Badge variant={STATUT_VARIANT[r.statut]}>{r.statut.replace("_", " ")}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

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

        {/* Modale réclamation */}
        <Modal
          open={reclamationOpen}
          onClose={() => setReclamationOpen(false)}
          title="Réclamer cette note"
          subtitle="Votre professeur vérifiera la copie et corrigera si nécessaire."
          icon={<MessageSquareWarning />}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!noteReclamer) return;
              void (async () => {
                try {
                  await createReclamation({
                    id_note: noteReclamer.id_note,
                    motif: motifReclamation.trim(),
                  });
                  toast.success("Réclamation envoyée", "Votre professeur va l'examiner.");
                  setReclamationOpen(false);
                  setNoteReclamer(null);
                  setMotifReclamation("");
                } catch (err) {
                  toast.error(
                    "Échec de l'envoi",
                    err instanceof Error ? err.message : "Une erreur est survenue.",
                  );
                }
              })();
            }}
            className="space-y-4"
          >
            <Input
              label="Motif de la réclamation"
              placeholder="Ex. : erreur de saisie probable, copie mal corrigée…"
              value={motifReclamation}
              onChange={(e) => setMotifReclamation(e.target.value)}
              required
            />
            <div className="flex justify-end gap-3 border-t border-ink-900/6 pt-4">
              <Button type="button" variant="secondary" onClick={() => setReclamationOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Envoyer la réclamation</Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  /* =============================== PROFESSEUR =============================== */
  const etudiantsDeMesClasses = etudiants.filter((e) =>
    mesAffectations.some((a) => a.id_classe === e.id_classe),
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-ink-900 sm:text-[32px]">
            Saisie des notes
          </h1>
          <p className="mt-1.5 text-sm text-ink-400">
            {mesClasses.length === 0
              ? "Vous n'êtes affecté à aucune classe pour le moment."
              : `${mesClasses.length} classe(s) · ${etudiantsDeMesClasses.length} étudiant(s) au total`}
          </p>
        </div>
        {reclamationsEnAttente.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            icon={<MessageSquareWarning className="h-4 w-4" />}
            onClick={() =>
              document
                .getElementById("section-reclamations")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            {reclamationsEnAttente.length} réclamation(s) à traiter
          </Button>
        )}
      </motion.div>

      {/* Réclamations à traiter */}
      <div id="section-reclamations">
        {reclamationsEnAttente.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-amber-900">
              <MessageSquareWarning className="h-4.5 w-4.5" />
              Réclamations d'étudiants ({reclamationsEnAttente.length})
            </h2>
            <ul className="space-y-3">
              {reclamationsEnAttente.map((r) => {
                const noteConcernee = notes.find((n) => n.id_note === r.id_note);
                const etu = noteConcernee
                  ? etudiantById.get(noteConcernee.id_etudiant)
                  : undefined;
                const mat = noteConcernee
                  ? matiereById.get(noteConcernee.id_matiere)
                  : undefined;
                return (
                  <li
                    key={r.id_reclamation}
                    className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-white p-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-900">
                        {etu ? `${etu.prenom ?? ""} ${etu.nom}`.trim() : `Étudiant #${r.id_etudiant}`}
                        {noteConcernee && (
                          <span className="ml-2 font-normal text-ink-500">
                            note actuelle : <strong>{noteConcernee.note.toFixed(0)}/20</strong> en{" "}
                            {mat?.nom_matiere}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[13px] italic text-ink-500">« {r.motif} »</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setTraitement({ id_reclamation: r.id_reclamation, id_note: r.id_note });
                        setNouvelleNote(noteConcernee ? String(noteConcernee.note) : "");
                        setRemarqueTraitement("");
                      }}
                    >
                      Traiter
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      {/* Mes classes, dépliables une par une */}
      {mesClasses.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen />}
            title="Aucune classe affectée"
            description="Contactez l'administration pour être affecté à une classe et une matière."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {mesClasses.map((classe) => {
            const ouverte = classeOuverte === classe.id_classe;
            const eleves = etudiantsDeClasse(classe.id_classe);
            const notesClasse = notesVisibles.filter((n) =>
              eleves.some((e) => e.id_etudiant === n.id_etudiant),
            );
            return (
              <Card key={classe.id_classe} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setClasseOuverte(ouverte ? null : classe.id_classe)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-brand-50/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 [&>svg]:h-5 [&>svg]:w-5">
                    <Users />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-base font-semibold tracking-tight text-ink-900">
                      {classe.nom}
                    </span>
                    <span className="block truncate text-[13px] text-ink-400">
                      {classe.matieres.join(", ")} · {eleves.length} étudiant(s) ·{" "}
                      {notesClasse.length} note(s) saisie(s)
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-ink-300 transition-transform duration-300",
                      ouverte && "rotate-180",
                    )}
                  />
                </button>

                {ouverte && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-ink-900/6"
                  >
                    <div className="flex items-center justify-between gap-3 px-5 py-3">
                      <p className="text-[13px] font-semibold text-ink-500">
                        Élèves de {classe.nom}
                      </p>
                      <Button
                        size="sm"
                        icon={<Plus className="h-4 w-4" />}
                        onClick={() => {
                          setNoteClasseId(classe.id_classe);
                          setNoteOpen(true);
                        }}
                      >
                        Saisir une note
                      </Button>
                    </div>
                    {eleves.length === 0 ? (
                      <p className="px-5 pb-5 text-sm text-ink-300">
                        Aucun étudiant inscrit dans cette classe.
                      </p>
                    ) : (
                      <div className="divide-y divide-ink-900/5 border-t border-ink-900/6">
                        {eleves.map((e) => {
                          const sesNotes = notesClasse.filter(
                            (n) => n.id_etudiant === e.id_etudiant,
                          );
                          return (
                            <div key={e.id_etudiant} className="flex flex-wrap items-center gap-3 px-5 py-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-ink-900">
                                  {`${e.prenom ?? ""} ${e.nom}`.trim()}
                                </p>
                                <p className="text-xs text-ink-400">{e.matricule}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {sesNotes.length === 0 ? (
                                  <span className="text-xs text-ink-300">Aucune note</span>
                                ) : (
                                  sesNotes.map((n) => (
                                    <span
                                      key={n.id_note}
                                      title={`${matiereById.get(n.id_matiere)?.nom_matiere ?? ""} — ${n.type_evaluation} (${n.semestre})${n.remarque ? ` — « ${n.remarque} »` : ""}`}
                                      className={cn(
                                        "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ring-1",
                                        n.note >= 10
                                          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                          : "bg-red-50 text-red-700 ring-red-100",
                                      )}
                                    >
                                      {n.note.toFixed(0)}
                                      <button
                                        onClick={() => setDeletingNote(n)}
                                        className="ml-0.5 text-ink-400 hover:text-red-600"
                                        aria-label="Supprimer la note"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Formulaire de saisie d'une note — pré-filtré sur la classe ouverte */}
      <EntityFormModal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Saisir une note"
        subtitle="Vous ne pouvez noter que les étudiants de vos classes, sur vos matières."
        fields={[
          {
            name: "id_etudiant",
            label: "Étudiant",
            required: true,
            options: (noteClasseId ? etudiantsDeClasse(noteClasseId) : etudiantsDeMesClasses).map(
              (e) => ({
                value: String(e.id_etudiant),
                label: `${e.prenom ?? ""} ${e.nom}`.trim(),
              }),
            ),
          },
          {
            name: "id_matiere",
            label: "Matière",
            required: true,
            options: (noteClasseId
              ? mesAffectations.filter((a) => a.id_classe === noteClasseId)
              : mesAffectations
            )
              .map((a) => matiereById.get(a.id_matiere))
              .filter((m): m is NonNullable<typeof m> => Boolean(m))
              .map((m) => ({
                value: String(m.id_matiere),
                label: `${m.nom_matiere} (coef ${m.coefficient})`,
              })),
          },
          { name: "note", label: "Note sur 20", type: "number", required: true, step: "0.25", placeholder: "15.5" },
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
          { name: "remarque", label: "Remarque (facultatif)", placeholder: "Bon travail, doit approfondir…" },
        ]}
        onSubmit={async (v) => {
          await createNote({
            id_etudiant: Number(v.id_etudiant),
            id_matiere: Number(v.id_matiere),
            note: Number(v.note),
            type_evaluation: v.type_evaluation ? String(v.type_evaluation) : undefined,
            semestre: v.semestre ? String(v.semestre) : undefined,
            remarque: v.remarque ? String(v.remarque) : undefined,
          });
          toast.success("Note enregistrée", "L'étudiant peut la consulter immédiatement.");
        }}
      />

      {/* Modale de traitement d'une réclamation */}
      <Modal
        open={Boolean(traitement)}
        onClose={() => setTraitement(null)}
        title="Traiter la réclamation"
        subtitle="Acceptez et corrigez la note, ou refusez la demande."
        icon={<MessageSquareWarning />}
      >
        <div className="space-y-4">
          <Input
            label="Nouvelle note sur 20 (si acceptée)"
            type="number"
            step="0.25"
            min={0}
            value={nouvelleNote}
            onChange={(e) => setNouvelleNote(e.target.value)}
          />
          <Input
            label="Remarque ajoutée à la note (facultatif)"
            placeholder="Corrigée après vérification de la copie"
            value={remarqueTraitement}
            onChange={(e) => setRemarqueTraitement(e.target.value)}
          />
          <div className="flex flex-wrap justify-end gap-3 border-t border-ink-900/6 pt-4">
            <Button type="button" variant="secondary" onClick={() => setTraitement(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              loading={traitementBusy}
              onClick={() => void handleTraitement("refusee")}
            >
              Refuser
            </Button>
            <Button loading={traitementBusy} onClick={() => void handleTraitement("acceptee")}>
              Accepter et corriger
            </Button>
          </div>
        </div>
      </Modal>

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
