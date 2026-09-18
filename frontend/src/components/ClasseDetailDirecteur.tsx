import { useMemo } from "react";
import { motion } from "framer-motion";
import { Download, GraduationCap, Trophy, Users, X } from "lucide-react";
import { Badge, Button, Card, SkeletonRows } from "@/components/ui";
import type {
  Affectation,
  Etudiant,
  Matiere,
  Professeur,
  ResultatsClasse,
} from "@/lib/types";
import { cn } from "@/utils/cn";

interface Props {
  idClasse: number;
  resultats: ResultatsClasse | null;
  busy: boolean;
  matieres: Matiere[];
  etudiants: Etudiant[];
  affectations: Affectation[];
  professeurs: Professeur[];
  onClose: () => void;
  onExportPdf: () => void;
  exportBusy: boolean;
}

export function ResultatsClasseDetail({
  idClasse,
  resultats,
  busy,
  matieres,
  etudiants,
  affectations,
  professeurs,
  onClose,
  onExportPdf,
  exportBusy,
}: Props) {
  const classe = useMemo(
    () => resultats?.classe ?? null,
    [resultats],
  );

  const eleves = useMemo(
    () => etudiants.filter((e) => e.id_classe === idClasse),
    [etudiants, idClasse],
  );

  const profsDeLaClasse = useMemo(() => {
    const ids = new Set(
      affectations.filter((a) => a.id_classe === idClasse).map((a) => a.id_professeur),
    );
    return professeurs.filter((p) => ids.has(p.id_professeur));
  }, [affectations, professeurs, idClasse]);

  const mesMatieres = matieres.filter((m) => m.id_classe === idClasse);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden">
        {/* En-tête du détail */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-900/6 bg-ink-50/50 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-ink-900">
              {classe?.nom_classe ?? `Classe #${idClasse}`}
            </h2>
            <p className="text-[13px] text-ink-400">
              {resultats?.etablissement?.nom ?? ""} · {eleves.length} étudiant(s) ·{" "}
              {profsDeLaClasse.length} professeur(s)
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="secondary"
              icon={<Download className="h-4 w-4" />}
              onClick={onExportPdf}
              loading={exportBusy}
              disabled={!resultats}
            >
              Exporter les résultats en PDF
            </Button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label="Fermer le détail"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {busy ? (
          <SkeletonRows rows={5} cols={4} />
        ) : (
          <div className="space-y-6 p-5">
            {/* Liste des étudiants */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-ink-500">
                <Users className="h-4 w-4 text-brand-500" />
                Étudiants ({eleves.length})
              </h3>
              {eleves.length === 0 ? (
                <p className="text-sm text-ink-300">Aucun étudiant inscrit.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {eleves.map((e) => (
                    <Badge key={e.id_etudiant} variant="neutral">
                      {`${e.prenom ?? ""} ${e.nom}`.trim()}
                    </Badge>
                  ))}
                </div>
              )}
            </section>

            {/* Professeurs de la classe */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-ink-500">
                <GraduationCap className="h-4 w-4 text-brand-500" />
                Professeurs ({profsDeLaClasse.length})
              </h3>
              {profsDeLaClasse.length === 0 ? (
                <p className="text-sm text-ink-300">Aucun professeur affecté à cette classe.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profsDeLaClasse.map((p) => (
                    <Badge key={p.id_professeur} variant="brand">
                      {`${p.prenom ?? ""} ${p.nom}`.trim()}
                      <span className="font-normal opacity-70">
                        {" "}
                        ·{" "}
                        {affectations
                          .filter((a) => a.id_classe === idClasse && a.id_professeur === p.id_professeur)
                          .map((a) => matieres.find((m) => m.id_matiere === a.id_matiere)?.nom_matiere)
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </Badge>
                  ))}
                </div>
              )}
            </section>

            {/* Classement par matière */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-ink-500">
                <Trophy className="h-4 w-4 text-brand-500" />
                Résultats par matière
              </h3>
              {!resultats ? (
                <p className="text-sm text-ink-300">Résultats indisponibles.</p>
              ) : resultats.matieres.length === 0 ? (
                <p className="text-sm text-ink-300">
                  Aucune matière dans cette classe — {mesMatieres.length} matière(s) référencée(s).
                </p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {resultats.matieres.map((ligne) => (
                    <Card key={ligne.id_matiere} className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-bold text-ink-900">{ligne.matiere}</p>
                        <Badge variant="brand">coef. {ligne.coefficient}</Badge>
                      </div>
                      {ligne.classement.length === 0 ? (
                        <p className="text-xs text-ink-300">Aucune note saisie.</p>
                      ) : (
                        <ol className="space-y-1.5">
                          {ligne.classement.map((e) => (
                            <li
                              key={e.id_etudiant}
                              className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-brand-50/50"
                            >
                              <span
                                className={cn(
                                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-1",
                                  e.rang === 1
                                    ? "bg-amber-100 text-amber-700 ring-amber-200"
                                    : e.rang === 2
                                      ? "bg-ink-100 text-ink-600 ring-ink-200"
                                      : e.rang === 3
                                        ? "bg-orange-50 text-orange-700 ring-orange-200"
                                        : "bg-ink-50 text-ink-400 ring-ink-100",
                                )}
                              >
                                {e.rang}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-ink-800">
                                {e.etudiant}
                              </span>
                              <span className="font-display font-bold tabular-nums text-ink-900">
                                {e.moyenne.toFixed(2)}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Classement général */}
            {resultats && resultats.classement_general.length > 0 && (
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-ink-500">
                  <Trophy className="h-4 w-4 text-brand-500" />
                  Classement général
                </h3>
                <Card className="overflow-hidden">
                  <ol className="divide-y divide-ink-900/5">
                    {resultats.classement_general.map((e) => (
                      <li key={e.id_etudiant} className="flex items-center gap-3 px-4 py-3">
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ring-1",
                            e.rang === 1
                              ? "bg-amber-100 text-amber-700 ring-amber-200"
                              : e.rang === 2
                                ? "bg-ink-100 text-ink-600 ring-ink-200"
                                : e.rang === 3
                                  ? "bg-orange-50 text-orange-700 ring-orange-200"
                                  : "bg-ink-50 text-ink-400 ring-ink-100",
                          )}
                        >
                          {e.rang}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                          {e.etudiant}
                        </span>
                        <span className="font-display text-base font-bold tabular-nums text-brand-700">
                          {e.moyenne_generale !== null ? e.moyenne_generale.toFixed(2) : "—"}
                          <span className="ml-1 text-[11px] font-medium text-ink-300">/ 20</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </Card>
              </section>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
