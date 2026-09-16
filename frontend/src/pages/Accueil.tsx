import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  ClipboardList,
  Clock3,
  GraduationCap,
  Plus,
  RefreshCw,
  School,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { Avatar, Badge, Button, Card, SkeletonRows } from "@/components/ui";
import { EntityFormModal } from "@/components/EntityFormModal";
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
  const {
    etudiants,
    professeurs,
    classes,
    matieres,
    etablissements,
    directeurs,
    affectations,
    demandesReleve,
    notes,
    loading,
    reload,
    createEtablissement,
  } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const isEtudiant = session?.type === "etudiant";
  const isDirecteur = session?.type === "directeur";
  const ready = !loading;

  /** Le directeur ne voit que les données de son établissement. */
  const mesEtablissementIds = useMemo(
    () =>
      isDirecteur && session?.profile.id_etablissement
        ? new Set([session.profile.id_etablissement])
        : null,
    [isDirecteur, session],
  );
  const mesClasses = useMemo(
    () =>
      mesEtablissementIds
        ? classes.filter((c) => mesEtablissementIds.has(c.id_etablissement))
        : classes,
    [classes, mesEtablissementIds],
  );
  const mesClassesIds = useMemo(
    () => new Set(mesClasses.map((c) => c.id_classe)),
    [mesClasses],
  );
  const mesEtudiants = useMemo(
    () =>
      mesEtablissementIds
        ? etudiants.filter((e) => mesClassesIds.has(e.id_classe))
        : etudiants,
    [etudiants, mesClassesIds, mesEtablissementIds],
  );
  const mesProfesseurs = professeurs;

  const demandesEnAttente = useMemo(
    () => demandesReleve.filter((d) => d.statut === "en_attente").length,
    [demandesReleve],
  );

  const matieresParClasse = useMemo(() => {
    const counts = [...mesClasses]
      .map((c) => ({
        nom: c.nom_classe,
        count: matieres.filter((m) => m.id_classe === c.id_classe).length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    return counts;
  }, [mesClasses, matieres]);

  const recentActivite = useMemo(() => {
    return [
      ...etudiants.map((e) => ({
        key: `e-${e.id_etudiant}`,
        label: `${e.prenom ?? ""} ${e.nom}`.trim(),
        sub: e.matricule,
        date: e.date_creation,
        kind: "Étudiant",
      })),
      ...professeurs.map((p) => ({
        key: `p-${p.id_professeur}`,
        label: `${p.prenom ?? ""} ${p.nom}`.trim(),
        sub: p.matricule,
        date: p.date_creation,
        kind: "Professeur",
      })),
    ]
      .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
      .slice(0, 6);
  }, [etudiants, professeurs]);

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

  /* ------------------------- Vue étudiant simplifiée ------------------------ */
  if (isEtudiant) {
    const mesNotes = notes.filter((n) => n.id_etudiant === session?.profile.id);
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
        >
          <p className="text-[13px] font-medium capitalize text-ink-400">{today}</p>
          <h1 className="mt-1 font-display text-[28px] font-bold tracking-tight text-ink-900 sm:text-[32px]">
            {greeting()}, <span className="text-brand-600">{displayName}</span>
          </h1>
          <p className="mt-1.5 text-sm text-ink-400">
            Consultez vos notes et demandez vos relevés depuis l'espace « Mes notes ».
          </p>
        </motion.div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            icon={<BookOpen />}
            label="Notes enregistrées"
            value={mesNotes.length}
            source="Mes notes"
            active={ready}
            delay={0.05}
          />
          <StatCard
            icon={<ClipboardList />}
            label="Moyenne (sur 20)"
            value={moyenne !== null ? Math.round(moyenne) : 0}
            source={moyenne !== null ? moyenne.toFixed(2) : "—"}
            active={ready}
            delay={0.12}
          />
        </div>
      </div>
    );
  }

  /* ------------------------------ Vue professeur ----------------------------- */
  if (session?.type === "professeur") {
    const mesCours = affectations.filter((a) => a.id_professeur === session.profile.id);
    const mesNotes = notes.filter((n) => n.id_professeur === session.profile.id);
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-[13px] font-medium capitalize text-ink-400">{today}</p>
          <h1 className="mt-1 font-display text-[28px] font-bold tracking-tight text-ink-900 sm:text-[32px]">
            {greeting()}, <span className="text-brand-600">{displayName}</span>
          </h1>
          <p className="mt-1.5 text-sm text-ink-400">
            Retrouvez vos cours et saisissez les notes de vos étudiants.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            icon={<GraduationCap />}
            label="Cours occupés"
            value={mesCours.length}
            source="Mes affectations"
            active={ready}
            delay={0.05}
          />
          <StatCard
            icon={<ClipboardList />}
            label="Notes saisies"
            value={mesNotes.length}
            source="Mes évaluations"
            active={ready}
            delay={0.12}
          />
        </div>
      </div>
    );
  }

  /* ------------------------------- Vue directeur ------------------------------ */
  if (isDirecteur) {
    return (
      <div className="relative space-y-7">
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
              Votre établissement :{" "}
              {etablissements.find((e) => e.id_etablissement === session?.profile.id_etablissement)
                ?.nom ?? ""}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleSync()}
            icon={<RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />}
          >
            Synchroniser
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<BookOpen />}
            label="Classes"
            value={mesClasses.length}
            source="Mon établissement"
            active={ready}
            delay={0.05}
          />
          <StatCard
            icon={<Users />}
            label="Étudiants"
            value={mesEtudiants.length}
            source="Mon établissement"
            active={ready}
            delay={0.12}
          />
          <StatCard
            icon={<GraduationCap />}
            label="Professeurs"
            value={mesProfesseurs.length}
            source="Mon établissement"
            active={ready}
            delay={0.19}
          />
          <StatCard
            icon={<ClipboardList />}
            label="Demandes en attente"
            value={demandesEnAttente}
            source="À traiter"
            active={ready}
            delay={0.26}
          />
        </div>
      </div>
    );
  }

  /* ------------------------------ Vue super admin ---------------------------- */
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
            Vue d'ensemble de votre établissement : classes, matières, professeurs et étudiants.
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
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
            Nouvel établissement
          </Button>
        </div>
      </motion.div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={<School />}
          label="Établissements"
          value={etablissements.length}
          source="GET /etablissements/"
          active={ready}
          delay={0.05}
        />
        <StatCard
          icon={<BriefcaseBusiness />}
          label="Directeurs"
          value={directeurs.length}
          source="GET /directeurs/"
          active={ready}
          delay={0.08}
        />
        <StatCard
          icon={<BookOpen />}
          label="Classes"
          value={classes.length}
          source="GET /classes/"
          active={ready}
          delay={0.12}
        />
        <StatCard
          icon={<GraduationCap />}
          label="Professeurs"
          value={professeurs.length}
          source="GET /professeurs/"
          active={ready}
          delay={0.19}
        />
        <StatCard
          icon={<Users />}
          label="Étudiants"
          value={etudiants.length}
          source="GET /etudiants/"
          active={ready}
          delay={0.26}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        {/* Matières par classe */}
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
                  Matières par classe
                </h2>
                <p className="mt-0.5 text-[13px] text-ink-400">
                  Chaque classe possède ses propres matières et coefficients.
                </p>
              </div>
            </div>
            {loading ? (
              <SkeletonRows rows={4} cols={2} />
            ) : matieresParClasse.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-400">
                Créez une classe pour commencer.
              </p>
            ) : (
              <div className="space-y-4">
                {matieresParClasse.map(({ nom, count }, i) => {
                  const max = matieresParClasse[0]?.count ?? 1;
                  return (
                    <div key={nom}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <Badge variant="brand">{nom}</Badge>
                        <span className="text-[13px] font-semibold tabular-nums text-ink-700">
                          {count} matière{count > 1 ? "s" : ""}
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

        {/* Activité récente + alertes */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.5 }}
          className="space-y-5 xl:col-span-2"
        >
          {demandesEnAttente > 0 && (
            <Card className="border-amber-200 bg-amber-50/60 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                <ClipboardList className="h-4 w-4" />
                {demandesEnAttente} demande(s) de relevé en attente
              </p>
              <p className="mt-1 text-[13px] text-amber-700">
                Traitez-les depuis l'onglet « Demandes de relevé ».
              </p>
            </Card>
          )}
          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-900">
              <Clock3 className="h-4.5 w-4.5 text-brand-500" />
              Dernières inscriptions
            </h2>
            <div className="mt-5 space-y-1.5">
              {loading ? (
                <SkeletonRows rows={4} cols={2} />
              ) : recentActivite.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-400">Aucune inscription récente.</p>
              ) : (
                recentActivite.map((row, i) => (
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
                      <Badge variant="neutral">{row.kind}</Badge>
                      <p className="mt-1 text-[11px] text-ink-300">{formatRelative(row.date)}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      <EntityFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouvel établissement"
        fields={[
          { name: "nom", label: "Nom de l'établissement", required: true, placeholder: "Lycée Démo" },
          { name: "adresse", label: "Adresse", placeholder: "Avenue Centrale" },
        ]}
        onSubmit={async (v) => {
          await createEtablissement({
            nom: String(v.nom),
            adresse: v.adresse ? String(v.adresse) : undefined,
          });
        }}
      />
    </div>
  );
}
